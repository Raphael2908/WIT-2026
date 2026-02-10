import { useRef, useState, useEffect } from "react";
import { LipPoint } from "../types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const LIP_FRAME_ENDPOINT = `${API_BASE_URL}/api/lips/frame`;
const FACE_LANDMARK_COUNT = 468;
const CAPTURE_INTERVAL_MS = 260;
const CAPTURE_QUALITY = 0.35;

interface LipFrameResponse {
  timestamp_ms: number;
  landmarks: LipPoint[];
  openness: number;
  width: number;
  rounding: number;
  shape: string;
}

function toSparseFaceLandmarks(points: LipPoint[]): { x: number; y: number; z: number }[] {
  const sparse = Array.from({ length: FACE_LANDMARK_COUNT }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));
  for (const point of points) {
    if (point.index >= 0 && point.index < FACE_LANDMARK_COUNT) {
      sparse[point.index] = { x: point.x, y: point.y, z: point.z };
    }
  }
  return sparse;
}

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraReadyRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lastErrorLogRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(Date.now());

  const [landmarks, setLandmarks] = useState<{ x: number; y: number; z: number }[] | null>(null);
  const [lipLandmarks, setLipLandmarks] = useState<LipPoint[] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [fps, setFps] = useState(0);

  const captureAndAnalyzeFrame = async () => {
    if (isProcessingRef.current) {
      return;
    }
    if (!cameraReadyRef.current) {
      return;
    }
    if (!cameraRef.current?.takePictureAsync) {
      return;
    }

    isProcessingRef.current = true;
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: CAPTURE_QUALITY,
        base64: false,
      });
      if (!picture?.uri) {
        setIsTracking(false);
        return;
      }

      const formData = new FormData();
      formData.append("frame", {
        uri: picture.uri,
        name: "frame.jpg",
        type: "image/jpeg",
      } as any);

      const response = await fetch(LIP_FRAME_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setIsTracking(false);
        return;
      }

      const analyzed = (await response.json()) as LipFrameResponse;
      const points = analyzed.landmarks || [];
      if (points.length === 0) {
        setIsTracking(false);
        return;
      }

      setLipLandmarks(points);
      setLandmarks(toSparseFaceLandmarks(points));
      setIsTracking(true);

      frameCountRef.current++;
      const now = Date.now();
      const elapsed = now - lastFpsCheckRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current / elapsed) * 1000));
        frameCountRef.current = 0;
        lastFpsCheckRef.current = now;
      }
    } catch (error) {
      setIsTracking(false);
      if (__DEV__) {
        const now = Date.now();
        if (now - lastErrorLogRef.current > 3000) {
          console.warn("[FaceMesh] Backend MediaPipe frame analyze failed:", error);
          lastErrorLogRef.current = now;
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  };

  const startCamera = () => {
    if (intervalRef.current) return;

    setIsTracking(false);
    frameCountRef.current = 0;
    lastFpsCheckRef.current = Date.now();

    // Poll backend MediaPipe endpoint with sampled camera frames.
    intervalRef.current = setInterval(() => {
      void captureAndAnalyzeFrame();
    }, CAPTURE_INTERVAL_MS);
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    setLandmarks(null);
    setLipLandmarks(null);
    setFps(0);
    isProcessingRef.current = false;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    landmarks,
    lipLandmarks,
    isTracking,
    fps,
    cameraRef,
    onCameraReady,
    onCameraMountError,
    startCamera,
    stopCamera,
  };
}
