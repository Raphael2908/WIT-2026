import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";
import { useUser } from "../hooks/useUser";
import {
  VISION_IMPAIRMENT_OPTIONS,
  SPEECH_IMPAIRMENT_OPTIONS,
} from "../utils/constants";

type PermissionStatus = "pending" | "granted" | "denied";

export default function OnboardingScreen() {
  const router = useRouter();
  const { createUser } = useUser();

  const [currentStep, setCurrentStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [visionImpairmentHint, setVisionImpairmentHint] = useState<
    string | null
  >("none");
  const [speechImpairmentHint, setSpeechImpairmentHint] = useState<
    string | null
  >(null);
  const [micPermission, setMicPermission] =
    useState<PermissionStatus>("pending");
  const [cameraPermission, setCameraPermission] =
    useState<PermissionStatus>("pending");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleContinue = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const requestMicPermission = async () => {
    try {
      const result = await Audio.requestPermissionsAsync();
      setMicPermission(result.granted ? "granted" : "denied");
      if (!result.granted) {
        Alert.alert(
          "Permission Denied",
          "Microphone access is required for this app to work."
        );
      }
    } catch (error) {
      console.error("Microphone permission error:", error);
      setMicPermission("denied");
    }
  };

  const requestCameraPermission = async () => {
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(result.granted ? "granted" : "denied");
      if (!result.granted) {
        Alert.alert(
          "Permission Denied",
          "Camera access is required for lip reading to work."
        );
      }
    } catch (error) {
      console.error("Camera permission error:", error);
      setCameraPermission("denied");
    }
  };

  const handleStartCalibration = async () => {
    setIsCreatingUser(true);
    try {
      await createUser(displayName, visionImpairmentHint ?? undefined, speechImpairmentHint ?? undefined);
      router.push("/calibration");
    } catch (error) {
      console.error("Error creating user:", error);
      Alert.alert(
        "Error",
        "Failed to create user profile. Please try again."
      );
      setIsCreatingUser(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            currentStep === step && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Welcome to Speech Decoder</Text>
      <Text style={styles.paragraph}>
        This app helps decode impaired speech using audio and lip reading. Let's
        set up your profile.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleContinue}
        accessibilityLabel="Get started with onboarding"
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>What should we call you?</Text>
      <TextInput
        style={styles.textInput}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Enter your name"
        placeholderTextColor="#999"
        autoFocus
        accessibilityLabel="Display name input"
      />
      <TouchableOpacity
        style={[
          styles.primaryButton,
          !displayName.trim() && styles.buttonDisabled,
        ]}
        onPress={handleContinue}
        disabled={!displayName.trim()}
        accessibilityLabel="Continue to vision impairment selection"
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleBack}
        accessibilityLabel="Go back to welcome screen"
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Do you have any vision impairment?</Text>
      <Text style={styles.subtitle}>
        This helps us adapt the interface for you
      </Text>
      <View style={styles.optionsContainer}>
        {VISION_IMPAIRMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionCard,
              visionImpairmentHint === option.value &&
                styles.optionCardSelected,
            ]}
            onPress={() => setVisionImpairmentHint(option.value)}
            accessibilityLabel={`Select ${option.label}`}
            accessibilityRole="radio"
            accessibilityState={{
              checked: visionImpairmentHint === option.value,
            }}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            {visionImpairmentHint === option.value && (
              <Text style={styles.checkMark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleContinue}
        accessibilityLabel="Continue to speech impairment selection"
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleBack}
        accessibilityLabel="Go back to name input"
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>
        What type of speech impairment do you have?
      </Text>
      <Text style={styles.subtitle}>
        This is optional and helps improve accuracy
      </Text>
      <View style={styles.optionsContainer}>
        {SPEECH_IMPAIRMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value || "null"}
            style={[
              styles.optionCard,
              speechImpairmentHint === option.value &&
                styles.optionCardSelected,
            ]}
            onPress={() => setSpeechImpairmentHint(option.value)}
            accessibilityLabel={`Select ${option.label}`}
            accessibilityRole="radio"
            accessibilityState={{
              checked: speechImpairmentHint === option.value,
            }}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            {speechImpairmentHint === option.value && (
              <Text style={styles.checkMark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleContinue}
        accessibilityLabel="Continue to permissions"
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleBack}
        accessibilityLabel="Go back to vision impairment selection"
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => {
    const bothGranted =
      micPermission === "granted" && cameraPermission === "granted";

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.title}>We need your permission</Text>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <Text style={styles.permissionIcon}>🎤</Text>
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Microphone</Text>
              <Text style={styles.permissionDescription}>
                Required for speech recording
              </Text>
            </View>
            {micPermission === "granted" ? (
              <Text style={styles.grantedText}>Granted ✓</Text>
            ) : (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestMicPermission}
                accessibilityLabel="Request microphone permission"
              >
                <Text style={styles.permissionButtonText}>Request</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.permissionCard}>
            <Text style={styles.permissionIcon}>📷</Text>
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Camera</Text>
              <Text style={styles.permissionDescription}>
                Required for lip reading
              </Text>
            </View>
            {cameraPermission === "granted" ? (
              <Text style={styles.grantedText}>Granted ✓</Text>
            ) : (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestCameraPermission}
                accessibilityLabel="Request camera permission"
              >
                <Text style={styles.permissionButtonText}>Request</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, !bothGranted && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!bothGranted}
          accessibilityLabel="Continue to final step"
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBack}
          accessibilityLabel="Go back to speech impairment selection"
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.paragraph}>
        Now we'll do a quick calibration to learn your speech patterns.
      </Text>
      <TouchableOpacity
        style={[styles.primaryButton, isCreatingUser && styles.buttonDisabled]}
        onPress={handleStartCalibration}
        disabled={isCreatingUser}
        accessibilityLabel="Start calibration"
      >
        <Text style={styles.buttonText}>
          {isCreatingUser ? "Creating Profile..." : "Start Calibration"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleBack}
        disabled={isCreatingUser}
        accessibilityLabel="Go back to permissions"
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep0();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderStepIndicator()}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    backgroundColor: "transparent",
  },
  stepDotActive: {
    backgroundColor: "#4A90D9",
    borderColor: "#4A90D9",
  },
  stepContainer: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 24,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 18,
    color: "#333333",
    lineHeight: 28,
    marginBottom: 32,
    textAlign: "center",
  },
  textInput: {
    height: 56,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    color: "#000000",
    marginBottom: 32,
    backgroundColor: "#FFFFFF",
  },
  optionsContainer: {
    marginBottom: 32,
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  optionCardSelected: {
    borderColor: "#4A90D9",
    backgroundColor: "#EBF4FD",
  },
  optionText: {
    fontSize: 18,
    color: "#000000",
    flex: 1,
  },
  checkMark: {
    fontSize: 24,
    color: "#4A90D9",
    fontWeight: "bold",
  },
  permissionContainer: {
    marginBottom: 32,
    gap: 16,
  },
  permissionCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    padding: 16,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  permissionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 16,
    color: "#666666",
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#4A90D9",
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  grantedText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  primaryButton: {
    height: 56,
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    minWidth: 48,
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48,
    minHeight: 48,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4A90D9",
  },
});
