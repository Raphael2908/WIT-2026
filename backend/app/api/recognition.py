"""Decode endpoint for real-time speech decoding."""

import time
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.request_model import DecodeRequest, DecodeResult, LipFrame, LipMatch, LipSignature
from app.services.claude_service import ClaudeService, ClaudeServiceError
from app.services.fusion_service import FusionService
from app.services.lip_matching_service import frames_to_shape_sequence, find_top_lip_matches
from app.services.whisper_service import (
    MANDARIN_CODES,
    NON_ENGLISH_CODES,
    WhisperService,
    WhisperServiceError,
)
from app.storage.file_storage import FileManager, FileManagerError

router = APIRouter()


@router.post("/decode/{user_id}", response_model=DecodeResult)
async def decode(user_id: str, request: DecodeRequest) -> DecodeResult:
    """Decode speech from audio input with optional lip reading.

    Process:
    1. Load user profile
    2. Transcribe audio with Whisper
    3. Process lip frames if provided
    4. Fuse audio + lip reading
    5. Correct with Claude using user patterns
    6. Save to decode history
    7. Return DecodeResult
    """
    start = time.time()

    file_manager = FileManager()
    whisper_service = WhisperService()
    fusion_service = FusionService()
    claude_service = ClaudeService()

    # Load user profile
    try:
        profile = await file_manager.load_profile(user_id)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {e}")

    if profile is None:
        # Auto-create a default profile so uncalibrated users can still decode.
        from app.models.user_profile import UserProfile
        profile = UserProfile(user_id=user_id)
        try:
            await file_manager.save_profile(profile)
        except FileManagerError:
            pass  # Non-critical; profile lives in memory for this request

    # Transcribe audio with Whisper (auto-detect language)
    try:
        transcription = await whisper_service.transcribe_base64_audio(
            base64_audio=request.audio_base64,
            auto_detect=True,
        )
    except WhisperServiceError as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # Handle non-English detection: preserve Chinese text for Mandarin, use English translation for pipeline
    detected_language = transcription.language if transcription.language in NON_ENGLISH_CODES else "en"
    chinese_text: Optional[str] = None
    if detected_language in NON_ENGLISH_CODES:
        if detected_language in MANDARIN_CODES:
            # Correct raw Chinese transcription with Claude
            try:
                chinese_text = await claude_service.correct_chinese_text(transcription.text)
            except Exception:
                chinese_text = transcription.text  # Fallback to raw Whisper Chinese
        # All non-English: swap to English translation for the rest of the pipeline
        if transcription.translated_text:
            transcription.text = transcription.translated_text

    # Process lip frames if provided
    lip_reading_text: Optional[str] = None
    lip_matches: list[LipMatch] = []
    lip_reading_used = False

    if request.lip_frames:
        lip_reading_used = True
        try:
            shape_sequence = frames_to_shape_sequence(request.lip_frames)
            if shape_sequence:
                # Load stored lip signatures for this user
                raw_sigs = await file_manager.load_lip_signatures(user_id)
                signatures = [LipSignature(**s) for s in raw_sigs]
                if signatures:
                    lip_matches = find_top_lip_matches(shape_sequence, signatures)
                    # Use top match as lip reading text if similarity is high enough
                    if lip_matches and lip_matches[0].similarity > 0.5:
                        lip_reading_text = lip_matches[0].phrase_text
        except Exception:
            # Lip processing is best-effort; don't fail the whole request
            pass

    # Fuse multimodal inputs
    fusion_result = fusion_service.fuse(
        audio_text=transcription.text,
        audio_confidence=transcription.confidence,
        weights=profile.modality_weights,
        lip_reading_text=lip_reading_text,
    )

    # Correct transcription with Claude
    try:
        recognition_result = await claude_service.correct_transcription(
            transcription=fusion_result.text,
            user_profile=profile,
            lip_reading_text=lip_reading_text,
        )
    except ClaudeServiceError as e:
        raise HTTPException(status_code=500, detail=f"Correction failed: {e}")

    decode_id = str(uuid4())
    processing_time_ms = int((time.time() - start) * 1000)

    # Save to decode history
    from datetime import datetime
    history_entry = {
        "decode_id": decode_id,
        "decoded_text": recognition_result.corrected_text,
        "raw_whisper": transcription.text,
        "whisper_confidence": transcription.confidence,
        "lip_used": lip_reading_used,
        "feedback_status": "pending",
        "corrected_text": None,
        "created_at": datetime.utcnow().isoformat(),
        "detected_language": detected_language,
        "chinese_text": chinese_text,
    }
    try:
        await file_manager.save_decode_history_entry(user_id, history_entry)
    except FileManagerError:
        pass  # Non-critical

    return DecodeResult(
        decode_id=decode_id,
        decoded_text=recognition_result.corrected_text,
        raw_whisper=transcription.text,
        whisper_confidence=transcription.confidence,
        lip_reading_used=lip_reading_used,
        modality_weights={
            "audio": profile.modality_weights.audio,
            "lip": profile.modality_weights.lip,
        },
        lip_matches=lip_matches,
        processing_time_ms=processing_time_ms,
        detected_language=detected_language,
        chinese_text=chinese_text,
    )
