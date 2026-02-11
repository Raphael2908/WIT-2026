"""Multimodal fusion service for combining audio and lip reading."""

import logging
from dataclasses import dataclass
from typing import Optional

from app.models.user_profile import ModalityWeights

logger = logging.getLogger(__name__)


@dataclass
class FusionResult:
    """Result of multimodal fusion."""
    text: str
    confidence: float
    sources_used: list[str]
    primary_source: str  # "audio" or "lip_reading"
    needs_review: bool


class FusionService:
    """Fuses audio transcription with lip reading."""

    # Default confidence for lip reading text (frontend doesn't provide confidence)
    LIP_READING_DEFAULT_CONFIDENCE = 0.8

    def fuse(
        self,
        audio_text: str,
        audio_confidence: float,
        weights: ModalityWeights,
        lip_reading_text: Optional[str] = None,
    ) -> FusionResult:
        """Fuse multimodal inputs into a single result.

        Args:
            audio_text: Transcription from Whisper.
            audio_confidence: Confidence score from Whisper (0.0-1.0).
            weights: User's category-specific modality weights.
            lip_reading_text: Optional text from lip reading (frontend).

        Returns:
            FusionResult with fused text, confidence, and source tracking.
        """
        sources_used = ["audio"]
        needs_review = False

        # Calculate weighted confidence for audio
        weighted_audio = audio_confidence * weights.audio

        # Determine primary source
        primary_source = "audio"
        text = audio_text
        confidence = weighted_audio

        # If lip reading is provided, compare weighted confidences
        if lip_reading_text:
            sources_used.append("lip_reading")
            weighted_lip = self.LIP_READING_DEFAULT_CONFIDENCE * weights.lip

            logger.info(
                f"Fusion comparison - Audio: {weighted_audio:.2f} (raw: {audio_confidence:.2f} * weight: {weights.audio}), "
                f"Lip reading: {weighted_lip:.2f} (raw: {self.LIP_READING_DEFAULT_CONFIDENCE} * weight: {weights.lip})"
            )

            # Select source with higher weighted confidence
            if weighted_lip > weighted_audio:
                primary_source = "lip_reading"
                text = lip_reading_text
                confidence = weighted_lip
                logger.info(f"Selected LIP READING as primary source: '{lip_reading_text}'")
            else:
                logger.info(f"Selected AUDIO as primary source: '{audio_text}'")

            # Flag for review if sources differ significantly
            if audio_text.lower().strip() != lip_reading_text.lower().strip():
                needs_review = True
                logger.warning(
                    f"Mismatch detected - Audio: '{audio_text}' vs Lip: '{lip_reading_text}' -> flagged for review"
                )

        logger.info(
            f"Fusion result - Primary: {primary_source}, Text: '{text}', "
            f"Confidence: {confidence:.2f}, Sources: {sources_used}, Review: {needs_review}"
        )

        return FusionResult(
            text=text,
            confidence=min(confidence, 1.0),  # Cap at 1.0
            sources_used=sources_used,
            primary_source=primary_source,
            needs_review=needs_review,
        )
