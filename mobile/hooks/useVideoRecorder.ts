import { useState, useRef, useCallback } from "react";
import { CameraView } from "expo-camera";

interface UseVideoRecorderReturn {
  cameraRef: React.RefObject<CameraView | null>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  isRecording: boolean;
}

export function useVideoRecorder(): UseVideoRecorderReturn {
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingPromiseRef = useRef<Promise<{ uri: string }> | null>(null);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    // recordAsync returns a promise that resolves when stopRecording is called
    recordingPromiseRef.current = cameraRef.current.recordAsync(
      {}
    ) as Promise<{ uri: string }>;
  }, [isRecording]);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (!cameraRef.current || !recordingPromiseRef.current) {
      throw new Error("No active video recording");
    }

    cameraRef.current.stopRecording();
    const result = await recordingPromiseRef.current;
    recordingPromiseRef.current = null;
    setIsRecording(false);

    return result.uri;
  }, []);

  return {
    cameraRef,
    startRecording,
    stopRecording,
    isRecording,
  };
}
