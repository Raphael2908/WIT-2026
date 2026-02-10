import { AUDIO_CONFIG } from './constants';

/**
 * Converts dB metering value to normalized 0-1 range.
 * @param dB - Decibel value (typically from -60 to 0)
 * @returns Normalized level from 0 to 1
 */
export function normalizeDbToLevel(dB: number): number {
  return Math.max(0, Math.min(1, (dB + 60) / 60));
}

/**
 * Calculates RMS (Root Mean Square) level from audio samples.
 * @param samples - Array of audio sample values
 * @returns RMS level
 */
export function calculateRMS(samples: number[]): number {
  if (samples.length === 0) {
    return 0;
  }

  const sumOfSquares = samples.reduce((sum, sample) => {
    return sum + sample * sample;
  }, 0);

  const meanSquare = sumOfSquares / samples.length;
  return Math.sqrt(meanSquare);
}

/**
 * Determines if audio level is below silence threshold.
 * @param rmsLevel - RMS level to check
 * @param threshold - Optional threshold override (defaults to AUDIO_CONFIG.SILENCE_THRESHOLD)
 * @returns True if audio is considered silent
 */
export function isSilent(rmsLevel: number, threshold?: number): boolean {
  const actualThreshold = threshold !== undefined ? threshold : AUDIO_CONFIG.SILENCE_THRESHOLD;
  return rmsLevel < actualThreshold;
}

/**
 * Calculates the size in bytes of an audio chunk based on configuration.
 * @returns Number of bytes per audio chunk
 */
export function getChunkSizeBytes(): number {
  const { SAMPLE_RATE, BIT_DEPTH, CHANNELS, CHUNK_DURATION_MS } = AUDIO_CONFIG;
  const bytesPerSample = BIT_DEPTH / 8;
  const durationSeconds = CHUNK_DURATION_MS / 1000;
  return Math.floor(SAMPLE_RATE * bytesPerSample * CHANNELS * durationSeconds);
}

/**
 * Encodes Uint8Array to base64 string.
 * Works in React Native environment.
 * @param data - Uint8Array to encode
 * @returns Base64 encoded string
 */
export function encodeToBase64(data: Uint8Array): string {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  while (i < data.length) {
    const byte1 = data[i++];
    const byte2 = i < data.length ? data[i++] : 0;
    const byte3 = i < data.length ? data[i++] : 0;

    const encoded1 = byte1 >> 2;
    const encoded2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
    const encoded3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
    const encoded4 = byte3 & 0x3f;

    result += base64Chars[encoded1];
    result += base64Chars[encoded2];
    result += i - 1 < data.length ? base64Chars[encoded3] : '=';
    result += i < data.length ? base64Chars[encoded4] : '=';
  }

  return result;
}
