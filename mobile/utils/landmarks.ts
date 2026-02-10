/**
 * Landmark utility functions for face mesh processing.
 * Used by useLipTracker to extract and compute lip metrics.
 */

import { LipPoint } from "../types";
import {
  UPPER_LIP_CENTER,
  LOWER_LIP_CENTER,
  MOUTH_CORNERS,
} from "./constants";

/**
 * Calculate the midpoint between two 3D points.
 */
export function midpoint(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * Calculate 2D Euclidean distance between two points (using x, y only).
 */
export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate 3D Euclidean distance between two points.
 */
export function distance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Extract specific landmark points from the full face mesh.
 * Filters out any indices that are out of bounds.
 *
 * @param allLandmarks Full array of face mesh landmarks (468+ points)
 * @param indices Array of landmark indices to extract
 * @returns Array of LipPoint objects with { index, x, y, z }
 */
export function extractLipLandmarks(
  allLandmarks: { x: number; y: number; z: number }[],
  indices: number[]
): LipPoint[] {
  const lipPoints: LipPoint[] = [];

  for (const index of indices) {
    // Skip if index is out of bounds
    if (index < 0 || index >= allLandmarks.length) {
      continue;
    }

    const landmark = allLandmarks[index];
    lipPoints.push({
      index,
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
    });
  }

  return lipPoints;
}

/**
 * Compute mouth metrics from full face landmarks.
 * Used for lip shape classification.
 *
 * @param allLandmarks Full array of face mesh landmarks
 * @returns Object with openness, width, and rounding metrics
 */
export function computeMouthMetrics(
  allLandmarks: { x: number; y: number; z: number }[]
): { openness: number; width: number; rounding: number } {
  // Get upper lip center landmarks
  const upperLip1 = allLandmarks[UPPER_LIP_CENTER[0]];
  const upperLip2 = allLandmarks[UPPER_LIP_CENTER[1]];

  // Get lower lip center landmarks
  const lowerLip1 = allLandmarks[LOWER_LIP_CENTER[0]];
  const lowerLip2 = allLandmarks[LOWER_LIP_CENTER[1]];

  // Get mouth corner landmarks
  const leftCorner = allLandmarks[MOUTH_CORNERS[0]];
  const rightCorner = allLandmarks[MOUTH_CORNERS[1]];

  // Check if any landmarks are missing
  if (
    !upperLip1 ||
    !upperLip2 ||
    !lowerLip1 ||
    !lowerLip2 ||
    !leftCorner ||
    !rightCorner
  ) {
    // Return zero metrics if landmarks are missing
    return { openness: 0, width: 0, rounding: 0 };
  }

  // Calculate midpoints
  const upperMidpoint = midpoint(upperLip1, upperLip2);
  const lowerMidpoint = midpoint(lowerLip1, lowerLip2);

  // Calculate openness (vertical distance between upper and lower lip centers)
  const openness = distance(upperMidpoint, lowerMidpoint);

  // Calculate width (horizontal distance between mouth corners)
  const width = distance(leftCorner, rightCorner);

  // Calculate rounding ratio (avoid division by zero)
  const rounding = width > 0 ? openness / width : 0;

  return {
    openness,
    width,
    rounding,
  };
}
