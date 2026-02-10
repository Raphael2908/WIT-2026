import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import * as Speech from "expo-speech";

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
        <Text style={styles.placeholder}>Ready to decode</Text>
      )}

      {status === "listening" && (
        <Text style={styles.listening}>Listening{dots}</Text>
      )}

      {status === "decoding" && (
        <View style={styles.decodingContainer}>
          <Text style={styles.decoding}>Decoding...</Text>
          <ActivityIndicator size="small" color="#4A90D9" style={styles.spinner} />
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
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  placeholder: {
    fontSize: 18,
    color: "#9CA3AF",
    textAlign: "center",
  },
  listening: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
  },
  decodingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  decoding: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
  },
  spinner: {
    marginLeft: 4,
  },
  partial: {
    fontSize: 24,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 8,
  },
  decoded: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },
  rawWhisper: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
  },
});
