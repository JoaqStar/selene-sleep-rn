import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session:', session ? 'active' : 'none');
      set({ session, isLoading: false });
    }).catch((error) => {
      console.error('[Auth] Failed to get session:', error);
      set({ isLoading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] State changed:', _event, session ? 'active' : 'none');
      set({ session });
    });

    return () => {
      linkSubscription.remove();
      subscription.unsubscribe();
    };
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      console.log('[Auth] Signed out');
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
    }
  },
}));
