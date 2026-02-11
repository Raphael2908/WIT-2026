import { useRef, useState } from "react";
import { LipPoint } from "../types";

/**
 * Thin camera lifecycle hook.
 *
 * MediaPipe frame analysis has been removed — the backend endpoint
 * (`/api/lips/frame`) is not available and the lip landmarks were not
 * consumed by the decode pipeline.  The hook now only manages the
 * camera ref and ready/error state so the mini-preview keeps working.
 */
export function useFaceMesh(): {
  landmarks: { x: number; y: number; z: number }[] | null;
  lipLandmarks: LipPoint[] | null;
  isTracking: boolean;
  fps: number;
  cameraRef: React.RefObject<any>;
  onCameraReady: () => void;
  onCameraMountError: (error: unknown) => void;
  startCamera: () => void;
  stopCamera: () => void;
} {
  const cameraRef = useRef<any>(null);
  const cameraReadyRef = useRef(false);

  const [isTracking] = useState(false);
  const [fps] = useState(0);

  const startCamera = () => {
    // Camera view is managed by expo-camera; nothing extra needed.
  };

  const stopCamera = () => {
    cameraReadyRef.current = false;
  };

  const onCameraReady = () => {
    cameraReadyRef.current = true;
  };

  const onCameraMountError = (error: unknown) => {
    cameraReadyRef.current = false;
    if (__DEV__) {
      console.warn("[FaceMesh] Camera mount error:", error);
    }
  };

  return {
    landmarks: null,
    lipLandmarks: null,
    isTracking,
    fps,
    cameraRef,
    onCameraReady,
    onCameraMountError,
    startCamera,
    stopCamera,
  };
}
