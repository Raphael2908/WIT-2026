from typing import Optional

from pydantic import BaseModel, Field


# === Lip tracking models ===

class LipPoint(BaseModel):
    """A single lip landmark point."""
    index: int
    x: float
    y: float
    z: float = 0.0


class LipFrame(BaseModel):
    """A single frame of lip tracking data."""
    timestamp_ms: int
    landmarks: list[LipPoint] = Field(default_factory=list)
    openness: float = 0.0
    width: float = 0.0
    rounding: float = 0.0
    shape: Optional[str] = None


class LipMatch(BaseModel):
    """Result of comparing a lip shape sequence to a known signature."""
    phrase_text: str
    similarity: float


class LipSignature(BaseModel):
    """A stored lip shape signature for a known phrase."""
    phrase_text: str
    shape_sequence: str


# === Calibration request/response (legacy) ===

class CalibrationRequest(BaseModel):
    """Request model for user calibration endpoint."""
    user_id: str = Field(..., description="Unique user identifier")
    audio_file: str = Field(..., description="Base64 encoded WAV audio")
    expected_sentences: Optional[list[str]] = Field(
        default=None, description="Expected sentences for calibration"
    )


class CalibrationResponse(BaseModel):
    """Response model for calibration endpoint."""
    status: str = "success"
    category: str = Field(..., description="Impairment category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Calibration confidence")
    phoneme_patterns: dict[str, str] = Field(
        default_factory=dict, description="Detected phoneme patterns"
    )
    message: str = "Calibration complete"


# === Recognition (legacy, kept for backward compat) ===

class RecognitionRequest(BaseModel):
    """Request model for speech recognition endpoint."""
    user_id: str = Field(..., description="Unique user identifier")
    audio_chunk: str = Field(..., description="Base64 encoded WAV audio chunk")
    lip_reading_text: Optional[str] = Field(
        default=None, description="Text from lip reading input"
    )


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
        default_factory=list, description="Input sources used"
    )
    category: str = Field(..., description="User impairment category")


# === Correction (legacy) ===

class CorrectionRequest(BaseModel):
    """Request model for user correction endpoint."""
    user_id: str = Field(..., description="Unique user identifier")
    original_text: str = Field(..., description="Original transcribed text")
    corrected_text: str = Field(..., description="User-corrected text")


class CorrectionResponse(BaseModel):
    """Response model for correction endpoint."""
    status: str = "success"
    patterns_learned: int = Field(..., description="Number of new patterns learned")
    message: str = "Correction logged"


# === New decode models ===

class DecodeRequest(BaseModel):
    """Request body for POST /decode/{user_id}."""
    audio_base64: str = Field(..., description="Base64 encoded WAV audio")
    lip_frames: Optional[list[LipFrame]] = Field(
        default=None, description="Lip tracking frames from frontend"
    )


class DecodeResult(BaseModel):
    """Response for POST /decode/{user_id}."""
    decode_id: str
    decoded_text: str
    raw_whisper: str
    whisper_confidence: float
    lip_reading_used: bool
    modality_weights: dict[str, float]
    lip_matches: list[LipMatch] = Field(default_factory=list)
    processing_time_ms: int = 0
    detected_language: str = "en"
    chinese_text: Optional[str] = None


# === Feedback models ===

class FeedbackPayload(BaseModel):
    """Request body for POST /feedback/{user_id}."""
    decode_id: str
    corrected_text: Optional[str] = None
    confirmed: bool = False


class FeedbackResult(BaseModel):
    """Response for POST /feedback/{user_id}."""
    profile_updated: bool = False
    total_mappings: int = 0


# === User CRUD models ===

class CreateUserRequest(BaseModel):
    """Request body for POST /users."""
    display_name: str = ""
    vision_impairment_hint: Optional[str] = None
    speech_impairment_hint: Optional[str] = None


class UpdateUserRequest(BaseModel):
    """Request body for PATCH /users/{user_id}."""
    display_name: Optional[str] = None
    vision_impairment_hint: Optional[str] = None
    speech_impairment_hint: Optional[str] = None


# === Decode history ===

class DecodeHistoryEntry(BaseModel):
    """A single entry in the decode history."""
    decode_id: str
    decoded_text: str
    raw_whisper: str
    whisper_confidence: float
    lip_used: bool
    feedback_status: str = "pending"
    corrected_text: Optional[str] = None
    created_at: str
    detected_language: str = "en"
    chinese_text: Optional[str] = None


# === Calibration (new multi-step) ===

class CalibrationPhraseModel(BaseModel):
    """A calibration phrase served to the frontend."""
    phrase_id: str
    text: str
    difficulty: int = 1
    phoneme_targets: list[str] = Field(default_factory=list)


class CalibrationResultModel(BaseModel):
    """Result of a single calibration phrase submission."""
    phrase_text: str
    whisper_output: str
    confidence: float
    match: bool
    error_mapping_created: bool = False
    shape_sequence: Optional[str] = None


class CalibrationSummaryModel(BaseModel):
    """Summary returned after completing calibration."""
    calibration_count: int
    total_phrases: int
    accurate_phrases: int
    accuracy_pct: float
    recommended_modalities: list[str] = Field(default_factory=list)
    avg_confidence: float
