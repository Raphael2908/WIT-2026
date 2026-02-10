import React from "react";
import { StyleSheet } from "react-native";
import { CameraView } from "expo-camera";

interface MiniCameraPreviewProps {
  cameraRef: React.RefObject<CameraView | null>;
}

export default function MiniCameraPreview({ cameraRef }: MiniCameraPreviewProps) {
  return (
    <CameraView
      ref={cameraRef}
      style={styles.hiddenCamera}
      facing="front"
      mode="video"
    />
  );
}

const styles = StyleSheet.create({
  hiddenCamera: {
    width: 1,
    height: 1,
    opacity: 0,
    position: "absolute",
  },
});
