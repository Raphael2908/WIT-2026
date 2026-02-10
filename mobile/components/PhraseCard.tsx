import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADII } from "../utils/theme";

interface PhraseCardProps {
  phrase: {
    phrase_id: string;
    text: string;
    difficulty: 1 | 2 | 3;
    phoneme_targets: string[];
  };
  status: "idle" | "recording" | "done";
}

export default function PhraseCard({ phrase, status }: PhraseCardProps) {
  const getBackgroundColor = () => {
    switch (status) {
      case "idle":
        return COLORS.surface;
      case "recording":
        return COLORS.surfaceAlt;
      case "done":
        return COLORS.surface;
      default:
        return COLORS.surface;
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case "idle":
        return COLORS.border;
      case "recording":
        return COLORS.accent;
      case "done":
        return COLORS.success;
      default:
        return COLORS.border;
    }
  };

  const renderDifficulty = () => {
    const dots = [];
    for (let i = 0; i < 3; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.difficultyDot,
            {
              backgroundColor: i < phrase.difficulty ? COLORS.accent : COLORS.inactive,
            },
          ]}
        />
      );
    }
    return <View style={styles.difficultyContainer}>{dots}</View>;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}
    >
      <Text style={styles.phraseText}>{phrase.text}</Text>
      {renderDifficulty()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: RADII.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  phraseText: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 12,
    color: COLORS.text,
  },
  difficultyContainer: {
    flexDirection: "row",
    gap: 6,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
