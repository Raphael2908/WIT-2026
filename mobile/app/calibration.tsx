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
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";
import { useCalibration } from "../hooks/useCalibration";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useFaceMesh } from "../hooks/useFaceMesh";
import { useLipTracker } from "../hooks/useLipTracker";
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
  const faceMesh = useFaceMesh();
  const lipTracker = useLipTracker(faceMesh.lipLandmarks, faceMesh.landmarks);

  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "processing"
  >("idle");
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (userId) {
      calibration.startSession();
      faceMesh.startCamera?.();
    }
  }, [userId]);

  const handlePressIn = async () => {
    setRecordingState("recording");
    setShowResult(false);
    await audioRecorder.startRecording();
    lipTracker.startTracking();
  };

  const handlePressOut = async () => {
    setRecordingState("processing");
    const audioUri = await audioRecorder.stopRecording();
    const lipFrames = lipTracker.stopTracking();

    try {
      await calibration.submitRecording(audioUri, lipFrames);
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
    } else {
      // Move to next phrase automatically handled by useCalibration
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>Loading calibration phrases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (calibration.summary) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Calibration Complete!</Text>

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
            Your speech profile is ready!
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
    );
  }

  if (calibration.error || audioRecorder.error) {
    return (
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
    );
  }

  const currentResult =
    calibration.results.length > 0
      ? calibration.results[calibration.results.length - 1]
      : null;

  return (
    <SafeAreaView style={styles.container}>
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

        <MiniCameraPreview
          showMesh={true}
          position="top-right"
          hidden={user?.vision_impairment_hint === "blind"}
          lipLandmarks={faceMesh.lipLandmarks}
          isTracking={faceMesh.isTracking}
          cameraRef={faceMesh.cameraRef}
          onCameraReady={faceMesh.onCameraReady}
          onCameraMountError={faceMesh.onCameraMountError}
        />

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
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successText}>Whisper got it right!</Text>
              </View>
            ) : (
              <View style={styles.errorResult}>
                <Text style={styles.errorIcon}>✗</Text>
                <Text style={styles.comparisonText}>
                  You said: "{currentResult.phrase_text}"
                </Text>
                <Text style={styles.comparisonText}>
                  Whisper heard: "{currentResult.whisper_output}"
                </Text>
                {currentResult.error_mapping_created && (
                  <Text style={styles.savedText}>Error pattern saved ✓</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    color: "#333333",
  },
  progressText: {
    fontSize: 18,
    color: "#666666",
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
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
  },
  successResult: {
    alignItems: "center",
  },
  successIcon: {
    fontSize: 48,
    color: "#28A745",
    marginBottom: 8,
  },
  successText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#28A745",
  },
  errorResult: {
    alignItems: "center",
  },
  errorIcon: {
    fontSize: 48,
    color: "#DC3545",
    marginBottom: 8,
  },
  comparisonText: {
    fontSize: 18,
    color: "#333333",
    textAlign: "center",
    marginVertical: 4,
  },
  savedText: {
    fontSize: 16,
    color: "#28A745",
    marginTop: 12,
  },
  nextButton: {
    marginTop: 20,
    backgroundColor: "#4A90D9",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 48,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  summaryContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 32,
    textAlign: "center",
  },
  summaryCard: {
    width: "100%",
    backgroundColor: "#F8F9FA",
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 18,
    color: "#666666",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4A90D9",
  },
  summarySubtext: {
    fontSize: 16,
    color: "#666666",
    marginTop: 4,
  },
  profileReadyText: {
    fontSize: 20,
    color: "#28A745",
    marginTop: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#28A745",
    paddingVertical: 20,
    paddingHorizontal: 64,
    borderRadius: 12,
    minHeight: 48,
    minWidth: 200,
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
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
    color: "#DC3545",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#4A90D9",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    minHeight: 48,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
