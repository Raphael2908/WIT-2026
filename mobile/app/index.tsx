import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";
import { COLORS } from "../utils/theme";

export default function IndexScreen() {
  const { user, isLoading, isNewUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isNewUser) {
      router.replace("/onboarding");
    } else if (user && user.calibration_count === 0) {
      router.replace("/calibration");
    } else if (user) {
      router.replace("/speak");
    }
  }, [isLoading, isNewUser, user]);

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
