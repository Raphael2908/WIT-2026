import React from "react";
import { View, Text, StyleSheet } from "react-native";

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
        return "#FFFFFF";
      case "recording":
        return "#DBEAFE";
      case "done":
        return "#D1FAE5";
      default:
        return "#FFFFFF";
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case "idle":
        return "#E5E7EB";
      case "recording":
        return "#3B82F6";
      case "done":
        return "#10B981";
      default:
        return "#E5E7EB";
    }
  };

  const getDifficultyBadge = () => {
    switch (phrase.difficulty) {
      case 1:
        return { text: "●○○", color: "#9CA3AF" };
      case 2:
        return { text: "●●○", color: "#F97316" };
      case 3:
        return { text: "●●●", color: "#EF4444" };
      default:
        return { text: "●○○", color: "#9CA3AF" };
    }
  };

  const badge = getDifficultyBadge();

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
      <Text style={[styles.difficultyBadge, { color: badge.color }]}>
        {badge.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  phraseText: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 12,
  },
  difficultyBadge: {
    fontSize: 16,
    fontWeight: "600",
  },
});
