import * as Speech from "expo-speech";

type SpeakOptions = Parameters<typeof Speech.speak>[1];

export async function speakTextAsync(text: string, options: SpeakOptions = {}): Promise<void> {
  const content = text.trim();
  if (!content) {
    return;
  }

  await Speech.stop();
  Speech.speak(content, options);
}

export async function stopSpeechAsync(): Promise<void> {
  await Speech.stop();
}
