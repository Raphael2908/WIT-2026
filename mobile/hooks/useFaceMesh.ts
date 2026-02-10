import { useRef, useState, useEffect } from "react";
import { LipPoint } from "../types";
import { extractLipLandmarks } from "../utils/landmarks";
import { LIP_INDICES } from "../utils/constants";

// TODO: Replace simulation with real MediaPipe Face Mesh when react-native-mediapipe becomes available

export function useFaceMesh(): {
  landmarks: { x: number; y: number; z: number }[] | null;
  lipLandmarks: LipPoint[] | null;
  isTracking: boolean;
  fps: number;
  cameraRef: React.RefObject<any>;
  startCamera: () => void;
  stopCamera: () => void;
} {
  const cameraRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(Date.now());

  const [landmarks, setLandmarks] = useState<{ x: number; y: number; z: number }[] | null>(null);
  const [lipLandmarks, setLipLandmarks] = useState<LipPoint[] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [fps, setFps] = useState(0);

  const generateSimulatedLandmarks = (): { x: number; y: number; z: number }[] => {
    const time = Date.now() / 1000;
    const allLandmarks: { x: number; y: number; z: number }[] = [];

    // Generate 468 face landmarks
    for (let i = 0; i < 468; i++) {
      const isLipLandmark = LIP_INDICES.includes(i);

      if (isLipLandmark) {
        // Simulate mouth movement for lip landmarks
        // Use sin waves to create realistic opening/closing patterns
        const baseOpenness = Math.sin(time * 2) * 0.15 + 0.5; // Oscillate between 0.35 and 0.65
        const baseWidth = Math.sin(time * 1.5) * 0.1 + 0.5; // Oscillate between 0.4 and 0.6

        // Position lip landmarks in the lower-center face region
        const lipIndex = LIP_INDICES.indexOf(i);
        const angle = (lipIndex / LIP_INDICES.length) * Math.PI * 2;

        // Create elliptical mouth shape — sized for visibility in the mini preview
        const centerX = 0.5;
        const centerY = 0.6;
        const radiusX = 0.25 * baseWidth;
        const radiusY = 0.15 * baseOpenness;

        const x = centerX + Math.cos(angle) * radiusX + (Math.random() - 0.5) * 0.01;
        const y = centerY + Math.sin(angle) * radiusY + (Math.random() - 0.5) * 0.01;
        const z = (Math.random() - 0.5) * 0.02;

        allLandmarks.push({ x, y, z });
      } else {
        // Generate generic face landmarks with reasonable positions
        const x = 0.2 + Math.random() * 0.6;
        const y = 0.1 + Math.random() * 0.8;
        const z = (Math.random() - 0.5) * 0.05;

        allLandmarks.push({ x, y, z });
      }
    }

    return allLandmarks;
  };

  const startCamera = () => {
    if (intervalRef.current) return;

    setIsTracking(true);
    frameCountRef.current = 0;
    lastFpsCheckRef.current = Date.now();

    // Simulate 30fps camera/face mesh processing
    intervalRef.current = setInterval(() => {
      const simulatedLandmarks = generateSimulatedLandmarks();
      setLandmarks(simulatedLandmarks);

      // Extract lip landmarks
      const extractedLipLandmarks = extractLipLandmarks(simulatedLandmarks, LIP_INDICES);
      setLipLandmarks(extractedLipLandmarks);

      // Update FPS counter
      frameCountRef.current++;
      const now = Date.now();
      const elapsed = now - lastFpsCheckRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current / elapsed) * 1000));
        frameCountRef.current = 0;
        lastFpsCheckRef.current = now;
      }
    }, 33); // ~30fps
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
    startCamera,
    stopCamera,
  };
}
