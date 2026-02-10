import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { api } from "../services/api";
import { API_ROUTES } from "../utils/constants";
import { COLORS, RADII } from "../utils/theme";
import SpeakButton from "../components/SpeakButton";
import DecodedTextDisplay from "../components/DecodedTextDisplay";
import FeedbackBar from "../components/FeedbackBar";
import ModalityIndicator from "../components/ModalityIndicator";
import WaveformVisualizer from "../components/WaveformVisualizer";
import MiniCameraPreview from "../components/MiniCameraPreview";
import type { DecodeResult, FeedbackPayload } from "../types";

type DecodeStatus = "idle" | "listening" | "decoding" | "result";

export default function SpeakScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { startRecording, stopRecording, isRecording, audioLevel, error: audioError } = useAudioRecorder();
  const videoRecorder = useVideoRecorder();

  const [decodeStatus, setDecodeStatus] = useState<DecodeStatus>("idle");
  const [lastResult, setLastResult] = useState<DecodeResult | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (audioError) {
      Alert.alert("Audio Error", audioError);
    }
  }, [audioError]);

  const handleSpeakStart = async () => {
    if (!user) return;

    try {
      setDecodeStatus("listening");
      setLastResult(null);
      setFeedbackVisible(false);

      await Promise.all([
        startRecording(),
        videoRecorder.startRecording(),
      ]);
    } catch (error) {
      console.error("Error starting recording:", error);
      Alert.alert("Error", "Failed to start recording. Please check permissions.");
      setDecodeStatus("idle");
    }
  };

  const handleSpeakEnd = async () => {
    if (!user || !isRecording) return;

    try {
      const [audioUri, videoUri] = await Promise.all([
        stopRecording(),
        videoRecorder.stopRecording(),
      ]);

      setDecodeStatus("decoding");

      const formData = new FormData();
      formData.append("audio", {
        uri: audioUri,
        type: "audio/wav",
        name: "audio.wav",
      } as any);
      formData.append("video", {
        uri: videoUri,
        type: "video/mp4",
        name: "video.mp4",
      } as any);

      const result = await api.postFormData<DecodeResult>(
        API_ROUTES.DECODE(user.user_id),
        formData
      );

      setLastResult(result);
      setDecodeStatus("result");
      setFeedbackVisible(true);
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
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const isBlind = user.vision_impairment_hint === "blind";
  const isPartial = user.vision_impairment_hint === "partial";
  const shouldSpeakAloud = isBlind || isPartial;

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Hidden camera for video recording */}
        <MiniCameraPreview cameraRef={videoRecorder.cameraRef} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Speech Decoder</Text>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={navigateToHistory}
              style={styles.iconButton}
              accessibilityLabel="View history"
            >
              <Text style={styles.iconText}>☰</Text>
            </Pressable>
            <Pressable
              onPress={navigateToSettings}
              style={styles.iconButton}
              accessibilityLabel="Open settings"
            >
              <Text style={styles.iconText}>⚙</Text>
            </Pressable>
          </View>
        </View>

        {/* Middle content */}
        <View style={styles.middleContent}>
          {/* Decoded text card */}
          <View style={styles.textDisplayContainer}>
            <DecodedTextDisplay
              decodedText={lastResult?.decoded_text || null}
              partialText={null}
              rawWhisper={lastResult?.raw_whisper || null}
              status={decodeStatus}
              speakAloud={shouldSpeakAloud}
            />
          </View>

          {/* Modality indicator */}
          <View style={styles.modalityContainer}>
            <ModalityIndicator
              weights={lastResult?.modality_weights || user.modality_weights}
              audioActive={true}
              lipActive={lastResult?.lip_reading_used ?? true}
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

        {/* Feedback bar */}
        {feedbackVisible && (
          <View style={styles.feedbackContainer}>
            <FeedbackBar
              onConfirm={handleConfirm}
              onEdit={() => {}}
              visible={feedbackVisible}
              initialText={lastResult?.decoded_text || ""}
              onSubmitEdit={handleEdit}
            />
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
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
  iconText: {
    fontSize: 20,
    color: COLORS.accent,
  },
  middleContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  textDisplayContainer: {
    marginBottom: 20,
  },
  modalityContainer: {
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
