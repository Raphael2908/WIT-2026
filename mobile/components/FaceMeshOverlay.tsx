import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

interface LipPoint {
  index: number;
  x: number;
  y: number;
  z: number;
}

interface FaceMeshOverlayProps {
  landmarks: LipPoint[] | null;
  containerWidth: number;
  containerHeight: number;
  isTracking: boolean;
}

export default function FaceMeshOverlay({
  landmarks,
  containerWidth,
  containerHeight,
  isTracking,
}: FaceMeshOverlayProps) {
  if (!landmarks) {
    return (
      <Svg
        width={containerWidth}
        height={containerHeight}
        style={styles.overlay}
      />
    );
  }

  const color = isTracking ? "#22C55E" : "#EF4444";

  return (
    <Svg width={containerWidth} height={containerHeight} style={styles.overlay}>
      {/* Draw lines connecting consecutive landmarks and close the loop */}
      {landmarks.map((landmark, index) => {
        const nextLandmark = landmarks[(index + 1) % landmarks.length];
        return (
          <Line
            key={`line-${landmark.index}-${nextLandmark.index}`}
            x1={landmark.x * containerWidth}
            y1={landmark.y * containerHeight}
            x2={nextLandmark.x * containerWidth}
            y2={nextLandmark.y * containerHeight}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.6}
          />
        );
      })}

      {/* Draw circles at each landmark position */}
      {landmarks.map((landmark) => (
        <Circle
          key={`circle-${landmark.index}`}
          cx={landmark.x * containerWidth}
          cy={landmark.y * containerHeight}
          r={3}
          fill={color}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
