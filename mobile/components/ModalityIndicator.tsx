import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../utils/theme";

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
        <View style={[styles.dot, { backgroundColor: audioActive ? COLORS.success : COLORS.inactive }]} />
        <Text style={[styles.text, { color: audioActive ? COLORS.text : COLORS.textSecondary }]}>
          Audio [{weights.audio.toFixed(2)}]
        </Text>
      </View>
      <View style={styles.badge}>
        <View style={[styles.dot, { backgroundColor: lipActive ? COLORS.success : COLORS.inactive }]} />
        <Text style={[styles.text, { color: lipActive ? COLORS.text : COLORS.textSecondary }]}>
          Lips [{weights.lip.toFixed(2)}]
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 16,
  },
});
