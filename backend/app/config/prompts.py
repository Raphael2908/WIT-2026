CALIBRATION_PROMPT = """You are analyzing speech transcription patterns for a user with speech impairment.

Compare the expected sentences with the actual transcriptions to identify:
1. Phoneme patterns (which sounds are consistently dropped, substituted, or distorted)
2. Common word substitutions
3. Overall speech pattern characteristics

Expected sentences:
{expected_sentences}

Actual transcriptions:
{actual_transcriptions}

Based on the error patterns, categorize the user into one of these categories:
- adaptive_speech_decoding: Stable patterns, predictable substitutions (e.g., consistently drops /k/ sounds)
- multimodal_input_fusion: Severe distortion requiring multi-input integration, highly variable output
- rehabilitation_mode: Variable quality, shows improvement potential, needs progress tracking

Respond with a JSON object:
{{
    "category": "adaptive_speech_decoding | multimodal_input_fusion | rehabilitation_mode",
    "confidence": 0.0-1.0,
    "phoneme_patterns": {{"phoneme": "pattern_description"}},
    "common_substitutions": {{"expected_word": "actual_transcription"}},
    "analysis": "Brief explanation of categorization"
}}"""

RECOGNITION_PROMPT = """You are correcting speech transcription for a user with known speech patterns.

User's speech profile:
- Category: {category}
- Known phoneme patterns: {phoneme_patterns}
- Common substitutions: {common_substitutions}

Raw transcription from speech recognition:
"{transcription}"

Additional context:
- Lip reading text (if available): {lip_reading_text}
- Gesture signal: {gesture_signal}

Your task:
1. Apply the user's known patterns to decode their intended message
2. Consider the lip reading and gesture context
3. Do NOT add new content - only decode what the user intended to say
4. Preserve the user's agency - you are a decoder, not a generator

Respond with a JSON object:
{{
    "corrected_text": "The decoded intended message",
    "confidence": 0.0-1.0,
    "corrections_applied": ["list of specific corrections made"],
    "needs_review": true/false
}}"""

CORRECTION_LEARNING_PROMPT = """You are analyzing a user correction to learn new speech patterns.

Original transcription: "{original_text}"
User's correction: "{corrected_text}"

Current user profile:
- Category: {category}
- Known phoneme patterns: {phoneme_patterns}
- Known substitutions: {common_substitutions}

Analyze the difference between original and corrected text to identify:
1. New phoneme patterns not in the current profile
2. New word substitutions
3. Any patterns that should be updated or refined

Respond with a JSON object:
{{
    "new_phoneme_patterns": {{"phoneme": "pattern_description"}},
    "new_substitutions": {{"original": "corrected"}},
    "updated_patterns": {{"pattern_key": "new_description"}},
    "patterns_learned": 0-N,
    "analysis": "Brief explanation of what was learned"
}}"""
