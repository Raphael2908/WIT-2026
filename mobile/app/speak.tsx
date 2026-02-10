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
import { useRouter } from "expo-router";
import { Camera } from "expo-camera";
import { useUser } from "../hooks/useUser";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useLipTracker } from "../hooks/useLipTracker";
import { api } from "../services/api";
import { API_ROUTES } from "../utils/constants";
import SpeakButton from "../components/SpeakButton";
import DecodedTextDisplay from "../components/DecodedTextDisplay";
import FeedbackBar from "../components/FeedbackBar";
import ModalityIndicator from "../components/ModalityIndicator";
import WaveformVisualizer from "../components/WaveformVisualizer";
import MiniCameraPreview from "../components/MiniCameraPreview";
import ShapeSequenceDebug from "../components/ShapeSequenceDebug";
import type { DecodeResult, FeedbackPayload } from "../types";

type DecodeStatus = "idle" | "listening" | "decoding" | "result";

export default function SpeakScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { startRecording, stopRecording, isRecording, audioLevel, error: audioError } = useAudioRecorder();
  const { landmarks, lipLandmarks, isTracking, startCamera, stopCamera } = useFaceMesh();
  const {
    startTracking,
    stopTracking,
    getShapeSequence,
    isTracking: isLipTracking,
    currentShape,
    currentMetrics,
  } = useLipTracker(lipLandmarks, landmarks);

  const [decodeStatus, setDecodeStatus] = useState<DecodeStatus>("idle");
  const [lastResult, setLastResult] = useState<DecodeResult | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request camera permission and start face mesh on mount
  useEffect(() => {
    (async () => {
      await Camera.requestCameraPermissionsAsync();
    })();
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Handle audio errors
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

      // Start recording and lip tracking
      await startRecording();
      startTracking();
    } catch (error) {
      console.error("Error starting recording:", error);
      Alert.alert("Error", "Failed to start recording. Please check permissions.");
      setDecodeStatus("idle");
    }
  };

  const handleSpeakEnd = async () => {
    if (!user || !isRecording) return;

    try {
      // Stop recording and lip tracking
      const audioUri = await stopRecording();
      const lipFrames = stopTracking();

      setDecodeStatus("decoding");

      // Prepare form data
      const formData = new FormData();
      formData.append("audio", {
        uri: audioUri,
        type: "audio/wav",
        name: "audio.wav",
      } as any);
      formData.append("lip_frames", JSON.stringify(lipFrames));

      // Send to backend
      const result = await api.postFormData<DecodeResult>(
        API_ROUTES.DECODE(user.user_id),
        formData
      );

      // Show result
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBlind = user.vision_impairment_hint === "blind";
  const isPartial = user.vision_impairment_hint === "partial";
  const shouldSpeakAloud = isBlind || isPartial;
  const shouldShowCamera = !isBlind;

  // Font size adjustments for vision impairment (commented for clarity)
  // In production, apply fontSize multipliers here based on vision_impairment_hint

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
            <Text style={styles.iconText}>🕐</Text>
          </Pressable>
          <Pressable
            onPress={navigateToSettings}
            style={styles.iconButton}
            accessibilityLabel="Open settings"
          >
            <Text style={styles.iconText}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Decoded text display */}
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

        {/* Camera preview and shape debug */}
        <View style={styles.cameraRow}>
          <MiniCameraPreview
            showMesh={isTracking}
            position="top-right"
            hidden={!shouldShowCamera}
            lipLandmarks={lipLandmarks}
            isTracking={isTracking}
          />
          {shouldShowCamera && (
            <ShapeSequenceDebug
              currentShape={currentShape}
              metrics={currentMetrics}
            />
          )}
        </View>

        {/* Waveform visualizer */}
        <View style={styles.waveformContainer}>
          <WaveformVisualizer
            audioLevel={audioLevel}
            isActive={isRecording}
          />
        </View>

        {/* Speak button */}
        <View style={styles.speakButtonContainer}>
          <SpeakButton
            onPressIn={handleSpeakStart}
            onPressOut={handleSpeakEnd}
            isActive={decodeStatus === "listening"}
            disabled={decodeStatus === "decoding" || isSubmitting}
          />
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#666666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  textDisplayContainer: {
    minHeight: 120,
    marginBottom: 20,
  },
  modalityContainer: {
    marginBottom: 16,
  },
  cameraRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    marginBottom: 16,
    minHeight: 160,
  },
  waveformContainer: {
    height: 80,
    marginBottom: 24,
  },
  speakButtonContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  feedbackContainer: {
    marginTop: "auto",
  },
});
