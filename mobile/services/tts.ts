import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

type SpeakOptions = Parameters<typeof Speech.speak>[1];

// Minimal valid WAV: 44-byte header + 2 bytes of 16-bit mono silence at 44100Hz
const SILENCE_B64 =
  "UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAA";

let silenceUri: string | null = null;

/**
 * Force iOS audio route to the main loudspeaker.
 *
 * After recording, iOS AVAudioSessionCategoryPlayAndRecord defaults output to
 * the earpiece. Switching the category to Playback (allowsRecordingIOS: false)
 * alone does NOT reset the route — iOS caches it. Playing a brief sound through
 * expo-av Audio.Sound forces iOS to re-evaluate the output route for the
 * current Playback category, which defaults to the loudspeaker.
 */
async function ensureSpeakerRoute(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    if (!silenceUri) {
      silenceUri = FileSystem.cacheDirectory + "speaker_route.wav";
      await FileSystem.writeAsStringAsync(silenceUri, SILENCE_B64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: silenceUri },
      { shouldPlay: true, volume: 0 }
    );
    await sound.unloadAsync();
  } catch {
    // Non-critical — TTS will still work, just possibly through earpiece
  }
}

export async function speakTextAsync(text: string, options: SpeakOptions = {}): Promise<void> {
  const content = text.trim();
  if (!content) {
    return;
  }

  await ensureSpeakerRoute();
  await Speech.stop();
  Speech.speak(content, options);
}

export async function stopSpeechAsync(): Promise<void> {
  await Speech.stop();
}
