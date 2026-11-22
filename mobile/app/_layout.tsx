import "@/global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/store/auth";

export default function RootLayout() {
  const init = useAuth((s) => s.init);
  const loading = useAuth((s) => s.loading);
  const session = useAuth((s) => s.session);
  const recovery = useAuth((s) => s.passwordRecovery);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (loading) return;
    const inRecoveryCallback = segments[0] === "auth" && segments[1] === "callback";
    const inPasswordUpdate = segments[0] === "(auth)" && segments[1] === "update-password";
    const inPasswordRequest = segments[0] === "(auth)" && segments[1] === "forgot-password";
    if (inRecoveryCallback || inPasswordUpdate || inPasswordRequest) return;
    if (recovery?.phase === "ready") {
      router.replace("/(auth)/update-password");
      return;
    }
    if (recovery?.phase === "exchanging") return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/dashboard");
    }
  }, [loading, session, recovery, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0A0A0F",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0A0A0F" },
            animation: "fade",
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/callback" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
