"""File storage manager for user profiles and corrections."""

import csv
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
        """Get or create user directory.

        Args:
            user_id: The user identifier.

        Returns:
            Path to the user's directory.
        """
        user_dir = self.users_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    async def save_profile(self, profile: UserProfile) -> None:
        """Save user profile to YAML-like text file.

        Args:
            profile: The UserProfile to save.

        Raises:
            FileManagerError: If save operation fails.
        """
        try:
            user_dir = self._get_user_dir(profile.user_id)
            profile_path = user_dir / "profile.txt"

            # Convert profile to dict for YAML serialization
            profile_data = {
                "user_id": profile.user_id,
                "category": profile.category.value,
                "confidence": profile.confidence,
                "calibration_date": profile.calibration_date.isoformat(),
                "phoneme_patterns": profile.phoneme_patterns,
                "common_substitutions": profile.common_substitutions,
                "weights": {
                    "audio": profile.weights.audio,
                    "visual": profile.weights.visual,
                    "gesture": profile.weights.gesture,
                },
                "confidence_threshold": profile.confidence_threshold,
                "last_updated": profile.last_updated.isoformat(),
            }

            yaml_content = yaml.dump(
                profile_data, default_flow_style=False, allow_unicode=True, sort_keys=False
            )

            async with aiofiles.open(profile_path, "w", encoding="utf-8") as f:
                await f.write(yaml_content)

        except Exception as e:
            raise FileManagerError(f"Failed to save profile for {profile.user_id}: {e}")

    async def load_profile(self, user_id: str) -> UserProfile | None:
        """Load user profile from file.

        Args:
            user_id: The user identifier.

        Returns:
            UserProfile if found, None otherwise.

        Raises:
            FileManagerError: If load operation fails (other than file not found).
        """
        profile_path = self.users_dir / user_id / "profile.txt"

        if not profile_path.exists():
            return None

        try:
            async with aiofiles.open(profile_path, "r", encoding="utf-8") as f:
                content = await f.read()

            data = yaml.safe_load(content)

            # Parse datetime strings
            calibration_date = datetime.fromisoformat(data["calibration_date"])
            last_updated = datetime.fromisoformat(data["last_updated"])

            # Create ModalityWeights
            weights = ModalityWeights(
                audio=data["weights"]["audio"],
                visual=data["weights"]["visual"],
                gesture=data["weights"]["gesture"],
            )

            # Create UserProfile
            profile = UserProfile(
                user_id=data["user_id"],
                category=ImpairmentCategory(data["category"]),
                confidence=data["confidence"],
                calibration_date=calibration_date,
                phoneme_patterns=data.get("phoneme_patterns", {}),
                common_substitutions=data.get("common_substitutions", {}),
                weights=weights,
                confidence_threshold=data.get("confidence_threshold", 0.7),
                last_updated=last_updated,
            )

            return profile

        except Exception as e:
            raise FileManagerError(f"Failed to load profile for {user_id}: {e}")

    def profile_exists(self, user_id: str) -> bool:
        """Check if user profile exists.

        Args:
            user_id: The user identifier.

        Returns:
            True if profile exists, False otherwise.
        """
        profile_path = self.users_dir / user_id / "profile.txt"
        return profile_path.exists()

    async def log_correction(self, user_id: str, original: str, corrected: str) -> None:
        """Append correction to user's corrections CSV file.

        Args:
            user_id: The user identifier.
            original: The original (incorrect) text.
            corrected: The corrected text.

        Raises:
            FileManagerError: If log operation fails.
        """
        try:
            user_dir = self._get_user_dir(user_id)
            corrections_path = user_dir / "corrections.txt"

            # Check if file exists to determine if we need headers
            file_exists = corrections_path.exists()

            # Create CSV row
            timestamp = datetime.utcnow().isoformat()

            # Use StringIO to properly format CSV
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
        """Read correction history for a user.

        Args:
            user_id: The user identifier.

        Returns:
            List of correction dictionaries with timestamp, original, corrected keys.

        Raises:
            FileManagerError: If read operation fails.
        """
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
        """Save calibration audio backup.

        Args:
            user_id: The user identifier.
            audio_bytes: The audio file bytes.

        Returns:
            Path to the saved audio file.

        Raises:
            FileManagerError: If save operation fails.
        """
        try:
            user_dir = self._get_user_dir(user_id)
            audio_path = user_dir / "calibration_audio.wav"

            async with aiofiles.open(audio_path, "wb") as f:
                await f.write(audio_bytes)

            return str(audio_path)

        except Exception as e:
            raise FileManagerError(f"Failed to save calibration audio for {user_id}: {e}")
