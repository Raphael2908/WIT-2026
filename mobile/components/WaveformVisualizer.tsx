import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

interface WaveformVisualizerProps {
  audioLevel: number;
  isActive: boolean;
}

const BAR_COUNT = 20;
const INACTIVE_HEIGHT = 4;
const MAX_HEIGHT = 40;

export default function WaveformVisualizer({
  audioLevel,
  isActive,
}: WaveformVisualizerProps) {
  const [barHeights, setBarHeights] = useState<number[]>(
    Array(BAR_COUNT).fill(INACTIVE_HEIGHT)
  );

  useEffect(() => {
    if (!isActive) {
      setBarHeights(Array(BAR_COUNT).fill(INACTIVE_HEIGHT));
      return;
    }

    const interval = setInterval(() => {
      setBarHeights(
        Array(BAR_COUNT)
          .fill(0)
          .map(() => audioLevel * MAX_HEIGHT + Math.random() * 10)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [isActive, audioLevel]);

  return (
    <View style={styles.container}>
      {barHeights.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: Math.max(height, INACTIVE_HEIGHT),
              backgroundColor: isActive ? "#4A90D9" : "#D1D5DB",
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    paddingVertical: 8,
  },
  bar: {
    width: 6,
    marginHorizontal: 2,
    borderRadius: 3,
  },
});
