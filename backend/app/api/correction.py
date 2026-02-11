"""Feedback endpoints for learning from user corrections."""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.request_model import FeedbackPayload, FeedbackResult
from app.services.claude_service import ClaudeService, ClaudeServiceError
from app.storage.file_storage import FileManager, FileManagerError

router = APIRouter(tags=["feedback"])


@router.post("/feedback/{user_id}", response_model=FeedbackResult)
async def submit_feedback(user_id: str, payload: FeedbackPayload) -> FeedbackResult:
    """Process user feedback on a decode result.

    - If confirmed=true: mark the decode entry as confirmed.
    - If corrected_text provided: learn from the correction and update profile.
    """
    file_manager = FileManager()
    claude_service = ClaudeService()

    # Load user profile
    try:
        profile = await file_manager.load_profile(user_id)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {e}")

    if profile is None:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    profile_updated = False

    # Load decode history and find the entry
    try:
        history = await file_manager.load_decode_history(user_id)
    except FileManagerError:
        history = []

    entry = next((h for h in history if h.get("decode_id") == payload.decode_id), None)

    if payload.confirmed:
        # User confirmed the decode is correct
        if entry:
            await file_manager.update_decode_history_entry(
                user_id, payload.decode_id, {"feedback_status": "confirmed"}
            )

    if payload.corrected_text:
        # User provided a correction — learn from it
        original_text = entry["decoded_text"] if entry else ""

        if entry:
            await file_manager.update_decode_history_entry(
                user_id, payload.decode_id,
                {"feedback_status": "corrected", "corrected_text": payload.corrected_text},
            )

        if original_text:
            try:
                learning_result = await claude_service.learn_from_correction(
                    original_text=original_text,
                    corrected_text=payload.corrected_text,
                    user_profile=profile,
                )

                # Merge new patterns into profile
                profile.phoneme_patterns.update(learning_result.new_phoneme_patterns)
                profile.phoneme_patterns.update(learning_result.updated_patterns)
                profile.common_substitutions.update(learning_result.new_substitutions)
                profile.updated_at = datetime.utcnow()

                await file_manager.save_profile(profile)
                profile_updated = True
            except (ClaudeServiceError, FileManagerError):
                pass  # Best-effort learning

            # Log correction
            try:
                await file_manager.log_correction(user_id, original_text, payload.corrected_text)
            except FileManagerError:
                pass

    return FeedbackResult(
        profile_updated=profile_updated,
        total_mappings=len(profile.common_substitutions),
    )


@router.get("/feedback/{user_id}/history")
async def get_feedback_history(user_id: str) -> dict:
    """Get decode history with feedback status for a user."""
    file_manager = FileManager()

    if not file_manager.profile_exists(user_id):
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    try:
        history = await file_manager.load_decode_history(user_id)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"history": history}
