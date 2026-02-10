import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../utils/theme";

interface CalibrationProgressProps {
  current: number;
  total: number;
  results: { match: boolean }[];
}

export default function CalibrationProgress({
  current,
  total,
  results,
}: CalibrationProgressProps) {
  const getSegmentColor = (index: number): string => {
    if (index < results.length) {
      return results[index].match ? COLORS.success : COLORS.error;
    }
    if (index === current) {
      return COLORS.accent;
    }
    return COLORS.inactive;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Phrase {current + 1} of {total}
      </Text>
      <View style={styles.progressBar}>
        {Array.from({ length: total }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              { backgroundColor: getSegmentColor(index) },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    color: COLORS.textSecondary,
  },
  progressBar: {
    flexDirection: "row",
    height: 8,
    gap: 2,
  },
  segment: {
    flex: 1,
    height: 8,
    marginHorizontal: 1,
    borderRadius: 4,
  },
});
