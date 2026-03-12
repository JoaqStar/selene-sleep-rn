import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';

interface OnboardingState {
  userName: string;
  isOnboarded: boolean;
  isLoading: boolean;
  setUserName: (name: string) => void;
  completeOnboarding: (name: string) => Promise<void>;
  loadOnboardingState: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  userName: '',
  isOnboarded: false,
  isLoading: true,

  setUserName: (name: string) => set({ userName: name }),

  completeOnboarding: async (name: string) => {
    try {
      const trimmed = name.trim();
      const finalName = trimmed.length > 0 ? trimmed : 'Friend';

      await AsyncStorage.setItem('selene_user_name', finalName);
      await AsyncStorage.setItem('selene_onboarded', 'true');
      set({ userName: finalName, isOnboarded: true });
      console.log('Onboarding completed for:', finalName);

      if (hasSupabaseConfig && supabase) {
        // Update auth metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: finalName,
          },
        });
        if (updateError) {
          console.error('[Onboarding] Failed to update Supabase user name (auth metadata):', updateError);
        }

        // Also sync into public.users.display_name so it shows up in your SQL users table
        try {
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('[Onboarding] Failed to fetch current user for users table sync:', userError);
          } else if (data?.user) {
            const upsertPayload: { id: string; email?: string | null; display_name: string } = {
              id: data.user.id,
              email: (data.user.email as string | null) ?? null,
              display_name: finalName,
            };

            const { error: tableError } = await supabase
              .from('users')
              .upsert(upsertPayload, { onConflict: 'id' });

            if (tableError) {
              console.error('[Onboarding] Failed to upsert users.display_name:', tableError);
            }
          }
        } catch (tableException) {
          console.error('[Onboarding] Unexpected error syncing users.display_name:', tableException);
        }
      }
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  },

  resetOnboarding: async () => {
    try {
      await AsyncStorage.removeItem('selene_user_name');
      await AsyncStorage.removeItem('selene_onboarded');
      set({ userName: '', isOnboarded: false });
      console.log('[Onboarding] State reset');
    } catch (error) {
      console.error('[Onboarding] Failed to reset:', error);
    }
  },

  loadOnboardingState: async () => {
    try {
      const [name, onboarded] = await Promise.all([
        AsyncStorage.getItem('selene_user_name'),
        AsyncStorage.getItem('selene_onboarded'),
      ]);
      const userName = name ?? '';
      const isOnboarded = onboarded === 'true' && userName.trim().length > 0;
      set({
        userName,
        isOnboarded,
        isLoading: false,
      });
      console.log('Onboarding state loaded:', { name: userName, onboarded });
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
      set({ isLoading: false });
    }
  },
}));
