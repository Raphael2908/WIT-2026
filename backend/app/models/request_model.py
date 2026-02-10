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


class CalibrationResponse(BaseModel):
    """Response model for calibration endpoint."""

    status: str = "success"
    category: str = Field(..., description="Impairment category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Calibration confidence")
    phoneme_patterns: dict[str, str] = Field(
        default_factory=dict, description="Detected phoneme patterns"
    )
    message: str = "Calibration complete"


class RecognitionResponse(BaseModel):
    """Response model for recognition endpoint."""

    text: str = Field(..., description="Corrected transcription text")
    audio_url: Optional[str] = Field(
        default=None, description="URL to generated TTS audio"
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Recognition confidence")
    needs_review: bool = Field(
        default=False, description="Whether the result needs user review"
    )
    sources_used: list[str] = Field(
        default_factory=list, description="Input sources used (audio, lip_reading, gesture)"
    )
    category: str = Field(..., description="User impairment category")


class CorrectionResponse(BaseModel):
    """Response model for correction endpoint."""

    status: str = "success"
    patterns_learned: int = Field(..., description="Number of new patterns learned")
    message: str = "Correction logged"
