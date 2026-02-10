"""Calibration endpoint for user onboarding."""

from fastapi import APIRouter, HTTPException

from app.models.request_model import CalibrationRequest, CalibrationResponse
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
        weights=UserProfile.get_default_weights(calibration_result.category),
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
