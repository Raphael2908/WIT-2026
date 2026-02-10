from .prompts import (
    CALIBRATION_PROMPT,
    CORRECTION_LEARNING_PROMPT,
    RECOGNITION_PROMPT,
)
from .settings import Settings, get_settings

__all__ = [
    "Settings",
    "get_settings",
    "CALIBRATION_PROMPT",
    "RECOGNITION_PROMPT",
    "CORRECTION_LEARNING_PROMPT",
]
