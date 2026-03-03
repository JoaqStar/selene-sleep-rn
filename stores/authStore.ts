import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
