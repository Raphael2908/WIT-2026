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
    lip: float = 0.8


class UserProfile(BaseModel):
    """User profile data structure."""

    user_id: str
    display_name: str = ""
    vision_impairment_hint: Optional[str] = None
    speech_impairment_hint: Optional[str] = None
    category: ImpairmentCategory = ImpairmentCategory.ADAPTIVE_SPEECH_DECODING
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    calibration_count: int = 0
    avg_whisper_confidence: float = 0.0
    phoneme_patterns: dict[str, str] = Field(default_factory=dict)
    common_substitutions: dict[str, str] = Field(default_factory=dict)
    modality_weights: ModalityWeights = Field(default_factory=ModalityWeights)
    confidence_threshold: float = 0.7
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def get_default_weights(cls, category: ImpairmentCategory) -> ModalityWeights:
        """Get default modality weights based on impairment category."""
        weights_map = {
            ImpairmentCategory.ADAPTIVE_SPEECH_DECODING: ModalityWeights(
                audio=0.7, lip=0.8
            ),
            ImpairmentCategory.MULTIMODAL_INPUT_FUSION: ModalityWeights(
                audio=0.5, lip=0.9
            ),
            ImpairmentCategory.REHABILITATION_MODE: ModalityWeights(
                audio=0.8, lip=0.6
            ),
        }
        return weights_map.get(
            category, ModalityWeights(audio=0.7, lip=0.8)
        )
