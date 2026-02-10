"""Correction endpoint for learning from user feedback."""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.request_model import CorrectionRequest, CorrectionResponse
from app.services.claude_service import ClaudeService, ClaudeServiceError
from app.storage.file_storage import FileManager, FileManagerError

router = APIRouter()


@router.post("/api/correct", response_model=CorrectionResponse)
async def correct(request: CorrectionRequest) -> CorrectionResponse:
    """Learn from a user correction to improve future recognition.

    Process:
    1. Load user profile
    2. Analyze correction patterns with Claude
    3. Merge new patterns into profile
    4. Save updated profile
    5. Log correction
    """
    file_manager = FileManager()
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

    # Analyze correction with Claude
    try:
        learning_result = await claude_service.learn_from_correction(
            original_text=request.original_text,
            corrected_text=request.corrected_text,
            user_profile=profile,
        )
    except ClaudeServiceError as e:
        raise HTTPException(status_code=500, detail=f"Correction analysis failed: {e}")

    # Merge new patterns into profile
    profile.phoneme_patterns.update(learning_result.new_phoneme_patterns)
    profile.phoneme_patterns.update(learning_result.updated_patterns)
    profile.common_substitutions.update(learning_result.new_substitutions)
    profile.last_updated = datetime.utcnow()

    # Save updated profile, then log correction
    try:
        await file_manager.save_profile(profile)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {e}")

    try:
        await file_manager.log_correction(
            user_id=request.user_id,
            original=request.original_text,
            corrected=request.corrected_text,
        )
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=f"Failed to log correction: {e}")

    return CorrectionResponse(
        status="success",
        patterns_learned=learning_result.patterns_learned,
        message=f"Correction logged. {learning_result.patterns_learned} new pattern(s) learned.",
    )
