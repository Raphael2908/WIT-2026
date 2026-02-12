import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { speakTextAsync } from "../services/tts";
import { COLORS, RADII } from "../utils/theme";

interface ShowTextModalProps {
  text: string;
  visible: boolean;
  onClose: () => void;
}

export default function ShowTextModal({
  text,
  visible,
  onClose,
}: ShowTextModalProps) {
  const handleSpeak = () => {
    void speakTextAsync(text);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.container} onPress={onClose}>
        <View style={styles.textContainer}>
          <Text
            style={styles.displayText}
            accessibilityRole="text"
            accessibilityLabel={`Showing text: ${text}`}
          >
            {text}
          </Text>
        </View>

        <View style={styles.bottomControls}>
          <Pressable
            onPress={handleSpeak}
            style={styles.speakButton}
            accessibilityLabel="Speak aloud"
            accessibilityRole="button"
          >
            <Ionicons name="volume-high" size={24} color={COLORS.buttonText} />
            <Text style={styles.speakButtonText}>Speak Aloud</Text>
          </Pressable>

          <Text style={styles.hint}>Tap anywhere to close</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  displayText: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 54,
  },
  bottomControls: {
    alignItems: "center",
    paddingBottom: 48,
    gap: 16,
  },
  speakButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADII.full,
    minHeight: 48,
  },
  speakButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  hint: {
    fontSize: 14,
    color: "#888888",
  },
});
