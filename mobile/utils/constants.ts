import type { UserProfile } from "../types";

// MediaPipe Face Mesh lip landmark indices
export const LIP_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
  308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
  185, 40, 39, 37, 0, 267, 269, 270, 409, 415,
  310, 311, 312, 13, 82, 81, 42, 183, 78,
];

export const UPPER_LIP_CENTER = [13, 14];
export const LOWER_LIP_CENTER = [17, 0];
export const MOUTH_CORNERS = [61, 291];
export const UPPER_LIP_INDICES = [
  185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42,
  183, 78,
];
export const LOWER_LIP_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317,
  14, 87, 178, 88, 95,
];

// Shape classification thresholds
export const SHAPE_THRESHOLDS = {
  CLOSED_MAX_OPEN: 0.1,
  BARELY_OPEN_MAX: 0.25,
  WIDE_SPREAD_MIN_WIDTH: 0.55,
  PURSED_MAX_WIDTH: 0.3,
  PURSED_MIN_ROUND: 1.2,
  NARROW_MAX_WIDTH: 0.35,
  OPEN_SPREAD_MIN_WIDTH: 0.5,
  OPEN_ROUND_MIN_ROUND: 1.0,
};

// Audio config
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  BIT_DEPTH: 16,
  CHUNK_DURATION_MS: 500,
  SILENCE_THRESHOLD: 0.02,
  SILENCE_TIMEOUT_MS: 1500,
};

// Vision impairment options for onboarding
export const VISION_IMPAIRMENT_OPTIONS = [
  { label: "No vision impairment", value: "none" },
  { label: "Partial vision impairment", value: "partial" },
  { label: "Blind", value: "blind" },
];

// Speech impairment options for onboarding
export const SPEECH_IMPAIRMENT_OPTIONS = [
  { label: "Dysarthria", value: "dysarthria" },
  { label: "Stuttering", value: "stuttering" },
  { label: "Apraxia of Speech", value: "apraxia" },
  { label: "Cerebral Palsy", value: "cerebral_palsy" },
  { label: "ALS / MND", value: "als" },
  { label: "Vocal Cord Paralysis", value: "vocal_cord_paralysis" },
  { label: "Stroke Recovery", value: "stroke" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: null },
];

// API routes
export const API_ROUTES = {
  CREATE_USER: "/users",
  GET_USER: (id: string) => `/users/${id}`,
  UPDATE_USER: (id: string) => `/users/${id}`,
  GET_ERROR_PROFILE: (id: string) => `/users/${id}/error-profile`,
  CALIBRATION_PHRASES: "/calibration/phrases",
  SUBMIT_CALIBRATION: (id: string) => `/calibration/${id}/submit-with-lips`,
  COMPLETE_CALIBRATION: (id: string) => `/calibration/${id}/complete`,
  DECODE: (id: string) => `/decode/${id}`,
  DECODE_STREAM: (id: string) => `/decode/${id}/stream`,
  SUBMIT_FEEDBACK: (id: string) => `/feedback/${id}`,
  FEEDBACK_HISTORY: (id: string) => `/feedback/${id}/history`,
};

// Demo mode
export const DEMO_MODE = true;

export const DEMO_USER: UserProfile = {
  user_id: "demo-001",
  display_name: "Demo User",
  vision_impairment_hint: "none",
  speech_impairment_hint: "dysarthria",
  calibration_count: 2,
  avg_whisper_confidence: 0.38,
  modality_weights: { audio: 0.55, lip: 0.45 },
  created_at: "2026-02-09T00:00:00Z",
  updated_at: "2026-02-10T00:00:00Z",
};
