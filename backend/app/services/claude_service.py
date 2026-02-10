import json
from dataclasses import dataclass
from typing import Optional

from anthropic import AsyncAnthropic

from app.config.prompts import (
    CALIBRATION_PROMPT,
    CORRECTION_LEARNING_PROMPT,
    RECOGNITION_PROMPT,
)
from app.config.settings import get_settings
from app.models.user_profile import ImpairmentCategory, UserProfile


class ClaudeServiceError(Exception):
    """Exception raised for Claude API failures."""

    pass


@dataclass
class CalibrationResult:
    """Result of calibration analysis."""

    category: ImpairmentCategory
    confidence: float
    phoneme_patterns: dict[str, str]
    common_substitutions: dict[str, str]
    analysis: str


@dataclass
class RecognitionResult:
    """Result of speech recognition correction."""

    corrected_text: str
    confidence: float
    corrections_applied: list[str]
    needs_review: bool


@dataclass
class CorrectionLearningResult:
    """Result of correction learning analysis."""

    new_phoneme_patterns: dict[str, str]
    new_substitutions: dict[str, str]
    updated_patterns: dict[str, str]
    patterns_learned: int
    analysis: str


class ClaudeService:
    """Service for Claude API integration."""

    def __init__(self):
        """Initialize the Claude service with API client."""
        settings = get_settings()
        self.client = AsyncAnthropic(api_key=settings.claude_api_key)
        self.model = settings.claude_model

    async def analyze_calibration(
        self,
        expected_sentences: list[str],
        actual_transcriptions: list[str],
    ) -> CalibrationResult:
        """Analyze calibration data to determine user's speech patterns.

        Args:
            expected_sentences: List of expected sentences.
            actual_transcriptions: List of actual transcriptions from Whisper.

        Returns:
            CalibrationResult with category, patterns, and substitutions.

        Raises:
            ClaudeServiceError: If analysis fails.
        """
        prompt = CALIBRATION_PROMPT.format(
            expected_sentences="\n".join(
                f"- {s}" for s in expected_sentences
            ),
            actual_transcriptions="\n".join(
                f"- {t}" for t in actual_transcriptions
            ),
        )

        response = await self._send_message(prompt)
        data = self._parse_json_response(response)

        return CalibrationResult(
            category=ImpairmentCategory(data["category"]),
            confidence=data["confidence"],
            phoneme_patterns=data.get("phoneme_patterns", {}),
            common_substitutions=data.get("common_substitutions", {}),
            analysis=data.get("analysis", ""),
        )

    async def correct_transcription(
        self,
        transcription: str,
        user_profile: UserProfile,
        lip_reading_text: Optional[str] = None,
        gesture_signal: Optional[str] = None,
    ) -> RecognitionResult:
        """Correct transcription using user's known speech patterns.

        Args:
            transcription: Raw transcription from Whisper.
            user_profile: User's speech profile with patterns.
            lip_reading_text: Optional lip reading input.
            gesture_signal: Optional gesture signal (CONFIRM/NEGATE/PUNCTUATE).

        Returns:
            RecognitionResult with corrected text and confidence.

        Raises:
            ClaudeServiceError: If correction fails.
        """
        prompt = RECOGNITION_PROMPT.format(
            category=user_profile.category.value,
            phoneme_patterns=json.dumps(user_profile.phoneme_patterns),
            common_substitutions=json.dumps(user_profile.common_substitutions),
            transcription=transcription,
            lip_reading_text=lip_reading_text or "Not available",
            gesture_signal=gesture_signal or "None",
        )

        response = await self._send_message(prompt)
        data = self._parse_json_response(response)

        return RecognitionResult(
            corrected_text=data["corrected_text"],
            confidence=data["confidence"],
            corrections_applied=data.get("corrections_applied", []),
            needs_review=data.get("needs_review", False),
        )

    async def learn_from_correction(
        self,
        original_text: str,
        corrected_text: str,
        user_profile: UserProfile,
    ) -> CorrectionLearningResult:
        """Analyze user correction to learn new patterns.

        Args:
            original_text: Original transcription.
            corrected_text: User's corrected text.
            user_profile: User's current speech profile.

        Returns:
            CorrectionLearningResult with new patterns learned.

        Raises:
            ClaudeServiceError: If learning fails.
        """
        prompt = CORRECTION_LEARNING_PROMPT.format(
            original_text=original_text,
            corrected_text=corrected_text,
            category=user_profile.category.value,
            phoneme_patterns=json.dumps(user_profile.phoneme_patterns),
            common_substitutions=json.dumps(user_profile.common_substitutions),
        )

        response = await self._send_message(prompt)
        data = self._parse_json_response(response)

        return CorrectionLearningResult(
            new_phoneme_patterns=data.get("new_phoneme_patterns", {}),
            new_substitutions=data.get("new_substitutions", {}),
            updated_patterns=data.get("updated_patterns", {}),
            patterns_learned=data.get("patterns_learned", 0),
            analysis=data.get("analysis", ""),
        )

    async def _send_message(self, prompt: str) -> str:
        """Send a message to Claude and get the response.

        Args:
            prompt: The prompt to send.

        Returns:
            Claude's response text.

        Raises:
            ClaudeServiceError: If API call fails.
        """
        try:
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            raise ClaudeServiceError(f"Claude API call failed: {e}")

    def _parse_json_response(self, response: str) -> dict:
        """Parse JSON from Claude's response.

        Args:
            response: Claude's response text.

        Returns:
            Parsed JSON as dictionary.

        Raises:
            ClaudeServiceError: If JSON parsing fails.
        """
        try:
            # Try to extract JSON from markdown code blocks if present
            if "```json" in response:
                start = response.find("```json") + 7
                end = response.find("```", start)
                response = response[start:end].strip()
            elif "```" in response:
                start = response.find("```") + 3
                end = response.find("```", start)
                response = response[start:end].strip()

            return json.loads(response)
        except json.JSONDecodeError as e:
            raise ClaudeServiceError(f"Failed to parse Claude response as JSON: {e}")
