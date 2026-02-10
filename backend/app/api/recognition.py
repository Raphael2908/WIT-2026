"""Recognition endpoint for real-time speech decoding."""

from fastapi import APIRouter, HTTPException

from app.models.request_model import RecognitionRequest, RecognitionResponse
from app.services.claude_service import ClaudeService, ClaudeServiceError
from app.services.fusion_service import FusionService
from app.services.whisper_service import WhisperService, WhisperServiceError
from app.storage.file_storage import FileManager, FileManagerError

router = APIRouter()


@router.post("/api/recognize", response_model=RecognitionResponse)
async def recognize(request: RecognitionRequest) -> RecognitionResponse:
    """Recognize and correct speech from audio input.

    Process:
    1. Load user profile
    2. Transcribe audio with Whisper
    3. Fuse with lip reading and gesture inputs
    4. Correct transcription with Claude using user patterns
    5. Return corrected text
    """
    file_manager = FileManager()
    whisper_service = WhisperService()
    fusion_service = FusionService()
    claude_service = ClaudeService()

    # Load user profile
    try:
        profile = await file_manager.load_profile(request.user_id)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {e}")

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=f"No profile found for user '{request.user_id}'. Please calibrate first.",
        )

    # Transcribe audio with Whisper
    try:
        transcription = await whisper_service.transcribe_base64_audio(
            base64_audio=request.audio_chunk,
        )
    except WhisperServiceError as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # Fuse multimodal inputs
    fusion_result = fusion_service.fuse(
        audio_text=transcription.text,
        audio_confidence=transcription.confidence,
        weights=profile.weights,
        lip_reading_text=request.lip_reading_text,
        gesture_signal=request.gesture_signal,
    )

    # Correct transcription with Claude using user patterns
    try:
        recognition_result = await claude_service.correct_transcription(
            transcription=fusion_result.text,
            user_profile=profile,
            lip_reading_text=request.lip_reading_text,
            gesture_signal=request.gesture_signal.value if request.gesture_signal else None,
        )
    except ClaudeServiceError as e:
        raise HTTPException(status_code=500, detail=f"Correction failed: {e}")

    # TODO: Generate TTS audio here when tts_service is implemented
    # audio_url = await tts_service.synthesize(recognition_result.corrected_text, request.user_id)

    return RecognitionResponse(
        text=recognition_result.corrected_text,
        audio_url=None,
        confidence=recognition_result.confidence,
        needs_review=recognition_result.needs_review or fusion_result.needs_review,
        sources_used=fusion_result.sources_used,
        category=profile.category.value,
    )
