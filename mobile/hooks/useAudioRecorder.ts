import { useState, useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  isRecording: boolean;
  durationMs: number;
  audioLevel: number;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const permissionGrantedRef = useRef(false);

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status === "granted") {
          permissionGrantedRef.current = true;
        } else {
          setError("Audio permission not granted");
        }
      } catch (err) {
        setError("Failed to request audio permissions");
        console.error(err);
      }
    })();

    // Cleanup on unmount
    return () => {
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Ensure permission is granted
      if (!permissionGrantedRef.current) {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          setError("Audio permission not granted");
          return;
        }
        permissionGrantedRef.current = true;
      }

      // Clean up any stale recording from a previous failed attempt
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // Ignore — it may already be stopped
        }
        recordingRef.current = null;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording with metering enabled
      // Using HIGH_QUALITY preset as-is — the backend Whisper model handles resampling
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      recordingRef.current = recording;
      setIsRecording(true);

      // Poll metering and duration every 100ms
      meteringIntervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording) {
              setDurationMs(status.durationMillis);

              // Normalize dB metering to 0-1 scale
              const metering = status.metering || -160;
              const normalized = Math.max(0, Math.min(1, (metering + 60) / 60));
              setAudioLevel(normalized);
            }
          } catch {
            // Recording may have been stopped between interval ticks
          }
        }
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      console.error("startRecording error:", err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    try {
      if (!recordingRef.current) {
        throw new Error("No active recording");
      }

      // Clear metering interval
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
        meteringIntervalRef.current = null;
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (!uri) {
        throw new Error("Recording URI is null");
      }

      // Reset audio mode — explicitly preserve playsInSilentModeIOS so
      // subsequent TTS plays through the main loudspeaker, not the earpiece.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Log raw audio data
      if (__DEV__) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          console.log("[Audio] File URI:", uri);
          console.log("[Audio] File size:", fileInfo.exists ? (fileInfo as any).size : "unknown", "bytes");
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log("[Audio] Base64 length:", base64.length);
          console.log("[Audio] Base64 data (first 200 chars):", base64.substring(0, 200));
        } catch (logErr) {
          console.error("[Audio] Error reading file for logging:", logErr);
        }
      }

      // Reset state
      recordingRef.current = null;
      setIsRecording(false);
      setAudioLevel(0);
      setDurationMs(0);

      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop recording";
      setError(message);
      console.error("stopRecording error:", err);

      // Always clean up state on failure
      recordingRef.current = null;
      setIsRecording(false);
      setAudioLevel(0);
      throw err;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    durationMs,
    audioLevel,
    error,
  };
}
