// === User & Profile ===

export interface UserProfile {
  user_id: string;
  display_name: string;
  vision_impairment_hint: string | null;
  speech_impairment_hint: string | null;
  calibration_count: number;
  avg_whisper_confidence: number;
  modality_weights: ModalityWeights;
  created_at: string;
  updated_at: string;
}

export interface ModalityWeights {
  audio: number;
  lip: number;
}

// === Calibration ===

export interface CalibrationPhrase {
  phrase_id: string;
  text: string;
  difficulty: 1 | 2 | 3;
  phoneme_targets: string[];
}

export interface CalibrationResult {
  phrase_text: string;
  whisper_output: string;
  confidence: number;
  match: boolean;
  error_mapping_created: boolean;
  shape_sequence: string | null;
}

export interface CalibrationSummary {
  calibration_count: number;
  total_phrases: number;
  accurate_phrases: number;
  accuracy_pct: number;
  recommended_modalities: string[];
  avg_confidence: number;
}

// === Decode ===

export interface DecodeResult {
  decode_id: string;
  decoded_text: string;
  raw_whisper: string;
  whisper_confidence: number;
  lip_reading_used: boolean;
  modality_weights: ModalityWeights;
  lip_matches: LipMatch[];
  processing_time_ms: number;
}

export interface LipMatch {
  phrase_text: string;
  similarity: number;
}

export interface FeedbackPayload {
  decode_id: string;
  corrected_text: string | null;
  confirmed: boolean;
}

export interface FeedbackResult {
  profile_updated: boolean;
  total_mappings: number;
}

// === Lip Tracking ===

export interface LipFrame {
  timestamp_ms: number;
  landmarks: LipPoint[];
  openness: number;
  width: number;
  rounding: number;
}

export interface LipPoint {
  index: number;
  x: number;
  y: number;
  z: number;
}

export type LipShape =
  | "CLOSED"
  | "BARELY_OPEN"
  | "OPEN_SPREAD"
  | "OPEN_ROUND"
  | "WIDE_SPREAD"
  | "PURSED"
  | "NARROW"
  | "NEUTRAL";

// === WebSocket Protocol ===

export type WSClientMessage =
  | { type: "audio"; data: string }
  | { type: "landmarks"; data: LipFrame }
  | { type: "end_utterance" };

export type WSServerMessage =
  | { type: "partial"; text: string }
  | { type: "final"; result: DecodeResult }
  | { type: "error"; message: string };

// === History ===

export interface DecodeHistoryEntry {
  decode_id: string;
  decoded_text: string;
  raw_whisper: string;
  whisper_confidence: number;
  lip_used: boolean;
  feedback_status: "pending" | "confirmed" | "corrected";
  corrected_text: string | null;
  created_at: string;
}
