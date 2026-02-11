import React from "react";
import { View, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";

interface MiniCameraPreviewProps {
  position: "top-right" | "bottom-left";
  hidden: boolean;
  cameraRef?: React.RefObject<any>;
  onCameraReady?: () => void;
  onCameraMountError?: (error: unknown) => void;
}

export default function MiniCameraPreview({
  position,
  hidden,
  cameraRef,
  onCameraReady,
  onCameraMountError,
}: MiniCameraPreviewProps) {
  const positionStyle =
    position === "top-right"
      ? { top: 10, right: 10 }
      : { bottom: 10, left: 10 };

  return (
    <View style={[styles.container, positionStyle, hidden && styles.hiddenContainer]}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onCameraReady={onCameraReady}
        onMountError={onCameraMountError}
      />
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
  hiddenContainer: {
    width: 120,
    height: 160,
    opacity: 0,
    overflow: "hidden",
  },
});
