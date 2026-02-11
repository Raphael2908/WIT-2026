# TTS Fix: Remove audio session conflict

## Problem
Text-to-speech worked for soundboard/quick phrases but was silent after decoding speech. The decoded speech path used `speakTextAsync` from `services/tts.ts`, which called `Audio.setAudioModeAsync()` from `expo-av` immediately before `Speech.speak()` from `expo-speech`. Both libraries manage the same iOS AVAudioSession, and the `expo-av` call was interfering with speech synthesis, silencing output.

## What changed

### `services/tts.ts`
- Removed the `ensurePlaybackModeAsync` function, which called `Audio.setAudioModeAsync()` from `expo-av` before every TTS call.
- Removed the `expo-av` import entirely since it is no longer used.
- Removed the iOS-specific `useApplicationAudioSession: false` override that was a workaround for the audio session conflict.
- The function now simply calls `Speech.stop()` followed by `Speech.speak()`, matching the pattern already used successfully by the soundboard.

## Why this is safe
- The audio mode reset (from recording back to playback) is already handled in `useAudioRecorder.ts` when recording stops, so the `expo-av` call in `tts.ts` was redundant.
- Quick phrases and the soundboard were already using `Speech.speak()` directly without any `expo-av` audio mode setup, confirming this pattern works.
