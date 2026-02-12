import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { api } from "../services/api";
import { speakTextAsync } from "../services/tts";
import {
  getSavedPhrases,
  savePhrases,
  getRecentPhrases,
  addRecentPhrase,
  getTtsEnabled,
} from "../services/storage";
import { API_ROUTES } from "../utils/constants";
import { COLORS, RADII } from "../utils/theme";
import SpeakButton from "../components/SpeakButton";
import DecodedTextDisplay from "../components/DecodedTextDisplay";
import FeedbackBar from "../components/FeedbackBar";
import ModalityIndicator from "../components/ModalityIndicator";
import WaveformVisualizer from "../components/WaveformVisualizer";
import QuickPhraseBoard from "../components/QuickPhraseBoard";
import ShowTextModal from "../components/ShowTextModal";
import type { DecodeResult, FeedbackPayload, QuickPhrase } from "../types";

import * as FileSystem from "expo-file-system/legacy";

type DecodeStatus = "idle" | "listening" | "decoding" | "result";
type ResultSource = "decode" | "quick_phrase";

export default function SpeakScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { startRecording, stopRecording, isRecording, audioLevel, error: audioError } = useAudioRecorder();

  const [decodeStatus, setDecodeStatus] = useState<DecodeStatus>("idle");
  const [lastResult, setLastResult] = useState<DecodeResult | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean | null>(null);

  // Quick phrase state
  const [quickPhraseText, setQuickPhraseText] = useState<string | null>(null);
  const [resultSource, setResultSource] = useState<ResultSource>("decode");
  const [savedPhrases, setSavedPhrases] = useState<QuickPhrase[]>([]);
  const [recentPhrases, setRecentPhrases] = useState<string[]>([]);
  const [showTextModalVisible, setShowTextModalVisible] = useState(false);

  // Load saved/recent phrases on mount
  useEffect(() => {
    const loadPhrases = async () => {
      const [saved, recent] = await Promise.all([
        getSavedPhrases(),
        getRecentPhrases(),
      ]);
      setSavedPhrases(saved);
      setRecentPhrases(recent);
    };
    loadPhrases();
  }, []);

  // Handle audio errors
  useEffect(() => {
    if (audioError) {
      Alert.alert("Audio Error", audioError);
    }
  }, [audioError]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const stored = await getTtsEnabled();
      if (isMounted) {
        setTtsEnabled(stored);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentDisplayText =
    resultSource === "quick_phrase"
      ? quickPhraseText
      : lastResult?.decoded_text || null;

  const currentRawWhisper =
    resultSource === "quick_phrase"
      ? null
      : lastResult?.raw_whisper || null;

  const handlePhraseSelect = useCallback(async (text: string) => {
    setQuickPhraseText(text);
    setResultSource("quick_phrase");
    setDecodeStatus("result");
    setLastResult(null);
    setFeedbackVisible(false);

    await speakTextAsync(text);
    await addRecentPhrase(text);
    setRecentPhrases((prev) => [text, ...prev.filter((p) => p !== text)].slice(0, 20));
  }, []);

  const handleShowText = useCallback(() => {
    if (currentDisplayText) {
      setShowTextModalVisible(true);
    }
  }, [currentDisplayText]);

  const handleSavePhraseToFavorites = useCallback(async () => {
    const text = currentDisplayText;
    if (!text) return;

    const existing = savedPhrases.find((p) => p.text === text);
    if (existing) return;

    const newPhrase: QuickPhrase = {
      id: `custom-${Date.now()}`,
      text,
      category: "favorites",
      isCustom: true,
      isFavorite: true,
      usageCount: 1,
    };
    const updated = [...savedPhrases, newPhrase];
    setSavedPhrases(updated);
    await savePhrases(updated);
  }, [currentDisplayText, savedPhrases]);

  const handleToggleFavorite = useCallback(async (phraseId: string) => {
    const updated = savedPhrases.map((p) =>
      p.id === phraseId ? { ...p, isFavorite: !p.isFavorite } : p
    );
    setSavedPhrases(updated);
    await savePhrases(updated);
  }, [savedPhrases]);

  const handleSpeakStart = async () => {
    if (!user) return;

    try {
      setDecodeStatus("listening");
      setLastResult(null);
      setQuickPhraseText(null);
      setResultSource("decode");
      setFeedbackVisible(false);

      // Start recording
      await startRecording();
    } catch (error) {
      console.error("Error starting recording:", error);
      Alert.alert("Error", "Failed to start recording. Please check permissions.");
      setDecodeStatus("idle");
    }
  };

  const handleSpeakEnd = async () => {
    if (!user || !isRecording) return;

    try {
      // Stop recording
      const audioUri = await stopRecording();

      setDecodeStatus("decoding");

      // Read audio as base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send to backend as JSON
      const result = await api.post<DecodeResult>(
        API_ROUTES.DECODE(user.user_id),
        { audio_base64: base64Audio }
      );

      // Show result
      setLastResult(result);
      setResultSource("decode");
      setDecodeStatus("result");
      setFeedbackVisible(true);

      // Add decoded text to recent phrases
      await addRecentPhrase(result.decoded_text);
      setRecentPhrases((prev) =>
        [result.decoded_text, ...prev.filter((p) => p !== result.decoded_text)].slice(0, 20)
      );
    } catch (error) {
      console.error("Error decoding:", error);
      Alert.alert("Decode Error", "Failed to decode speech. Please try again.");
      setDecodeStatus("idle");
    }
  };

  const handleConfirm = async () => {
    if (!user || !lastResult) return;

    try {
      setIsSubmitting(true);
      const payload: FeedbackPayload = {
        decode_id: lastResult.decode_id,
        corrected_text: null,
        confirmed: true,
      };

      await api.post(API_ROUTES.SUBMIT_FEEDBACK(user.user_id), payload);

      setFeedbackVisible(false);
      setDecodeStatus("idle");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Alert.alert("Error", "Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (correctedText: string) => {
    if (!user || !lastResult) return;

    try {
      setIsSubmitting(true);
      const payload: FeedbackPayload = {
        decode_id: lastResult.decode_id,
        corrected_text: correctedText,
        confirmed: false,
      };

      await api.post(API_ROUTES.SUBMIT_FEEDBACK(user.user_id), payload);

      setFeedbackVisible(false);
      setDecodeStatus("idle");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Alert.alert("Error", "Failed to submit corrected text.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToSettings = () => {
    router.push("/settings");
  };

  const navigateToHistory = () => {
    router.push("/history");
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const shouldSpeakAloud = ttsEnabled ?? true;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Speech Decoder</Text>
        <View style={styles.headerButtons}>
          <Pressable
            onPress={navigateToHistory}
            style={styles.iconButton}
            accessibilityLabel="View history"
          >
            <Ionicons name="menu" size={24} color={COLORS.text} />
          </Pressable>
          <Pressable
            onPress={navigateToSettings}
            style={styles.iconButton}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </Pressable>
        </View>
      </View>

      {/* Middle content */}
      <View style={styles.middleContent}>
        {/* Decoded text display */}
        <View style={styles.textDisplayContainer}>
          <DecodedTextDisplay
            decodedText={currentDisplayText}
            partialText={null}
            rawWhisper={currentRawWhisper}
            status={decodeStatus}
            speakAloud={shouldSpeakAloud && resultSource === "decode"}
            onShowText={handleShowText}
          />
        </View>

        {/* Modality indicator — only show for decoded results */}
        {resultSource === "decode" && (
          <View style={styles.modalityContainer}>
            <ModalityIndicator
              weights={lastResult?.modality_weights || user.modality_weights}
              audioActive={true}
              lipActive={lastResult?.lip_reading_used ?? true}
            />
          </View>
        )}
        {resultSource === "quick_phrase" && decodeStatus === "result" && (
          <View style={styles.quickPhraseIndicator}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.quickPhraseLabel}>Quick Phrase</Text>
          </View>
        )}

        {/* Quick Phrase Board */}
        <View style={styles.phraseBoardContainer}>
          <QuickPhraseBoard
            onPhraseSelect={handlePhraseSelect}
            recentPhrases={recentPhrases}
            savedPhrases={savedPhrases}
            onToggleFavorite={handleToggleFavorite}
          />
        </View>
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        <WaveformVisualizer
          audioLevel={audioLevel}
          isActive={isRecording}
        />
        <View style={styles.speakButtonContainer}>
          <SpeakButton
            onPressIn={handleSpeakStart}
            onPressOut={handleSpeakEnd}
            isActive={decodeStatus === "listening"}
            disabled={decodeStatus === "decoding" || isSubmitting}
          />
        </View>
      </View>

      {/* Feedback bar — only for decoded results */}
      {feedbackVisible && resultSource === "decode" && (
        <View style={styles.feedbackContainer}>
          <FeedbackBar
            onConfirm={handleConfirm}
            onEdit={() => {}}
            onSave={handleSavePhraseToFavorites}
            visible={feedbackVisible}
            initialText={lastResult?.decoded_text || ""}
            onSubmitEdit={handleEdit}
          />
        </View>
      )}

      {/* Show Text Modal */}
      <ShowTextModal
        text={currentDisplayText || ""}
        visible={showTextModalVisible}
        onClose={() => setShowTextModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  middleContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  textDisplayContainer: {
    marginBottom: 12,
  },
  modalityContainer: {
    marginBottom: 8,
  },
  quickPhraseIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
    paddingVertical: 4,
  },
  quickPhraseLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  phraseBoardContainer: {
    marginBottom: 8,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  speakButtonContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  feedbackContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
