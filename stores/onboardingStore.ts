import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import { fetchCurrentUserProfile, claimUsername } from '@/lib/services/usernameService';
import { deriveUsernameFromLabel, isProvisionalUsername } from '@/lib/user/username';

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
  username: string;
  isOnboarded: boolean;
  hasUsername: boolean;
  usernameDbReady: boolean;
  isLoading: boolean;
  profileLoading: boolean;
  profileChecked: boolean;
  setUsername: (username: string) => void;
  completeOnboarding: (username: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  loadOnboardingState: () => Promise<void>;
  loadUserProfile: (userId?: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  username: '',
  isOnboarded: false,
  hasUsername: false,
  usernameDbReady: true,
  isLoading: true,
  profileLoading: false,
  profileChecked: false,

  setUsername: (username: string) => set({ username }),

  completeOnboarding: async (username: string) => {
    const result = await claimUsername(username);
    if (!result.ok) {
      return result;
    }

    try {
      await AsyncStorage.setItem('selene_username', result.username);
      await AsyncStorage.setItem('selene_onboarded', 'true');
      await AsyncStorage.removeItem('selene_user_name');
      set({
        username: result.username,
        isOnboarded: true,
        hasUsername: true,
      });
      console.log('[Onboarding] completed:', result.username);
      return { ok: true };
    } catch (error) {
      console.error('[Onboarding] Failed to save local state:', error);
      return { ok: false, error: 'Could not save profile locally. Try again.' };
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

        let storedUsername = profile.username?.trim() ?? '';

        if (storedUsername && isProvisionalUsername(storedUsername)) {
          let metaLabel = '';
          if (hasSupabaseConfig && supabase) {
            const { data: authData } = await supabase.auth.getUser();
            const meta = (authData.user?.user_metadata ?? {}) as Record<string, unknown>;
            metaLabel =
              (typeof meta.full_name === 'string' && meta.full_name) ||
              (typeof meta.name === 'string' && meta.name) ||
              '';
          }
          const label = profile.display_name?.trim() || metaLabel.trim();
          const derived = deriveUsernameFromLabel(label);
          if (derived) {
            const claim = await claimUsername(derived);
            if (claim.ok) {
              storedUsername = claim.username;
            }
          }
        }

        const hasRealUsername =
          storedUsername.length > 0 && !isProvisionalUsername(storedUsername);

        const updates: Partial<OnboardingState> = {
          hasUsername: hasRealUsername,
          usernameDbReady: true,
          isOnboarded: hasRealUsername,
        };

        if (hasRealUsername) {
          updates.username = storedUsername;
          await AsyncStorage.setItem('selene_username', storedUsername);
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
      await AsyncStorage.multiRemove(['selene_username', 'selene_onboarded', 'selene_user_name']);
      set({
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
      const [legacyName, username, onboarded] = await Promise.all([
        AsyncStorage.getItem('selene_user_name'),
        AsyncStorage.getItem('selene_username'),
        AsyncStorage.getItem('selene_onboarded'),
      ]);

      let storedUsername = username ?? '';
      if (!storedUsername.trim() && legacyName?.trim()) {
        const derived = deriveUsernameFromLabel(legacyName);
        if (derived) {
          storedUsername = derived;
        }
      }

      const hasUsername = storedUsername.trim().length > 0;
      const isOnboarded = onboarded === 'true' && hasUsername;

      set({
        username: storedUsername,
        isOnboarded,
        hasUsername,
        isLoading: false,
      });
      console.log('[Onboarding] state loaded:', { username: storedUsername, onboarded: isOnboarded });
    } catch (error) {
      console.error('[Onboarding] Failed to load state:', error);
      set({ isLoading: false });
    }
  },
}));
