import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider, useApp } from "@/lib/app-context";
import { useFonts, Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold } from "@expo-google-fonts/rubik";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="result" options={{ headerShown: false, presentation: 'card' }} />
    </Stack>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user.isLoggedIn && !inAuthGroup) {
      router.replace('/login');
    } else if (user.isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user.isLoggedIn, segments, isLoading]);

  if (isLoading) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppProvider>
              <StatusBar style="light" />
              <AuthGuard>
                <RootLayoutNav />
              </AuthGuard>
            </AppProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik_500Medium',
  }
});
