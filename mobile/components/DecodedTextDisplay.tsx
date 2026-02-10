import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII } from "../utils/theme";

interface DecodedTextDisplayProps {
  decodedText: string | null;
  partialText: string | null;
  rawWhisper: string | null;
  status: "idle" | "listening" | "decoding" | "result";
  speakAloud: boolean;
  onShowText?: () => void;
}

export default function DecodedTextDisplay({
  decodedText,
  partialText,
  rawWhisper,
  status,
  speakAloud,
  onShowText,
}: DecodedTextDisplayProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (status === "listening") {
      const interval = setInterval(() => {
        setDots((prev) => {
          if (prev === ".") return "..";
          if (prev === "..") return "...";
          return ".";
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (speakAloud && status === "result" && decodedText) {
      Speech.speak(decodedText);
    }
  }, [speakAloud, status, decodedText]);

  const handleSpeakAloud = () => {
    if (decodedText) {
      Speech.speak(decodedText);
    }
  };

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {status === "idle" && (
        <Text style={styles.placeholder}>Ready</Text>
      )}

      {status === "listening" && (
        <Text style={styles.listening}>Listening{dots}</Text>
      )}

      {status === "decoding" && (
        <View style={styles.decodingContainer}>
          <Text style={styles.decoding}>Decoding...</Text>
          <ActivityIndicator size="small" color={COLORS.accent} style={styles.spinner} />
        </View>
      )}

      {status === "result" && (
        <>
          {partialText && (
            <Text style={styles.partial}>{partialText}</Text>
          )}
          {decodedText && (
            <Text style={styles.decoded}>{decodedText}</Text>
          )}
          {rawWhisper && (
            <Text style={styles.rawWhisper}>{rawWhisper}</Text>
          )}
          {decodedText && (
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleSpeakAloud}
                style={styles.actionButton}
                accessibilityLabel="Speak aloud"
                accessibilityRole="button"
              >
                <Ionicons name="volume-high" size={20} color={COLORS.accent} />
                <Text style={styles.actionText}>Speak</Text>
              </Pressable>
              <Pressable
                onPress={onShowText}
                style={styles.actionButton}
                accessibilityLabel="Show text to someone"
                accessibilityRole="button"
              >
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.accent} />
                <Text style={styles.actionText}>Show</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholder: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  listening: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  decodingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  decoding: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  spinner: {
    marginLeft: 4,
  },
  partial: {
    fontSize: 24,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  decoded: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  rawWhisper: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surfaceAlt,
    minHeight: 40,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.accent,
  },
});
