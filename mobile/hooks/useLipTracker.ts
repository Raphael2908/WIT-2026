import { useRef, useState, useEffect } from "react";
import { LipFrame, LipPoint, LipShape } from "../types";
import { computeMouthMetrics } from "../utils/landmarks";
import { classifyShape, framesToShapeSequence } from "../utils/shapes";

export function useLipTracker(
  lipLandmarks: LipPoint[] | null,
  allLandmarks: { x: number; y: number; z: number }[] | null
): {
  startTracking: () => void;
  stopTracking: () => LipFrame[];
  getShapeSequence: () => string;
  isTracking: boolean;
  currentShape: LipShape | null;
  currentMetrics: { openness: number; width: number; rounding: number } | null;
  frameCount: number;
} {
  const frameBufferRef = useRef<LipFrame[]>([]);

  const [isTracking, setIsTracking] = useState(false);
  const [currentShape, setCurrentShape] = useState<LipShape | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<{
    openness: number;
    width: number;
    rounding: number;
  } | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    if (!lipLandmarks || !allLandmarks) {
      return;
    }

    // Compute mouth metrics from all landmarks
    const metrics = computeMouthMetrics(allLandmarks);

    // Classify the current lip shape
    const shape = classifyShape(metrics.openness, metrics.width, metrics.rounding);

    // Update current state
    setCurrentShape(shape);
    setCurrentMetrics(metrics);

    // If tracking, append frame to buffer
    if (isTracking) {
      const frame: LipFrame = {
        timestamp_ms: Date.now(),
        landmarks: lipLandmarks,
        openness: metrics.openness,
        width: metrics.width,
        rounding: metrics.rounding,
      };

      frameBufferRef.current.push(frame);
      setFrameCount((prev) => prev + 1);
    }
  }, [lipLandmarks, allLandmarks, isTracking]);

  const startTracking = () => {
    frameBufferRef.current = [];
    setIsTracking(true);
    setFrameCount(0);
  };

  const stopTracking = (): LipFrame[] => {
    setIsTracking(false);
    const capturedFrames = [...frameBufferRef.current];
    frameBufferRef.current = [];
    return capturedFrames;
  };

  const getShapeSequence = (): string => {
    return framesToShapeSequence(frameBufferRef.current);
  };

  return {
    startTracking,
    stopTracking,
    getShapeSequence,
    isTracking,
    currentShape,
    currentMetrics,
    frameCount,
  };
}
