import '@/lib/polyfills/punycode-polyfill';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAuthStore } from "@/stores/authStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hasUsername, usernameDbReady, profileChecked, loadUserProfile } = useOnboardingStore();
  const { session } = useAuthStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const activeRoute = segments[0] ?? '';

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      void loadUserProfile(userId);
    } else {
      void loadUserProfile(undefined);
    }
  }, [session?.user?.id, loadUserProfile]);

  const isNavigationReady = Boolean(navigationState?.key);
  const needsUsername = Boolean(
    session && profileChecked && usernameDbReady && !hasUsername,
  );
  const onSignIn = activeRoute === 'sign-in';
  const onCompleteProfile = activeRoute === 'complete-profile';
  const onOnboarding = activeRoute === 'onboarding';

  if (!isNavigationReady) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  return (
    <>
      {!session && !onSignIn && <Redirect href="/sign-in" />}
      {needsUsername && !onCompleteProfile && !onOnboarding && (
        <Redirect href="/complete-profile" />
      )}
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen
          name="sign-in"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="complete-profile"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="player"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const { isLoading } = useOnboardingStore();
  const { isLoading: isAuthLoading, initialize } = useAuthStore();

  useEffect(() => {
    console.log('[App] Boot: load onboarding state + auth');
    void useOnboardingStore.getState().loadOnboardingState();
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      console.log('[Notifications] Response received', data);
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthLoading) {
      SplashScreen.hideAsync().catch((error) => {
        console.warn('[App] SplashScreen.hideAsync failed:', error);
      });
    }
  }, [isLoading, isAuthLoading]);

  if (isLoading || isAuthLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <View style={{ flex: 1, backgroundColor: Colors.background }} />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
