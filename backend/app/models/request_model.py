from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class GestureSignal(str, Enum):
    """Gesture signal types for multimodal input."""

    CONFIRM = "CONFIRM"
    NEGATE = "NEGATE"
    PUNCTUATE = "PUNCTUATE"


class CalibrationRequest(BaseModel):
    """Request model for user calibration endpoint."""

    user_id: str = Field(..., description="Unique user identifier")
    audio_file: str = Field(..., description="Base64 encoded WAV audio")
    expected_sentences: Optional[list[str]] = Field(
        default=None, description="Expected sentences for calibration"
    )


class RecognitionRequest(BaseModel):
    """Request model for speech recognition endpoint."""

    user_id: str = Field(..., description="Unique user identifier")
    audio_chunk: str = Field(..., description="Base64 encoded WAV audio chunk")
    lip_reading_text: Optional[str] = Field(
        default=None, description="Text from lip reading input"
    )
    gesture_signal: Optional[GestureSignal] = Field(
        default=None, description="Gesture signal for confirmation/negation"
    )


class CorrectionRequest(BaseModel):
    """Request model for user correction endpoint."""

    user_id: str = Field(..., description="Unique user identifier")
    original_text: str = Field(..., description="Original transcribed text")
    corrected_text: str = Field(..., description="User-corrected text")
