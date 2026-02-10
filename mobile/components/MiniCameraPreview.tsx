import React from "react";
import { View, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import FaceMeshOverlay from "./FaceMeshOverlay";

interface LipPoint {
  index: number;
  x: number;
  y: number;
  z: number;
}

interface MiniCameraPreviewProps {
  showMesh: boolean;
  position: "top-right" | "bottom-left";
  hidden: boolean;
  lipLandmarks: LipPoint[] | null;
  isTracking: boolean;
}

export default function MiniCameraPreview({
  showMesh,
  position,
  hidden,
  lipLandmarks,
  isTracking,
}: MiniCameraPreviewProps) {
  // If hidden, don't render the view at all.
  // Note: Camera data flow happens through the useFaceMesh hook, not through this component.
  // The camera continues to run for lip tracking even when this preview is hidden.
  if (hidden) {
    return null;
  }

  const positionStyle =
    position === "top-right"
      ? { top: 10, right: 10 }
      : { bottom: 10, left: 10 };

  return (
    <View style={[styles.container, positionStyle]}>
      <CameraView style={styles.camera} facing="front" />
      {showMesh && (
        <FaceMeshOverlay
          landmarks={lipLandmarks}
          containerWidth={120}
          containerHeight={160}
          isTracking={isTracking}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  camera: {
    width: "100%",
    height: "100%",
  },
});
