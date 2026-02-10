import type { UserProfile } from "../types";

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

// Default AAC phrases by category
export const DEFAULT_PHRASES: Record<string, string[]> = {
  essentials: ["Yes", "No", "Maybe", "Please", "Thank you", "Sorry", "Help"],
  greetings: ["Hello", "Hi", "Good morning", "Goodbye", "See you later", "How are you?"],
  needs: [
    "I need water", "I need help", "I'm hungry", "I'm tired",
    "I need a break", "I'm in pain", "I need the bathroom",
  ],
  responses: [
    "I agree", "I don't agree", "I don't know", "Can you repeat that?",
    "Give me a moment", "I'm thinking", "That's fine",
  ],
  emergency: [
    "I need help now", "Call someone", "I'm not okay", "I need my medication",
  ],
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
