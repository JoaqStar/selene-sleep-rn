import '@/lib/polyfills/punycode-polyfill';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useAuthStore } from "@/stores/authStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isOnboarded, isLoading, loadOnboardingState } = useOnboardingStore();
  const { session, isLoading: isAuthLoading, initialize } = useAuthStore();

  useEffect(() => {
    console.log('[DebugAppLoadingIssue] RootLayoutNav mount: calling loadOnboardingState and initialize');
    loadOnboardingState();
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  const rawMetadata = (session?.user?.user_metadata ?? {}) as Record<string, any>;
  const remoteName =
    (typeof rawMetadata.full_name === 'string' && rawMetadata.full_name) ||
    (typeof rawMetadata.name === 'string' && rawMetadata.name) ||
    '';
  const hasRemoteName = remoteName.trim().length > 0;

  useEffect(() => {
    // If Supabase already has a name for this user, sync it into the onboarding store
    // so we don't show the onboarding "What should we call you?" screen again.
    if (session && hasRemoteName && !isOnboarded) {
      useOnboardingStore.getState().completeOnboarding(remoteName);
    }
  }, [session, hasRemoteName, isOnboarded, remoteName]);

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      console.log('[Notifications] Response received', data);
      // In a future iteration, we can deep link into specific screens based on data.type/deepLink.
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthLoading) {
      console.log('[DebugAppLoadingIssue] Hiding splash screen. isLoading =', isLoading, 'isAuthLoading =', isAuthLoading);
      SplashScreen.hideAsync();
    }
  }, [isLoading, isAuthLoading]);

  if (isLoading || isAuthLoading) {
    console.log('[DebugAppLoadingIssue] Still loading. isLoading =', isLoading, 'isAuthLoading =', isAuthLoading);
    return null;
  }

  return (
    <>
      {!session && <Redirect href="/sign-in" />}
      {session && !isOnboarded && !hasRemoteName && <Redirect href="/onboarding" />}
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
