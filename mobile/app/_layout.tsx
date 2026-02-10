import { Stack } from "expo-router";
import { COLORS } from "../utils/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.gradientStart },
        headerTintColor: COLORS.text,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="calibration" />
      <Stack.Screen name="speak" />
      <Stack.Screen name="history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="tts-test" />
    </Stack>
  );
}
