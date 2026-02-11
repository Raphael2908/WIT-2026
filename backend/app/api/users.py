"""User CRUD endpoints."""

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.request_model import CreateUserRequest, UpdateUserRequest
from app.models.user_profile import UserProfile
from app.storage.file_storage import FileManager, FileManagerError

router = APIRouter(tags=["users"])


def _profile_to_response(profile: UserProfile) -> dict:
    """Convert a UserProfile to the frontend-facing JSON shape."""
    return {
        "user_id": profile.user_id,
        "display_name": profile.display_name,
        "vision_impairment_hint": profile.vision_impairment_hint,
        "speech_impairment_hint": profile.speech_impairment_hint,
        "calibration_count": profile.calibration_count,
        "avg_whisper_confidence": profile.avg_whisper_confidence,
        "modality_weights": {
            "audio": profile.modality_weights.audio,
            "lip": profile.modality_weights.lip,
        },
        "created_at": profile.created_at.isoformat(),
        "updated_at": profile.updated_at.isoformat(),
    }


@router.post("/users")
async def create_user(request: CreateUserRequest) -> dict:
    """Create a new user with default profile."""
    file_manager = FileManager()
    user_id = str(uuid4())

    profile = UserProfile(
        user_id=user_id,
        display_name=request.display_name,
        vision_impairment_hint=request.vision_impairment_hint,
        speech_impairment_hint=request.speech_impairment_hint,
    )

    try:
        await file_manager.save_profile(profile)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return _profile_to_response(profile)


@router.get("/users/{user_id}")
async def get_user(user_id: str) -> dict:
    """Get a user profile by ID."""
    file_manager = FileManager()

    try:
        profile = await file_manager.load_profile(user_id)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if profile is None:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    return _profile_to_response(profile)


@router.patch("/users/{user_id}")
async def update_user(user_id: str, request: UpdateUserRequest) -> dict:
    """Partially update a user profile."""
    file_manager = FileManager()

    try:
        profile = await file_manager.load_profile(user_id)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if profile is None:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    if request.display_name is not None:
        profile.display_name = request.display_name
    if request.vision_impairment_hint is not None:
        profile.vision_impairment_hint = request.vision_impairment_hint
    if request.speech_impairment_hint is not None:
        profile.speech_impairment_hint = request.speech_impairment_hint

    profile.updated_at = datetime.utcnow()

    try:
        await file_manager.save_profile(profile)
    except FileManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return _profile_to_response(profile)
