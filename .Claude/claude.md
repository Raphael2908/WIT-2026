# Project Overview

Multimodal speech accessibility platform that uses Whisper for transcription, Claude for pattern analysis and correction, and TTS for audio output. System learns individual speech patterns during calibration and applies personalized corrections during real-time recognition.

## Target demographic
- Speech impairment 
- Speech impairment + deaf
- Speech impairment + visually_impairment

# Tech Stack

Framework: FastAPI (Python 3.10+)
Speech-to-Text: OpenAI Whisper API
AI Analysis: Anthropic Claude API (claude-sonnet-4-5-20250929)
Text-to-Speech: Azure TTS (primary), Google TTS (fallback), Native TTS (backup)
Storage: Local text files
Audio Processing: pydub, numpy
Server: uvicorn

# Three Impairment Categories

adaptive_speech_decoding - Stable patterns, predictable substitutions
multimodal_input_fusion - Severe distortion, requires multi-input integration
rehabilitation_mode - Variable quality, needs progress tracking

# File Structure
backend/
├── main.py
├── requirements.txt
├── .env
├── .env.example
├── README.md
│
├── app/
│   ├── api/
│   │   ├── calibration.py
│   │   ├── recognition.py
│   │   └── correction.py
│   │
│   ├── services/
│   │   ├── whisper_service.py
│   │   ├── claude_service.py
│   │   ├── tts_service.py
│   │   └── fusion_service.py
│   │
│   ├── models/
│   │   ├── requests.py
│   │   ├── responses.py
│   │   └── user_profile.py
│   │
│   ├── storage/
│   │   └── file_manager.py
│   │
│   ├── config/
│   │   ├── settings.py
│   │   └── prompts.py
│   │
│   └── utils/
│       ├── audio_utils.py
│       └── text_utils.py
│
├── users/
│   └── {user_id}/
│       ├── profile.txt
│       ├── corrections.txt
│       └── calibration_audio.wav
│
├── static/
│   └── audio/
│       └── {user_id}/
│           └── output_*.wav

# File Description
## Root Level

- main.py - FastAPI app initialization, CORS setup, - route registration
- requirements.txt - Python dependencies

## app/api/
- calibration.py - POST /api/calibrate endpoint, handles user onboarding
- recognition.py - POST /api/recognize endpoint, handles real-time speech recognition
- correction.py - POST /api/correct endpoint, logs user corrections

## app/services/
- whisper_service.py - Whisper API integration, audio transcription
- claude_service.py - Claude API integration, pattern analysis and text correction
- tts_service.py - Text-to-speech generation with fallback chain
- fusion_service.py - Multimodal input fusion logic (audio + lip reading + gesture)

## app/models/
- requests.py - Pydantic request models for all endpoints
- responses.py - Pydantic response models for all endpoints
- user_profile.py - User profile data structure

## app/storage/
- file_manager.py - Read/write user profiles and corrections to text files

## app/config/
- settings.py - Application settings loaded from environment variables
- prompts.py - Claude prompt templates for calibration, recognition, correction

## app/utils/
- audio_utils.py - Audio format conversion, base64 encoding/decoding
- text_utils.py - Text comparison, pattern extraction

## users/{user_id}/
- profile.txt - User's category, phoneme patterns, substitutions, weights
- corrections.txt - CSV log of user corrections
- calibration_audio.wav - Backup of onboarding audio

## static/audio/{user_id}/
- output_*.wav - Generated TTS audio files

# API endpoints
## POST /api/calibrate
Purpose: User onboarding, determines impairment category
Process:

Receive audio + expected sentences
Whisper transcribes audio
Compare actual vs expected
Claude analyzes patterns, categorizes user
Save profile to users/{user_id}/profile.txt

Request:
{
  "user_id": "string",
  "audio_file": "base64 WAV",
  "expected_sentences": ["string"] (optional)
}
Response:
{
  "status": "success",
  "category": "adaptive_speech_decoding | multimodal_input_fusion | rehabilitation_mode",
  "confidence": 0.87,
  "phoneme_patterns": {"/k/": "often_dropped"},
  "message": "Calibration complete"
}
Predetermined Sentences:

The quick brown fox jumps over the lazy dog
I need help with my medication
Can you please repeat that
What time is the appointment
I would like a glass of water

## POST /api/recognize
Purpose: Real-time speech recognition with personalized correction
Process:

Load user profile
Whisper transcribes audio
Fuse audio + lip reading + gesture
Claude corrects using user patterns
Generate TTS audio
Return corrected text + audio URL

Request:
{
  "user_id": "string",
  "audio_chunk": "base64 WAV",
  "lip_reading_text": "string (optional)",
  "gesture_signal": "CONFIRM | NEGATE | PUNCTUATE | null"
}
Response:
{
  "text": "I need help",
  "audio_url": "/audio/user_123/output_12345.wav",
  "confidence": 0.92,
  "needs_review": false,
  "sources_used": ["audio", "lip_reading"],
  "category": "adaptive_speech_decoding"
}

## POST /api/correct
Purpose: Learn from user corrections
Process:

Claude analyzes original vs corrected text
Extract correction patterns
Update user profile
Log to corrections.txt

Request:
{
  "user_id": "string",
  "original_text": "I ned help",
  "corrected_text": "I need help"
}
Response:
{
  "status": "success",
  "patterns_learned": 1,
  "message": "Correction logged"
}

# Data Flow
## Calibration Flow
User speaks → Audio sent to Whisper → Compare with expected sentences → Claude analyzes patterns → Determines category → Saves profile

## Recognition Flow
User speaks → Audio to Whisper → Fuse with lip reading + gesture → Claude corrects using profile → Generate TTS → Return text + audio

## Correction Flow
User corrects text → Claude analyzes error → Extracts patterns → Updates profile → Logs correction

# Claude's Role
What Claude Does:

Analyzes transcription patterns (not raw audio)
Categorizes impairment type from error patterns
Generates personalized correction rules
Applies user-specific patterns to correct text
Learns from user corrections

What Claude Doesn't Do:

Process raw audio (Whisper's job)
Generate new content (only decodes user intent)
Answer questions for user (maintains user agency)

# Multimodal Fusion
Inputs:

Audio transcription (from Whisper) - confidence 0.0-1.0
Lip reading text (from frontend black box) - optional
Gesture signal (CONFIRM/NEGATE/PUNCTUATE) - optional

## Algorithm:

Calculate weighted confidence scores using user's modality weights
Select primary source (highest weighted confidence)
Apply gesture overrides
Send to Claude for final correction

## Category-Specific Weights:

Adaptive Speech Decoding: audio=0.7, visual=0.8, gesture=0.5
Multimodal Input Fusion: audio=0.5, visual=0.9, gesture=0.7
Rehabilitation Mode: audio=0.8, visual=0.6, gesture=0.5

# User Profile Structure
user_id: user_123
category: adaptive_speech_decoding
confidence: 0.87
calibration_date: 2025-02-10T14:30:00Z

phoneme_patterns:
  /k/: often_dropped
  /d/: often_dropped_word_final

common_substitutions:
  quick: quik
  help: hep
  need: nee

weights:
  audio: 0.7
  visual: 0.8
  gesture: 0.5

confidence_threshold: 0.7
last_updated: 2025-02-10T14:30:00Z