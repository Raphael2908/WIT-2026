import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

type SpeakOptions = Parameters<typeof Speech.speak>[1];

let didConfigurePlaybackMode = false;

async function ensurePlaybackModeAsync(): Promise<void> {
  if (didConfigurePlaybackMode) {
    return;
  }

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    didConfigurePlaybackMode = true;
  } catch (error) {
    console.warn("[TTS] Failed to configure audio mode for playback:", error);
  }
}

export async function speakTextAsync(text: string, options: SpeakOptions = {}): Promise<void> {
  const content = text.trim();
  if (!content) {
    return;
  }

  await ensurePlaybackModeAsync();
  await Speech.stop();

  Speech.speak(content, {
    ...options,
    ...(Platform.OS === "ios" ? { useApplicationAudioSession: false } : {}),
  });
}

export async function stopSpeechAsync(): Promise<void> {
  await Speech.stop();
}
