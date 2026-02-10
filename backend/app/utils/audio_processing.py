import base64
import os
import tempfile
import uuid
from io import BytesIO

from pydub import AudioSegment

from app.config.settings import get_settings


class AudioProcessingError(Exception):
    """Exception raised for audio processing failures."""

    pass


def decode_base64_audio(base64_audio: str) -> bytes:
    """Decode base64 encoded audio to bytes.

    Args:
        base64_audio: Base64 encoded audio string.

    Returns:
        Raw audio bytes.

    Raises:
        AudioProcessingError: If decoding fails.
    """
    try:
        return base64.b64decode(base64_audio)
    except Exception as e:
        raise AudioProcessingError(f"Failed to decode base64 audio: {e}")


def convert_to_wav(audio_bytes: bytes) -> bytes:
    """Convert audio bytes to 16kHz mono WAV format.

    Args:
        audio_bytes: Raw audio bytes in any format pydub supports.

    Returns:
        WAV formatted audio bytes (16kHz, mono).

    Raises:
        AudioProcessingError: If conversion fails.
    """
    try:
        audio = AudioSegment.from_file(BytesIO(audio_bytes))
        audio = audio.set_frame_rate(16000).set_channels(1)
        output = BytesIO()
        audio.export(output, format="wav")
        return output.getvalue()
    except Exception as e:
        raise AudioProcessingError(f"Failed to convert audio to WAV: {e}")


def save_audio_to_temp_file(audio_bytes: bytes) -> str:
    """Save audio bytes to a temporary file.

    Args:
        audio_bytes: Audio bytes to save.

    Returns:
        Path to the temporary file.

    Raises:
        AudioProcessingError: If saving fails.
    """
    try:
        settings = get_settings()
        temp_dir = settings.temp_audio_dir
        os.makedirs(temp_dir, exist_ok=True)

        file_name = f"{uuid.uuid4()}.wav"
        file_path = os.path.join(temp_dir, file_name)

        with open(file_path, "wb") as f:
            f.write(audio_bytes)

        return file_path
    except Exception as e:
        raise AudioProcessingError(f"Failed to save audio to temp file: {e}")


def cleanup_temp_file(file_path: str) -> None:
    """Delete a temporary file.

    Args:
        file_path: Path to the file to delete.
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass
