import React from "react";
import { View, Text, StyleSheet } from "react-native";

type LipShape =
  | "CLOSED"
  | "BARELY_OPEN"
  | "OPEN_SPREAD"
  | "OPEN_ROUND"
  | "WIDE_SPREAD"
  | "PURSED"
  | "NARROW"
  | "NEUTRAL";

interface ShapeSequenceDebugProps {
  currentShape: LipShape | null;
  metrics: { openness: number; width: number; rounding: number } | null;
}

export default function ShapeSequenceDebug({
  currentShape,
  metrics,
}: ShapeSequenceDebugProps) {
  const getShapeColor = (shape: LipShape | null): string => {
    if (!shape) return "#9CA3AF";

    switch (shape) {
      case "CLOSED":
        return "#9CA3AF";
      case "OPEN_ROUND":
      case "OPEN_SPREAD":
      case "WIDE_SPREAD":
        return "#22C55E";
      case "PURSED":
      case "NARROW":
        return "#F59E0B";
      case "BARELY_OPEN":
      case "NEUTRAL":
        return "#60A5FA";
      default:
        return "#9CA3AF";
    }
  };

  const shapeColor = getShapeColor(currentShape);

  return (
    <View style={styles.container}>
      {currentShape ? (
        <>
          <Text style={[styles.shapeLabel, { color: shapeColor }]}>
            {currentShape}
          </Text>
          {metrics && (
            <Text style={styles.metrics}>
              O: {metrics.openness.toFixed(3)} W: {metrics.width.toFixed(3)} R:{" "}
              {metrics.rounding.toFixed(3)}
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.noFace}>No face detected</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1F2937",
    padding: 8,
    borderRadius: 8,
  },
  shapeLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metrics: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  noFace: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
