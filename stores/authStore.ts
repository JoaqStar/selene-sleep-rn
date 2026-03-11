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
    const handleDeepLink = async (url: string) => {
      console.log('[Auth] Deep link received:', url);
      try {
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return;
        const fragment = url.substring(hashIndex + 1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          console.log('[Auth] Setting session from deep link tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('[Auth] setSession error:', error);
          } else {
            console.log('[Auth] Session set from deep link:', data.session ? 'active' : 'none');
          }
        }
      } catch (e) {
        console.error('[Auth] Deep link handling error:', e);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Initial session:', session ? 'active' : 'none');
      console.log('[Auth] Initial session token:', session?.access_token);
      set({ session, isLoading: false });

      if (session?.user?.id) {
        const token = await getExpoPushToken();
        if (token) {
          await registerPushTokenForUser({
            userId: session.user.id,
            expoPushToken: token,
            platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
          });
        }
      }
    }).catch((error) => {
      console.error('[Auth] Failed to get session:', error);
      set({ isLoading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] State changed:', _event, session ? 'active' : 'none');
        set({ session });

        if (session?.user?.id) {
          const token = await getExpoPushToken();
          if (token) {
            await registerPushTokenForUser({
              userId: session.user.id,
              expoPushToken: token,
              platform:
                Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
            });
          }
        }
      },
    );

    return () => {
      linkSubscription.remove();
      subscription.unsubscribe();
    };
  },

  signOut: async () => {
    try {
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
