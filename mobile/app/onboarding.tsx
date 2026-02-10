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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";
import { useUser } from "../hooks/useUser";
import { COLORS, RADII } from "../utils/theme";
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
        placeholderTextColor={COLORS.inactive}
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
              <View style={styles.checkDot} />
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
              <View style={styles.checkDot} />
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
            <View style={styles.permissionIconContainer}>
              <Text style={styles.permissionLabel}>Microphone</Text>
            </View>
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionDescription}>
                Required for speech recording
              </Text>
            </View>
            {micPermission === "granted" ? (
              <View style={styles.grantedContainer}>
                <View style={styles.grantedDot} />
                <Text style={styles.grantedText}>Granted</Text>
              </View>
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
            <View style={styles.permissionIconContainer}>
              <Text style={styles.permissionLabel}>Camera</Text>
            </View>
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionDescription}>
                Required for lip reading
              </Text>
            </View>
            {cameraPermission === "granted" ? (
              <View style={styles.grantedContainer}>
                <View style={styles.grantedDot} />
                <Text style={styles.grantedText}>Granted</Text>
              </View>
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
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {renderStepIndicator()}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
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
    borderColor: COLORS.inactive,
    backgroundColor: "transparent",
  },
  stepDotActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stepContainer: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: 32,
    textAlign: "center",
  },
  textInput: {
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: 16,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 32,
    backgroundColor: COLORS.surface,
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
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },
  optionCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceAlt,
  },
  optionText: {
    fontSize: 18,
    color: COLORS.text,
    flex: 1,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
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
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },
  permissionIconContainer: {
    marginRight: 12,
  },
  permissionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: RADII.full,
    minWidth: 100,
    alignItems: "center",
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  grantedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  grantedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
  },
  grantedText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.success,
  },
  primaryButton: {
    height: 56,
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: RADII.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    minWidth: 48,
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: COLORS.inactive,
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.buttonText,
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
    color: COLORS.accent,
  },
});
