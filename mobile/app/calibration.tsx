import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";
import { useCalibration } from "../hooks/useCalibration";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { COLORS, RADII } from "../utils/theme";
import PhraseCard from "../components/PhraseCard";
import CalibrationProgress from "../components/CalibrationProgress";
import RecordButton from "../components/RecordButton";
import WaveformVisualizer from "../components/WaveformVisualizer";
import MiniCameraPreview from "../components/MiniCameraPreview";

export default function CalibrationScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.user_id || "";

  const calibration = useCalibration(userId);
  const audioRecorder = useAudioRecorder();
  const videoRecorder = useVideoRecorder();

  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "processing"
  >("idle");
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (userId) {
      calibration.startSession();
    }
  }, [userId]);

  const handlePressIn = async () => {
    setRecordingState("recording");
    setShowResult(false);
    await Promise.all([
      audioRecorder.startRecording(),
      videoRecorder.startRecording(),
    ]);
  };

  const handlePressOut = async () => {
    setRecordingState("processing");
    const [audioUri, videoUri] = await Promise.all([
      audioRecorder.stopRecording(),
      videoRecorder.stopRecording(),
    ]);

    try {
      await calibration.submitRecording(audioUri, videoUri);
      setShowResult(true);
      setRecordingState("idle");
    } catch (err) {
      setRecordingState("idle");
    }
  };

  const handleNext = () => {
    setShowResult(false);
    if (calibration.currentIndex >= calibration.totalPhrases - 1) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    await calibration.completeSession();
  };

  const handleStartUsing = () => {
    router.replace("/speak");
  };

  const getPhraseCardStatus = () => {
    if (recordingState === "recording") return "recording";
    if (showResult) return "done";
    return "idle";
  };

  const getRecordButtonStatus = () => {
    if (recordingState === "processing") return "processing";
    if (recordingState === "recording") return "recording";
    return "idle";
  };

  if (calibration.status === "loading") {
    return (
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading calibration phrases...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (calibration.summary) {
    return (
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Calibration Complete</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Accuracy</Text>
              <Text style={styles.summaryValue}>
                {calibration.summary.accuracy_pct.toFixed(0)}%
              </Text>
              <Text style={styles.summarySubtext}>
                {calibration.summary.accurate_phrases} of{" "}
                {calibration.summary.total_phrases} phrases matched
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Recommended Modalities</Text>
              <Text style={styles.summaryValue}>
                {calibration.summary.recommended_modalities.join(" + ")}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Average Confidence</Text>
              <Text style={styles.summaryValue}>
                {(calibration.summary.avg_confidence * 100).toFixed(0)}%
              </Text>
            </View>

            <Text style={styles.profileReadyText}>
              Your speech profile is ready
            </Text>

            <Pressable
              style={styles.startButton}
              onPress={handleStartUsing}
              accessibilityLabel="Start using the app"
            >
              <Text style={styles.startButtonText}>Start Using</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (calibration.error || audioRecorder.error) {
    return (
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {calibration.error || audioRecorder.error}
            </Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => calibration.startSession()}
              accessibilityLabel="Retry calibration"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentResult =
    calibration.results.length > 0
      ? calibration.results[calibration.results.length - 1]
      : null;

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Hidden camera for video recording */}
        <MiniCameraPreview cameraRef={videoRecorder.cameraRef} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <CalibrationProgress
            current={calibration.currentIndex + 1}
            total={calibration.totalPhrases}
            results={calibration.results}
          />

          <Text style={styles.progressText}>
            Phrase {calibration.currentIndex + 1} of {calibration.totalPhrases}
          </Text>

          {calibration.currentPhrase && (
            <PhraseCard
              phrase={calibration.currentPhrase}
              status={getPhraseCardStatus()}
            />
          )}

          <WaveformVisualizer
            audioLevel={audioRecorder.audioLevel}
            isActive={recordingState === "recording"}
          />

          <View style={styles.recordButtonContainer}>
            <RecordButton
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              status={getRecordButtonStatus()}
            />
          </View>

          {showResult && currentResult && (
            <View style={styles.resultContainer}>
              {currentResult.match ? (
                <View style={styles.successResult}>
                  <View style={styles.resultDot}>
                    <View style={[styles.resultDotInner, { backgroundColor: COLORS.success }]} />
                  </View>
                  <Text style={styles.successText}>Whisper got it right</Text>
                </View>
              ) : (
                <View style={styles.errorResult}>
                  <View style={styles.resultDot}>
                    <View style={[styles.resultDotInner, { backgroundColor: COLORS.error }]} />
                  </View>
                  <Text style={styles.comparisonText}>
                    You said: "{currentResult.phrase_text}"
                  </Text>
                  <Text style={styles.comparisonText}>
                    Whisper heard: "{currentResult.whisper_output}"
                  </Text>
                  {currentResult.error_mapping_created && (
                    <Text style={styles.savedText}>Error pattern saved</Text>
                  )}
                </View>
              )}

              <Pressable
                style={styles.nextButton}
                onPress={handleNext}
                accessibilityLabel={
                  calibration.currentIndex >= calibration.totalPhrases - 1
                    ? "Finish calibration"
                    : "Next phrase"
                }
              >
                <Text style={styles.nextButtonText}>
                  {calibration.currentIndex >= calibration.totalPhrases - 1
                    ? "Finish"
                    : "Next"}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  progressText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginVertical: 12,
  },
  recordButtonContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  resultContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  successResult: {
    alignItems: "center",
  },
  resultDot: {
    marginBottom: 8,
  },
  resultDotInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  successText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.success,
  },
  errorResult: {
    alignItems: "center",
  },
  comparisonText: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: "center",
    marginVertical: 4,
  },
  savedText: {
    fontSize: 16,
    color: COLORS.success,
    marginTop: 12,
  },
  nextButton: {
    marginTop: 20,
    backgroundColor: COLORS.buttonPrimary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: RADII.full,
    alignItems: "center",
    minHeight: 48,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  summaryContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 32,
    textAlign: "center",
  },
  summaryCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: RADII.md,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.accent,
  },
  summarySubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  profileReadyText: {
    fontSize: 20,
    color: COLORS.success,
    marginTop: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 20,
    paddingHorizontal: 64,
    borderRadius: RADII.full,
    minHeight: 48,
    minWidth: 200,
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.buttonText,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.buttonPrimary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: RADII.full,
    minHeight: 48,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
});
