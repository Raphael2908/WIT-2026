from dataclasses import dataclass
from typing import Optional

from openai import AsyncOpenAI

from app.config.settings import get_settings
from app.utils.audio_processing import (
    AudioProcessingError,
    cleanup_temp_file,
    convert_to_wav,
    decode_base64_audio,
    save_audio_to_temp_file,
)
from app.utils.text_processing import calculate_similarity

MANDARIN_CODES = frozenset({"chinese", "zh"})
MALAY_CODES = frozenset({"malay", "ms"})
NON_ENGLISH_CODES = MANDARIN_CODES | MALAY_CODES


class WhisperServiceError(Exception):
    """Exception raised for Whisper API failures."""

    pass


@dataclass
class TranscriptionResult:
    """Result of a transcription operation."""

    text: str
    confidence: float
    language: str
    duration_ms: Optional[int] = None
    translated_text: Optional[str] = None  # English translation when non-English detected


class WhisperService:
    """Service for transcribing audio using OpenAI Whisper API."""

    def __init__(self):
        """Initialize the Whisper service with API client."""
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.whisper_api_key)
        self.model = settings.whisper_model
        self.default_language = settings.whisper_language

    async def _translate_file(self, file_path: str) -> str:
        """Translate audio to English using OpenAI translations endpoint.

        Args:
            file_path: Path to the audio file.

        Returns:
            English translation text.

        Raises:
            WhisperServiceError: If translation fails.
        """
        try:
            with open(file_path, "rb") as audio_file:
                response = await self.client.audio.translations.create(
                    model=self.model,
                    file=audio_file,
                )
            return response.text
        except Exception as e:
            raise WhisperServiceError(f"Whisper API translation failed: {e}")

    async def transcribe_base64_audio(
        self,
        base64_audio: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
        expected_text: Optional[str] = None,
        auto_detect: bool = False,
    ) -> TranscriptionResult:
        """Transcribe base64 encoded audio.

        Args:
            base64_audio: Base64 encoded audio string.
            language: Language code (default: from settings).
            prompt: Optional prompt to guide transcription.
            expected_text: Optional expected text for confidence estimation.
            auto_detect: If True, omit language param to let Whisper auto-detect.

        Returns:
            TranscriptionResult with text, confidence, language, and duration.

        Raises:
            WhisperServiceError: If transcription fails.
            AudioProcessingError: If audio processing fails.
        """
        temp_file_path = None
        try:
            audio_bytes = decode_base64_audio(base64_audio)
            wav_bytes = convert_to_wav(audio_bytes)
            temp_file_path = save_audio_to_temp_file(wav_bytes)

            result = await self.transcribe_file(
                file_path=temp_file_path,
                language=language,
                prompt=prompt,
                expected_text=expected_text,
                auto_detect=auto_detect,
            )

            # If non-English detected, translate the audio to English
            if auto_detect and result.language in NON_ENGLISH_CODES:
                result.translated_text = await self._translate_file(temp_file_path)

            return result
        finally:
            if temp_file_path:
                cleanup_temp_file(temp_file_path)

    async def transcribe_file(
        self,
        file_path: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
        expected_text: Optional[str] = None,
        auto_detect: bool = False,
    ) -> TranscriptionResult:
        """Transcribe audio from a file.

        Args:
            file_path: Path to the audio file.
            language: Language code (default: from settings).
            prompt: Optional prompt to guide transcription.
            expected_text: Optional expected text for confidence estimation.
            auto_detect: If True, omit language param to let Whisper auto-detect.

        Returns:
            TranscriptionResult with text, confidence, language, and duration.

        Raises:
            WhisperServiceError: If transcription fails.
        """
        try:
            kwargs = {
                "model": self.model,
                "prompt": prompt,
                "response_format": "verbose_json",
            }
            if not auto_detect:
                kwargs["language"] = language or self.default_language

            with open(file_path, "rb") as audio_file:
                response = await self.client.audio.transcriptions.create(
                    file=audio_file,
                    **kwargs,
                )

            text = response.text
            detected_language = getattr(response, "language", self.default_language)
            duration_ms = None
            if hasattr(response, "duration"):
                duration_ms = int(response.duration * 1000)

            confidence = self._estimate_confidence(text, expected_text)

            return TranscriptionResult(
                text=text,
                confidence=confidence,
                language=detected_language,
                duration_ms=duration_ms,
            )
        except Exception as e:
            raise WhisperServiceError(f"Whisper API transcription failed: {e}")

    def _estimate_confidence(
        self, text: str, expected_text: Optional[str] = None
    ) -> float:
        """Estimate transcription confidence.

        Args:
            text: Transcribed text.
            expected_text: Optional expected text for comparison.

        Returns:
            Confidence score between 0.0 and 1.0.
        """
        if expected_text:
            return calculate_similarity(text, expected_text)
        return 0.85
