"""File storage manager for user profiles and corrections."""

import csv
import json
from datetime import datetime
from io import StringIO
from pathlib import Path

import aiofiles
import yaml

from app.config.settings import get_settings
from app.models.user_profile import ImpairmentCategory, ModalityWeights, UserProfile


class FileManagerError(Exception):
    """Exception raised for file operation errors."""

    pass


class FileManager:
    """Manages file storage for user profiles and corrections."""

    def __init__(self) -> None:
        """Initialize FileManager with users directory from settings."""
        settings = get_settings()
        self.users_dir = Path(settings.users_dir)

    def _get_user_dir(self, user_id: str) -> Path:
        """Get or create user directory."""
        user_dir = self.users_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    async def save_profile(self, profile: UserProfile) -> None:
        """Save user profile to YAML-like text file."""
        try:
            user_dir = self._get_user_dir(profile.user_id)
            profile_path = user_dir / "profile.txt"

            profile_data = {
                "user_id": profile.user_id,
                "display_name": profile.display_name,
                "vision_impairment_hint": profile.vision_impairment_hint,
                "speech_impairment_hint": profile.speech_impairment_hint,
                "category": profile.category.value,
                "confidence": profile.confidence,
                "calibration_count": profile.calibration_count,
                "avg_whisper_confidence": profile.avg_whisper_confidence,
                "phoneme_patterns": profile.phoneme_patterns,
                "common_substitutions": profile.common_substitutions,
                "modality_weights": {
                    "audio": profile.modality_weights.audio,
                    "lip": profile.modality_weights.lip,
                },
                "confidence_threshold": profile.confidence_threshold,
                "created_at": profile.created_at.isoformat(),
                "updated_at": profile.updated_at.isoformat(),
            }

            yaml_content = yaml.dump(
                profile_data, default_flow_style=False, allow_unicode=True, sort_keys=False
            )

            async with aiofiles.open(profile_path, "w", encoding="utf-8") as f:
                await f.write(yaml_content)

        except Exception as e:
            raise FileManagerError(f"Failed to save profile for {profile.user_id}: {e}")

    async def load_profile(self, user_id: str) -> UserProfile | None:
        """Load user profile from file. Backward-compatible with old YAML keys."""
        profile_path = self.users_dir / user_id / "profile.txt"

        if not profile_path.exists():
            return None

        try:
            async with aiofiles.open(profile_path, "r", encoding="utf-8") as f:
                content = await f.read()

            data = yaml.safe_load(content)

            created_at = datetime.fromisoformat(data.get("created_at") or data.get("calibration_date", datetime.utcnow().isoformat()))
            updated_at = datetime.fromisoformat(data.get("updated_at") or data.get("last_updated", datetime.utcnow().isoformat()))

            # Backward-compatible weight loading
            raw_weights = data.get("modality_weights") or data.get("weights", {})
            lip_val = raw_weights.get("lip") or raw_weights.get("visual", 0.8)
            weights = ModalityWeights(
                audio=raw_weights.get("audio", 0.7),
                lip=lip_val,
            )

            profile = UserProfile(
                user_id=data["user_id"],
                display_name=data.get("display_name", ""),
                vision_impairment_hint=data.get("vision_impairment_hint"),
                speech_impairment_hint=data.get("speech_impairment_hint"),
                category=ImpairmentCategory(data.get("category", "adaptive_speech_decoding")),
                confidence=data.get("confidence", 0.0),
                calibration_count=data.get("calibration_count", 0),
                avg_whisper_confidence=data.get("avg_whisper_confidence", 0.0),
                phoneme_patterns=data.get("phoneme_patterns", {}),
                common_substitutions=data.get("common_substitutions", {}),
                modality_weights=weights,
                confidence_threshold=data.get("confidence_threshold", 0.7),
                created_at=created_at,
                updated_at=updated_at,
            )

            return profile

        except Exception as e:
            raise FileManagerError(f"Failed to load profile for {user_id}: {e}")

    def profile_exists(self, user_id: str) -> bool:
        """Check if user profile exists."""
        profile_path = self.users_dir / user_id / "profile.txt"
        return profile_path.exists()

    async def log_correction(self, user_id: str, original: str, corrected: str) -> None:
        """Append correction to user's corrections CSV file."""
        try:
            user_dir = self._get_user_dir(user_id)
            corrections_path = user_dir / "corrections.txt"

            file_exists = corrections_path.exists()
            timestamp = datetime.utcnow().isoformat()

            output = StringIO()
            writer = csv.writer(output)

            if not file_exists:
                writer.writerow(["timestamp", "original", "corrected"])

            writer.writerow([timestamp, original, corrected])
            csv_line = output.getvalue()

            async with aiofiles.open(corrections_path, "a", encoding="utf-8") as f:
                await f.write(csv_line)

        except Exception as e:
            raise FileManagerError(f"Failed to log correction for {user_id}: {e}")

    async def get_corrections(self, user_id: str) -> list[dict]:
        """Read correction history for a user."""
        corrections_path = self.users_dir / user_id / "corrections.txt"

        if not corrections_path.exists():
            return []

        try:
            async with aiofiles.open(corrections_path, "r", encoding="utf-8") as f:
                content = await f.read()

            corrections = []
            reader = csv.DictReader(StringIO(content))

            for row in reader:
                corrections.append({
                    "timestamp": row["timestamp"],
                    "original": row["original"],
                    "corrected": row["corrected"],
                })

            return corrections

        except Exception as e:
            raise FileManagerError(f"Failed to get corrections for {user_id}: {e}")

    async def save_calibration_audio(self, user_id: str, audio_bytes: bytes) -> str:
        """Save calibration audio backup."""
        try:
            user_dir = self._get_user_dir(user_id)
            audio_path = user_dir / "calibration_audio.wav"

            async with aiofiles.open(audio_path, "wb") as f:
                await f.write(audio_bytes)

            return str(audio_path)

        except Exception as e:
            raise FileManagerError(f"Failed to save calibration audio for {user_id}: {e}")

    # === Decode history ===

    def _decode_history_path(self, user_id: str) -> Path:
        return self._get_user_dir(user_id) / "decode_history.json"

    async def save_decode_history_entry(self, user_id: str, entry: dict) -> None:
        """Append a decode result entry to the user's decode history."""
        try:
            path = self._decode_history_path(user_id)
            history = await self._load_decode_history_raw(path)
            history.append(entry)
            async with aiofiles.open(path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(history, indent=2))
        except Exception as e:
            raise FileManagerError(f"Failed to save decode history for {user_id}: {e}")

    async def load_decode_history(self, user_id: str) -> list[dict]:
        """Load decode history for a user, sorted newest first."""
        try:
            path = self._decode_history_path(user_id)
            history = await self._load_decode_history_raw(path)
            history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return history
        except Exception as e:
            raise FileManagerError(f"Failed to load decode history for {user_id}: {e}")

    async def update_decode_history_entry(self, user_id: str, decode_id: str, updates: dict) -> None:
        """Find and update a specific decode history entry."""
        try:
            path = self._decode_history_path(user_id)
            history = await self._load_decode_history_raw(path)
            for entry in history:
                if entry.get("decode_id") == decode_id:
                    entry.update(updates)
                    break
            async with aiofiles.open(path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(history, indent=2))
        except Exception as e:
            raise FileManagerError(f"Failed to update decode history for {user_id}: {e}")

    async def _load_decode_history_raw(self, path: Path) -> list[dict]:
        if not path.exists():
            return []
        async with aiofiles.open(path, "r", encoding="utf-8") as f:
            content = await f.read()
        if not content.strip():
            return []
        return json.loads(content)

    # === Calibration session ===

    def _calibration_session_path(self, user_id: str) -> Path:
        return self._get_user_dir(user_id) / "calibration_session.json"

    async def save_calibration_result(self, user_id: str, result: dict) -> None:
        """Append a single calibration result to the session file."""
        try:
            path = self._calibration_session_path(user_id)
            results = await self._load_calibration_session_raw(path)
            results.append(result)
            async with aiofiles.open(path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(results, indent=2))
        except Exception as e:
            raise FileManagerError(f"Failed to save calibration result for {user_id}: {e}")

    async def load_calibration_session(self, user_id: str) -> list[dict]:
        """Load all calibration results for current session."""
        try:
            path = self._calibration_session_path(user_id)
            return await self._load_calibration_session_raw(path)
        except Exception as e:
            raise FileManagerError(f"Failed to load calibration session for {user_id}: {e}")

    async def delete_calibration_session(self, user_id: str) -> None:
        """Delete the calibration session file."""
        path = self._calibration_session_path(user_id)
        if path.exists():
            path.unlink()

    async def _load_calibration_session_raw(self, path: Path) -> list[dict]:
        if not path.exists():
            return []
        async with aiofiles.open(path, "r", encoding="utf-8") as f:
            content = await f.read()
        if not content.strip():
            return []
        return json.loads(content)

    # === Lip signatures ===

    def _lip_signatures_path(self, user_id: str) -> Path:
        return self._get_user_dir(user_id) / "lip_signatures.json"

    async def save_lip_signature(self, user_id: str, signature: dict) -> None:
        """Save a lip signature for a calibrated phrase."""
        try:
            path = self._lip_signatures_path(user_id)
            sigs = await self._load_lip_signatures_raw(path)
            sigs.append(signature)
            async with aiofiles.open(path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(sigs, indent=2))
        except Exception as e:
            raise FileManagerError(f"Failed to save lip signature for {user_id}: {e}")

    async def load_lip_signatures(self, user_id: str) -> list[dict]:
        """Load all lip signatures for a user."""
        try:
            path = self._lip_signatures_path(user_id)
            return await self._load_lip_signatures_raw(path)
        except Exception as e:
            raise FileManagerError(f"Failed to load lip signatures for {user_id}: {e}")

    async def _load_lip_signatures_raw(self, path: Path) -> list[dict]:
        if not path.exists():
            return []
        async with aiofiles.open(path, "r", encoding="utf-8") as f:
            content = await f.read()
        if not content.strip():
            return []
        return json.loads(content)
