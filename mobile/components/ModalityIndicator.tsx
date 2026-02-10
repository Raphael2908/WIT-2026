import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface ModalityIndicatorProps {
  weights: { audio: number; lip: number };
  audioActive: boolean;
  lipActive: boolean;
}

export default function ModalityIndicator({
  weights,
  audioActive,
  lipActive,
}: ModalityIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={[styles.text, audioActive ? styles.active : styles.inactive]}>
          🔊 Audio [{weights.audio.toFixed(2)}]
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={[styles.text, lipActive ? styles.active : styles.inactive]}>
          👄 Lips [{weights.lip.toFixed(2)}]
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
  },
  active: {
    color: "#22C55E",
  },
  inactive: {
    color: "#9CA3AF",
  },
});
