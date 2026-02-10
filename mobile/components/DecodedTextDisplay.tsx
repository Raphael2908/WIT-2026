import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import * as Speech from "expo-speech";
import { COLORS, RADII } from "../utils/theme";

interface DecodedTextDisplayProps {
  decodedText: string | null;
  partialText: string | null;
  rawWhisper: string | null;
  status: "idle" | "listening" | "decoding" | "result";
  speakAloud: boolean;
}

export default function DecodedTextDisplay({
  decodedText,
  partialText,
  rawWhisper,
  status,
  speakAloud,
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
});
