import { LipShape, LipFrame } from "../types";
import { SHAPE_THRESHOLDS } from "./constants";

/**
 * Classifies a lip shape based on openness, width, and rounding metrics.
 *
 * @param openness - Vertical distance between upper and lower lips (0-1)
 * @param width - Horizontal distance between mouth corners (0-1)
 * @param rounding - Ratio of openness to width
 * @returns LipShape classification
 */
export function classifyShape(
  openness: number,
  width: number,
  rounding: number
): LipShape {
  // Check in order per specification
  if (openness < SHAPE_THRESHOLDS.CLOSED_MAX_OPEN) {
    return "CLOSED";
  }

  if (openness < SHAPE_THRESHOLDS.BARELY_OPEN_MAX) {
    return "BARELY_OPEN";
  }

  if (width < SHAPE_THRESHOLDS.PURSED_MAX_WIDTH && rounding >= SHAPE_THRESHOLDS.PURSED_MIN_ROUND) {
    return "PURSED";
  }

  if (width < SHAPE_THRESHOLDS.NARROW_MAX_WIDTH) {
    return "NARROW";
  }

  if (width >= SHAPE_THRESHOLDS.WIDE_SPREAD_MIN_WIDTH) {
    return "WIDE_SPREAD";
  }

  if (width >= SHAPE_THRESHOLDS.OPEN_SPREAD_MIN_WIDTH) {
    return "OPEN_SPREAD";
  }

  if (rounding >= SHAPE_THRESHOLDS.OPEN_ROUND_MIN_ROUND) {
    return "OPEN_ROUND";
  }

  return "NEUTRAL";
}

/**
 * Converts an array of LipFrames into a compressed shape sequence string.
 * Consecutive identical shapes are collapsed into segments with duration.
 *
 * @param frames - Array of LipFrame objects with metrics
 * @returns Formatted string like "CLOSED(80ms) → OPEN_ROUND(200ms) → CLOSED(50ms)"
 */
export function framesToShapeSequence(frames: LipFrame[]): string {
  if (frames.length === 0) {
    return "";
  }

  if (frames.length === 1) {
    const shape = classifyShape(frames[0].openness, frames[0].width, frames[0].rounding);
    return `${shape}(0ms)`;
  }

  interface ShapeSegment {
    shape: LipShape;
    startTimestamp: number;
    endTimestamp: number;
  }

  const segments: ShapeSegment[] = [];
  let currentShape = classifyShape(frames[0].openness, frames[0].width, frames[0].rounding);
  let segmentStart = frames[0].timestamp_ms;

  for (let i = 1; i < frames.length; i++) {
    const shape = classifyShape(frames[i].openness, frames[i].width, frames[i].rounding);

    if (shape !== currentShape) {
      // Segment ended, save it
      segments.push({
        shape: currentShape,
        startTimestamp: segmentStart,
        endTimestamp: frames[i - 1].timestamp_ms,
      });

      // Start new segment
      currentShape = shape;
      segmentStart = frames[i].timestamp_ms;
    }
  }

  // Add final segment
  segments.push({
    shape: currentShape,
    startTimestamp: segmentStart,
    endTimestamp: frames[frames.length - 1].timestamp_ms,
  });

  // Format segments as string
  const formattedSegments = segments.map((segment) => {
    const duration = segment.endTimestamp - segment.startTimestamp;
    return `${segment.shape}(${duration}ms)`;
  });

  return formattedSegments.join(" → ");
}
