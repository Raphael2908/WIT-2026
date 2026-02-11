"""Calibration endpoint for user onboarding."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.request_model import CalibrationRequest, CalibrationResponse, LipFrame
from app.models.user_profile import UserProfile
from app.services.claude_service import ClaudeService, ClaudeServiceError
from app.services.whisper_service import WhisperService, WhisperServiceError
from app.storage.file_storage import FileManager, FileManagerError
from app.utils.audio_processing import AudioProcessingError, decode_base64_audio

router = APIRouter()

DEFAULT_CALIBRATION_SENTENCES = [
    "The quick brown fox jumps over the lazy dog",
    "I need help with my medication",
    "Can you please repeat that",
    "What time is the appointment",
    "I would like a glass of water",
]


@router.post("/api/calibrate", response_model=CalibrationResponse)
async def calibrate(request: CalibrationRequest) -> CalibrationResponse:
    """Calibrate user speech patterns.

    Process:
    1. Decode base64 audio
    2. Transcribe with Whisper
    3. Analyze patterns with Claude
    4. Create and save user profile
    5. Return calibration result
    """
    whisper_service = WhisperService()
    claude_service = ClaudeService()
    file_manager = FileManager()

    # Use provided sentences or defaults
    expected_sentences = request.expected_sentences or DEFAULT_CALIBRATION_SENTENCES

    # Decode audio
    try:
        audio_bytes = decode_base64_audio(request.audio_file)
    except AudioProcessingError as e:
        raise HTTPException(status_code=400, detail=f"Audio decoding failed: {e}")

    # Transcribe audio
    try:
        transcription_result = await whisper_service.transcribe_base64_audio(
            base64_audio=request.audio_file,
            prompt=" ".join(expected_sentences),
        )
        actual_transcription = transcription_result.text
    except WhisperServiceError as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # For calibration, we treat the whole transcription as corresponding to all sentences
    # In a real scenario, you might split audio per sentence or use alignment
    actual_transcriptions = [actual_transcription]

    # Analyze patterns with Claude
    try:
        calibration_result = await claude_service.analyze_calibration(
            expected_sentences=expected_sentences,
            actual_transcriptions=actual_transcriptions,
        )
    except ClaudeServiceError as e:
        raise HTTPException(status_code=500, detail=f"Pattern analysis failed: {e}")

    # Create user profile with category-specific weights
    profile = UserProfile(
        user_id=request.user_id,
        category=calibration_result.category,
        confidence=calibration_result.confidence,
        phoneme_patterns=calibration_result.phoneme_patterns,
        common_substitutions=calibration_result.common_substitutions,
        modality_weights=UserProfile.get_default_weights(calibration_result.category),
    )

    # Save profile and calibration audio
    try:
        await file_manager.save_profile(profile)
        await file_manager.save_calibration_audio(request.user_id, audio_bytes)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {e}")

    return CalibrationResponse(
        status="success",
        category=calibration_result.category.value,
        confidence=calibration_result.confidence,
        phoneme_patterns=calibration_result.phoneme_patterns,
        message="Calibration complete",
    )


# === Phrase bank for multi-step calibration ===

CALIBRATION_PHRASE_BANK = [
    {"phrase_id": "p01", "text": "The quick brown fox jumps over the lazy dog", "difficulty": 1, "phoneme_targets": ["/k/", "/b/", "/f/", "/d/"]},
    {"phrase_id": "p02", "text": "I need help with my medication", "difficulty": 1, "phoneme_targets": ["/n/", "/h/", "/m/"]},
    {"phrase_id": "p03", "text": "Can you please repeat that", "difficulty": 1, "phoneme_targets": ["/k/", "/p/", "/r/", "/t/"]},
    {"phrase_id": "p04", "text": "What time is the appointment", "difficulty": 1, "phoneme_targets": ["/w/", "/t/", "/m/"]},
    {"phrase_id": "p05", "text": "I would like a glass of water", "difficulty": 1, "phoneme_targets": ["/w/", "/l/", "/g/"]},
    {"phrase_id": "p06", "text": "Please call my family", "difficulty": 2, "phoneme_targets": ["/p/", "/k/", "/f/"]},
    {"phrase_id": "p07", "text": "I am feeling much better today", "difficulty": 2, "phoneme_targets": ["/f/", "/b/", "/t/", "/d/"]},
    {"phrase_id": "p08", "text": "Could you help me stand up", "difficulty": 2, "phoneme_targets": ["/k/", "/h/", "/s/"]},
    {"phrase_id": "p09", "text": "The weather is nice outside", "difficulty": 2, "phoneme_targets": ["/w/", "/n/", "/s/"]},
    {"phrase_id": "p10", "text": "I want to go for a walk", "difficulty": 2, "phoneme_targets": ["/w/", "/g/", "/f/"]},
    {"phrase_id": "p11", "text": "She sells seashells by the seashore", "difficulty": 3, "phoneme_targets": ["/sh/", "/s/", "/b/"]},
    {"phrase_id": "p12", "text": "Peter Piper picked a peck of pickled peppers", "difficulty": 3, "phoneme_targets": ["/p/", "/k/"]},
    {"phrase_id": "p13", "text": "The sixth sick sheik's sixth sheep's sick", "difficulty": 3, "phoneme_targets": ["/s/", "/sh/", "/k/"]},
    {"phrase_id": "p14", "text": "How much wood would a woodchuck chuck", "difficulty": 3, "phoneme_targets": ["/w/", "/ch/", "/h/"]},
    {"phrase_id": "p15", "text": "Red lorry yellow lorry red lorry yellow lorry", "difficulty": 3, "phoneme_targets": ["/r/", "/l/", "/y/"]},
]

_phrase_lookup = {p["phrase_id"]: p for p in CALIBRATION_PHRASE_BANK}


@router.get("/calibration/phrases")
async def get_calibration_phrases(count: int = 15) -> dict:
    """Return calibration phrases for the frontend."""
    from app.models.request_model import CalibrationPhraseModel

    phrases = CALIBRATION_PHRASE_BANK[:count]
    return {
        "phrases": [CalibrationPhraseModel(**p) for p in phrases]
    }


@router.post("/calibration/{user_id}/submit-with-lips")
async def submit_calibration_with_lips(
    user_id: str,
    audio: UploadFile = File(...),
    video: UploadFile = File(default=None),
    phrase_id: str = Form(...),
):
    """Submit a single calibration phrase with audio and optional video."""
    from pathlib import Path
    from tempfile import NamedTemporaryFile

    from app.models.request_model import CalibrationResultModel
    from app.services.lip_matching_service import frames_to_shape_sequence

    file_manager = FileManager()

    # Look up phrase
    phrase = _phrase_lookup.get(phrase_id)
    if not phrase:
        raise HTTPException(status_code=400, detail=f"Unknown phrase_id: {phrase_id}")

    expected_text = phrase["text"]

    # Read and save audio to temp file
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    whisper_service = WhisperService()

    # Save audio to temp, transcribe
    import base64
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    try:
        transcription = await whisper_service.transcribe_base64_audio(
            base64_audio=audio_b64,
            prompt=expected_text,
            expected_text=expected_text,
        )
    except WhisperServiceError as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # Determine match
    from app.utils.text_processing import calculate_similarity
    similarity = calculate_similarity(transcription.text, expected_text)
    is_match = similarity > 0.7

    # Process video for lip shape sequence if provided
    shape_sequence = None
    if video:
        try:
            video_bytes = await video.read()
            if video_bytes:
                tmp_path = None
                try:
                    with NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                        tmp.write(video_bytes)
                        tmp_path = Path(tmp.name)

                    from app.services.lip_analyzer import LipAnalyzer
                    from app.services.video_streamer import VideoFrameStreamer

                    analyzer = LipAnalyzer()
                    streamer = VideoFrameStreamer(every_n=2)
                    lip_frames = []

                    for ts_ms, jpeg_bytes in streamer.iter_frames(str(tmp_path)):
                        try:
                            result = analyzer.analyze_image_bytes(jpeg_bytes, timestamp_ms=ts_ms)
                            lip_frames.append(LipFrame(
                                timestamp_ms=ts_ms,
                                openness=result.get("openness", 0.0),
                                width=result.get("width", 0.0),
                                rounding=result.get("rounding", 0.0),
                            ))
                        except ValueError:
                            pass

                    if lip_frames:
                        shape_sequence = frames_to_shape_sequence(lip_frames)
                        # Save lip signature for future matching
                        if shape_sequence:
                            await file_manager.save_lip_signature(user_id, {
                                "phrase_text": expected_text,
                                "shape_sequence": shape_sequence,
                            })
                finally:
                    if tmp_path and tmp_path.exists():
                        tmp_path.unlink(missing_ok=True)
        except Exception:
            pass  # Video processing is best-effort

    # Determine if error mapping was created
    error_mapping_created = False
    if not is_match and transcription.text.strip():
        error_mapping_created = True

    # Save result to calibration session
    result_data = {
        "phrase_id": phrase_id,
        "phrase_text": expected_text,
        "whisper_output": transcription.text,
        "confidence": transcription.confidence,
        "match": is_match,
        "error_mapping_created": error_mapping_created,
        "shape_sequence": shape_sequence,
    }
    await file_manager.save_calibration_result(user_id, result_data)

    return CalibrationResultModel(**result_data)


@router.post("/calibration/{user_id}/complete")
async def complete_calibration(user_id: str):
    """Finalize calibration session and update user profile."""
    from app.models.request_model import CalibrationSummaryModel

    file_manager = FileManager()
    claude_service = ClaudeService()

    # Load profile
    try:
        profile = await file_manager.load_profile(user_id)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if profile is None:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    # Load session results
    results = await file_manager.load_calibration_session(user_id)
    if not results:
        raise HTTPException(status_code=400, detail="No calibration results found for this session")

    total = len(results)
    accurate = sum(1 for r in results if r.get("match"))
    accuracy_pct = (accurate / total * 100) if total > 0 else 0
    confidences = [r.get("confidence", 0.0) for r in results]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    # Analyze patterns with Claude
    expected_sentences = [r["phrase_text"] for r in results]
    actual_transcriptions = [r["whisper_output"] for r in results]

    try:
        calibration_analysis = await claude_service.analyze_calibration(
            expected_sentences=expected_sentences,
            actual_transcriptions=actual_transcriptions,
        )

        # Update profile with analysis
        profile.category = calibration_analysis.category
        profile.confidence = calibration_analysis.confidence
        profile.phoneme_patterns.update(calibration_analysis.phoneme_patterns)
        profile.common_substitutions.update(calibration_analysis.common_substitutions)
        profile.modality_weights = UserProfile.get_default_weights(calibration_analysis.category)
    except ClaudeServiceError:
        pass  # Use defaults if analysis fails

    # Update profile stats
    profile.calibration_count += 1
    profile.avg_whisper_confidence = avg_conf
    from datetime import datetime
    profile.updated_at = datetime.utcnow()

    await file_manager.save_profile(profile)
    await file_manager.delete_calibration_session(user_id)

    recommended = ["audio"]
    if any(r.get("shape_sequence") for r in results):
        recommended.append("lip")

    return CalibrationSummaryModel(
        calibration_count=profile.calibration_count,
        total_phrases=total,
        accurate_phrases=accurate,
        accuracy_pct=round(accuracy_pct, 1),
        recommended_modalities=recommended,
        avg_confidence=round(avg_conf, 3),
    )
