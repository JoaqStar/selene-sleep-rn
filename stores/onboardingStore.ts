import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import { fetchCurrentUserProfile, syncUserProfileFields } from '@/lib/services/usernameService';

let profileLoadInFlight: Promise<void> | null = null;
let profileLoadUserId: string | null = null;

const PROFILE_LOAD_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

interface OnboardingState {
  userName: string;
  username: string;
  isOnboarded: boolean;
  hasUsername: boolean;
  /** When false, DB migration for username is not applied — do not gate the app on username. */
  usernameDbReady: boolean;
  isLoading: boolean;
  profileLoading: boolean;
  /** True after the first profile fetch attempt finishes (success, error, or timeout). */
  profileChecked: boolean;
  setUserName: (name: string) => void;
  setUsername: (username: string) => void;
  completeOnboarding: (
    displayName: string,
    username: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateDisplayName: (displayName: string) => Promise<void>;
  loadOnboardingState: () => Promise<void>;
  loadUserProfile: (userId?: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  userName: '',
  username: '',
  isOnboarded: false,
  hasUsername: false,
  usernameDbReady: true,
  isLoading: true,
  profileLoading: false,
  profileChecked: false,

  setUserName: (name: string) => set({ userName: name }),

  setUsername: (username: string) => set({ username }),

  completeOnboarding: async (displayName: string, username: string) => {
    const trimmedDisplay = displayName.trim();
    const finalDisplay = trimmedDisplay.length > 0 ? trimmedDisplay : 'Friend';

    const result = await syncUserProfileFields({
      displayName: finalDisplay,
      username,
    });

    if (!result.ok) {
      return result;
    }

    try {
      await AsyncStorage.setItem('selene_user_name', finalDisplay);
      await AsyncStorage.setItem('selene_username', username.trim().toLowerCase());
      await AsyncStorage.setItem('selene_onboarded', 'true');
      set({
        userName: finalDisplay,
        username: username.trim().toLowerCase(),
        isOnboarded: true,
        hasUsername: true,
      });
      console.log('[Onboarding] completed:', { display: finalDisplay, username });
      return { ok: true };
    } catch (error) {
      console.error('[Onboarding] Failed to save local state:', error);
      return { ok: false, error: 'Could not save profile locally. Try again.' };
    }
  },

  updateDisplayName: async (displayName: string) => {
    const trimmed = displayName.trim();
    const finalName = trimmed.length > 0 ? trimmed : 'Friend';

    await AsyncStorage.setItem('selene_user_name', finalName);
    set({ userName: finalName });

    if (!hasSupabaseConfig || !supabase) return;

    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: finalName },
    });
    if (updateError) {
      console.error('[Onboarding] Failed to update auth metadata:', updateError);
    }

    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data?.user) return;

      const { error: tableError } = await supabase
        .from('users')
        .upsert(
          {
            id: data.user.id,
            email: data.user.email ?? null,
            display_name: finalName,
          },
          { onConflict: 'id' },
        );

      if (tableError) {
        console.error('[Onboarding] Failed to update display_name:', tableError);
      }
    } catch (tableException) {
      console.error('[Onboarding] Unexpected error updating display_name:', tableException);
    }
  },

  loadUserProfile: async (userId?: string) => {
    if (!userId) {
      set({ profileLoading: false, profileChecked: true });
      return;
    }

    if (profileLoadInFlight && profileLoadUserId === userId) {
      return profileLoadInFlight;
    }

    profileLoadUserId = userId;
    profileLoadInFlight = (async () => {
      set({ profileLoading: true, profileChecked: false });

      try {
        const profile = await withTimeout(
          fetchCurrentUserProfile(),
          PROFILE_LOAD_TIMEOUT_MS,
          'fetchCurrentUserProfile',
        );

        if (!profile) {
          set({ hasUsername: get().username.trim().length > 0 });
          return;
        }

        if (!profile.usernameDbReady) {
          const localUsername = get().username.trim();
          set({
            usernameDbReady: false,
            hasUsername: localUsername.length > 0,
          });
          return;
        }

        const hasUsername = Boolean(profile.username?.trim());
        const updates: Partial<OnboardingState> = {
          hasUsername,
          usernameDbReady: true,
        };

        if (profile.username) {
          updates.username = profile.username;
          await AsyncStorage.setItem('selene_username', profile.username);
        }
        if (profile.display_name?.trim()) {
          updates.userName = profile.display_name.trim();
          await AsyncStorage.setItem('selene_user_name', profile.display_name.trim());
        }

        const localName = get().userName.trim() || profile.display_name?.trim() || '';
        if (hasUsername && localName.length > 0) {
          updates.isOnboarded = true;
          await AsyncStorage.setItem('selene_onboarded', 'true');
        }

        set(updates);
      } catch (error) {
        console.error('[Onboarding] loadUserProfile failed:', error);
        const localUsername = get().username.trim();
        set({
          hasUsername: localUsername.length > 0,
        });
      } finally {
        set({ profileLoading: false, profileChecked: true });
        profileLoadInFlight = null;
        profileLoadUserId = null;
      }
    })();

    return profileLoadInFlight;
  },

  resetOnboarding: async () => {
    try {
      await AsyncStorage.multiRemove([
        'selene_user_name',
        'selene_username',
        'selene_onboarded',
      ]);
      set({
        userName: '',
        username: '',
        isOnboarded: false,
        hasUsername: false,
      });
      console.log('[Onboarding] State reset');
    } catch (error) {
      console.error('[Onboarding] Failed to reset:', error);
    }
  },

  loadOnboardingState: async () => {
    try {
      const [name, username, onboarded] = await Promise.all([
        AsyncStorage.getItem('selene_user_name'),
        AsyncStorage.getItem('selene_username'),
        AsyncStorage.getItem('selene_onboarded'),
      ]);
      const userName = name ?? '';
      const storedUsername = username ?? '';
      const isOnboarded =
        onboarded === 'true' &&
        userName.trim().length > 0 &&
        storedUsername.trim().length > 0;
      set({
        userName,
        username: storedUsername,
        isOnboarded,
        hasUsername: storedUsername.trim().length > 0,
        isLoading: false,
      });
      console.log('[Onboarding] state loaded:', {
        name: userName,
        username: storedUsername,
        onboarded: isOnboarded,
      });
    } catch (error) {
      console.error('[Onboarding] Failed to load state:', error);
      set({ isLoading: false });
    }
  },
}));
