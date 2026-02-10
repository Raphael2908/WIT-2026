from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ImpairmentCategory(str, Enum):
    """User impairment category types."""

    ADAPTIVE_SPEECH_DECODING = "adaptive_speech_decoding"
    MULTIMODAL_INPUT_FUSION = "multimodal_input_fusion"
    REHABILITATION_MODE = "rehabilitation_mode"


class ModalityWeights(BaseModel):
    """Weights for different input modalities."""

    audio: float = 0.7
    visual: float = 0.8
    gesture: float = 0.5


class UserProfile(BaseModel):
    """User profile data structure."""

    user_id: str
    category: ImpairmentCategory
    confidence: float = Field(ge=0.0, le=1.0)
    calibration_date: datetime = Field(default_factory=datetime.utcnow)
    phoneme_patterns: dict[str, str] = Field(default_factory=dict)
    common_substitutions: dict[str, str] = Field(default_factory=dict)
    weights: ModalityWeights = Field(default_factory=ModalityWeights)
    confidence_threshold: float = 0.7
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def get_default_weights(cls, category: ImpairmentCategory) -> ModalityWeights:
        """Get default modality weights based on impairment category."""
        weights_map = {
            ImpairmentCategory.ADAPTIVE_SPEECH_DECODING: ModalityWeights(
                audio=0.7, visual=0.8, gesture=0.5
            ),
            ImpairmentCategory.MULTIMODAL_INPUT_FUSION: ModalityWeights(
                audio=0.5, visual=0.9, gesture=0.7
            ),
            ImpairmentCategory.REHABILITATION_MODE: ModalityWeights(
                audio=0.8, visual=0.6, gesture=0.5
            ),
        }
        return weights_map.get(
            category, ModalityWeights(audio=0.7, visual=0.8, gesture=0.5)
        )
