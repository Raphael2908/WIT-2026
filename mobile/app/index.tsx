import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "../hooks/useUser";

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

  // Show loading spinner while checking user state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4A90D9" />
    </View>
  );
}

// Full screen centered loading
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
