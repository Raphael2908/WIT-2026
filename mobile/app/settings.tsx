import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";
import { COLORS, RADII } from "../utils/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateUser, isLoading } = useUser();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleDisplayNameBlur = async () => {
    if (!user || displayName === user.display_name) return;

    try {
      setIsUpdating(true);
      await updateUser({ display_name: displayName });
    } catch (error) {
      console.error("Error updating display name:", error);
      Alert.alert("Error", "Failed to update display name.");
      setDisplayName(user.display_name);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecalibrate = () => {
    router.push("/calibration");
  };

  if (isLoading || !user) {
    return (
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* PROFILE Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Profile</Text>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onBlur={handleDisplayNameBlur}
                  placeholder="Enter your name"
                  accessibilityLabel="Display name input"
                  editable={!isUpdating}
                />
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.label}>User ID</Text>
                <Text style={styles.valueText}>{user.user_id}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.label}>Vision Impairment</Text>
                <Text style={styles.valueText}>
                  {user.vision_impairment_hint || "Not specified"}
                </Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.label}>Speech Impairment</Text>
                <Text style={styles.valueText}>
                  {user.speech_impairment_hint || "Not specified"}
                </Text>
              </View>
            </View>
          </View>

          {/* CALIBRATION Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Calibration</Text>

            <View style={styles.card}>
              <Pressable
                style={styles.button}
                onPress={handleRecalibrate}
                accessibilityLabel="Recalibrate speech profile"
              >
                <Text style={styles.buttonText}>Recalibrate</Text>
              </Pressable>

              <View style={styles.cardRow}>
                <Text style={styles.label}>Calibration Count</Text>
                <Text style={styles.valueText}>{user.calibration_count}</Text>
              </View>
            </View>
          </View>

          {/* MODALITIES Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Modalities</Text>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.label}>Audio Weight</Text>
                <Text style={styles.valueText}>
                  {user.modality_weights.audio.toFixed(2)}
                </Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.label}>Lip Reading Weight</Text>
                <Text style={styles.valueText}>
                  {user.modality_weights.lip.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* ABOUT Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>About</Text>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.label}>App Version</Text>
                <Text style={styles.valueText}>1.0.0</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.aboutText}>Built for WIT 2026 Hackathon</Text>
              </View>
            </View>
          </View>
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
    paddingVertical: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: "500",
  },
  valueText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  input: {
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    padding: 12,
    backgroundColor: COLORS.surface,
    minHeight: 48,
  },
  button: {
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: RADII.full,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 48,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  aboutText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
