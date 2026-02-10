import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII } from "../utils/theme";

interface PhraseChipProps {
  text: string;
  onPress: () => void;
  onLongPress?: () => void;
  isFavorite?: boolean;
}

export default function PhraseChip({
  text,
  onPress,
  onLongPress,
  isFavorite,
}: PhraseChipProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
      ]}
      accessibilityLabel={`Quick phrase: ${text}${isFavorite ? ", favorite" : ""}`}
      accessibilityRole="button"
    >
      {isFavorite && (
        <Ionicons
          name="heart"
          size={14}
          color={COLORS.accent}
          style={styles.favoriteIcon}
        />
      )}
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipPressed: {
    backgroundColor: COLORS.surfaceAlt,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  favoriteIcon: {
    marginRight: 6,
  },
});
