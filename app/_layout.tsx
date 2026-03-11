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
    loadOnboardingState();
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

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
      SplashScreen.hideAsync();
    }
  }, [isLoading, isAuthLoading]);

  if (isLoading || isAuthLoading) {
    return null;
  }

  return (
    <>
      {!session && <Redirect href="/sign-in" />}
      {session && !isOnboarded && <Redirect href="/onboarding" />}
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
