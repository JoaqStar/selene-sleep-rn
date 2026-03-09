import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      await AsyncStorage.setItem('selene_user_name', name);
      await AsyncStorage.setItem('selene_onboarded', 'true');
      set({ userName: name, isOnboarded: true });
      console.log('Onboarding completed for:', name);
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
