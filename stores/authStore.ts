import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { getExpoPushToken } from '@/lib/notifications';
import { registerPushTokenForUser } from '@/lib/services/notificationService';
import { Platform } from 'react-native';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  initialize: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,

  initialize: () => {
    if (!supabase) {
      console.error('[Auth] Supabase client not configured');
      set({ isLoading: false });
      return () => {};
    }
    const supabaseClient = supabase;
    console.log('[DebugAppLoadingIssue] initialize() called');
    let hasMarkedAuthReady = false;
    let authReadyTimeout: ReturnType<typeof setTimeout> | null = null;
    const markAuthReady = () => {
      if (hasMarkedAuthReady) return;
      hasMarkedAuthReady = true;
      if (authReadyTimeout) {
        clearTimeout(authReadyTimeout);
        authReadyTimeout = null;
      }
      set({ isLoading: false });
      console.log('[DebugAppLoadingIssue] markAuthReady(): isLoading=false');
    };
    // Failsafe: prevent indefinite splash if getSession stalls.
    authReadyTimeout = setTimeout(() => {
      console.warn('[DebugAppLoadingIssue] Auth readiness timeout hit; forcing isLoading=false');
      markAuthReady();
    }, 8000);
    const handleDeepLink = async (url: string) => {
      console.log('[Auth] Deep link received:', url);
      try {
        const parsed = new URL(url);
        const hashParams = new URLSearchParams(parsed.hash?.startsWith('#') ? parsed.hash.slice(1) : parsed.hash ?? '');
        const searchParams = parsed.searchParams;

        const accessToken =
          hashParams.get('access_token') ?? searchParams.get('access_token');
        const refreshToken =
          hashParams.get('refresh_token') ?? searchParams.get('refresh_token');
        const code = hashParams.get('code') ?? searchParams.get('code');

        if (accessToken && refreshToken) {
          console.log('[Auth] Setting session from deep link tokens');
          const { data, error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('[Auth] setSession error:', error);
          } else {
            console.log('[Auth] Session set from deep link:', data.session ? 'active' : 'none');
          }
          return;
        }

        if (code) {
          console.log('[Auth] Exchanging authorization code for session');
          const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[Auth] exchangeCodeForSession error:', error);
          } else {
            console.log('[Auth] Session obtained from authorization code:', data.session ? 'active' : 'none');
          }
          return;
        }

        console.warn('[Auth] Deep link did not contain tokens or code');
      } catch (e) {
        console.error('[Auth] Deep link handling error:', e);
      }
    };

    Linking.getInitialURL().then((url) => {
      console.log('[DebugAppLoadingIssue] getInitialURL resolved:', url);
      if (url) handleDeepLink(url);
    }).catch((error) => {
      console.error('[DebugAppLoadingIssue] getInitialURL error:', error);
    });

    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Initial session:', session ? 'active' : 'none');
      console.log('[Auth] Initial session token:', session?.access_token);
      console.log('[DebugAppLoadingIssue] getSession resolved, setting auth state');
      set({ session });
      markAuthReady();

      if (session?.user?.id) {
        console.log('[DebugAppLoadingIssue] Session has user, requesting Expo push token');
        const token = await getExpoPushToken();
        console.log('[DebugAppLoadingIssue] getExpoPushToken result:', token);
        if (token) {
          console.log('[DebugAppLoadingIssue] Registering push token with Supabase');
          await registerPushTokenForUser({
            userId: session.user.id,
            expoPushToken: token,
            platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
          });
          console.log('[DebugAppLoadingIssue] Finished registerPushTokenForUser');
        }
      }
    }).catch((error) => {
      console.error('[Auth] Failed to get session:', error);
      console.error('[DebugAppLoadingIssue] getSession threw error, setting isLoading=false');
      markAuthReady();
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] State changed:', _event, session ? 'active' : 'none');
        console.log('[DebugAppLoadingIssue] onAuthStateChange received event:', _event);
        set({ session });

        if (session?.user?.id) {
          console.log('[DebugAppLoadingIssue] onAuthStateChange: session has user, requesting Expo push token');
          const token = await getExpoPushToken();
          console.log('[DebugAppLoadingIssue] onAuthStateChange: getExpoPushToken result:', token);
          if (token) {
            console.log('[DebugAppLoadingIssue] onAuthStateChange: registering push token with Supabase');
            await registerPushTokenForUser({
              userId: session.user.id,
              expoPushToken: token,
              platform:
                Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
            });
            console.log('[DebugAppLoadingIssue] onAuthStateChange: finished registerPushTokenForUser');
          }
        }
      },
    );

    return () => {
      if (authReadyTimeout) {
        clearTimeout(authReadyTimeout);
        authReadyTimeout = null;
      }
      linkSubscription.remove();
      subscription.unsubscribe();
    };
  },

  signOut: async () => {
    try {
      // Immediately clear local session so the UI returns to the sign-in screen
      set({ session: null });

      await useOnboardingStore.getState().resetOnboarding();
      if (supabase) {
        await supabase.auth.signOut();
      }
      console.log('[Auth] Signed out');
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
    }
  },
}));
