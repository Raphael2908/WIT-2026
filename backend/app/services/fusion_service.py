"""Multimodal fusion service for combining audio, lip reading, and gestures."""

import logging
from dataclasses import dataclass
from typing import Optional

from app.models.request_model import GestureSignal
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
    """Fuses audio transcription with lip reading and gesture signals."""

    # Default confidence for lip reading text (frontend doesn't provide confidence)
    LIP_READING_DEFAULT_CONFIDENCE = 0.8

    def fuse(
        self,
        audio_text: str,
        audio_confidence: float,
        weights: ModalityWeights,
        lip_reading_text: Optional[str] = None,
        gesture_signal: Optional[GestureSignal] = None,
    ) -> FusionResult:
        """Fuse multimodal inputs into a single result.

        Args:
            audio_text: Transcription from Whisper.
            audio_confidence: Confidence score from Whisper (0.0-1.0).
            weights: User's category-specific modality weights.
            lip_reading_text: Optional text from lip reading (frontend).
            gesture_signal: Optional gesture override signal.

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
            weighted_visual = self.LIP_READING_DEFAULT_CONFIDENCE * weights.visual

            logger.info(
                f"Fusion comparison - Audio: {weighted_audio:.2f} (raw: {audio_confidence:.2f} * weight: {weights.audio}), "
                f"Lip reading: {weighted_visual:.2f} (raw: {self.LIP_READING_DEFAULT_CONFIDENCE} * weight: {weights.visual})"
            )

            # Select source with higher weighted confidence
            if weighted_visual > weighted_audio:
                primary_source = "lip_reading"
                text = lip_reading_text
                confidence = weighted_visual
                logger.info(f"Selected LIP READING as primary source: '{lip_reading_text}'")
            else:
                logger.info(f"Selected AUDIO as primary source: '{audio_text}'")

            # Flag for review if sources differ significantly
            if audio_text.lower().strip() != lip_reading_text.lower().strip():
                needs_review = True
                logger.warning(
                    f"Mismatch detected - Audio: '{audio_text}' vs Lip: '{lip_reading_text}' -> flagged for review"
                )

        # Apply gesture overrides
        if gesture_signal:
            sources_used.append("gesture")
            text, confidence, needs_review = self._apply_gesture(
                text, confidence, needs_review, gesture_signal
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

    def _apply_gesture(
        self,
        text: str,
        confidence: float,
        needs_review: bool,
        gesture: GestureSignal,
    ) -> tuple[str, float, bool]:
        """Apply gesture signal overrides.

        Args:
            text: Current fused text.
            confidence: Current confidence score.
            needs_review: Current review flag.
            gesture: Gesture signal to apply.

        Returns:
            Tuple of (modified_text, modified_confidence, modified_needs_review).
        """
        if gesture == GestureSignal.CONFIRM:
            # User confirms - boost confidence
            confidence = min(confidence + 0.1, 1.0)
            needs_review = False  # User confirmed, no review needed
            logger.info(f"CONFIRM gesture: boosted confidence to {confidence:.2f}")

        elif gesture == GestureSignal.NEGATE:
            # User negates - flag for review, reduce confidence
            confidence = max(confidence - 0.2, 0.0)
            needs_review = True
            logger.info(f"NEGATE gesture: reduced confidence to {confidence:.2f}, flagged for review")

        elif gesture == GestureSignal.PUNCTUATE:
            # User signals punctuation - add period if not present
            if text and not text.rstrip().endswith(('.', '!', '?')):
                text = text.rstrip() + '.'
                logger.info(f"PUNCTUATE gesture: added period -> '{text}'")

        return text, confidence, needs_review
