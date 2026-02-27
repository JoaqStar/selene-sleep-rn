import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  userName: string;
  isOnboarded: boolean;
  isLoading: boolean;
  setUserName: (name: string) => void;
  completeOnboarding: (name: string) => Promise<void>;
  loadOnboardingState: () => Promise<void>;
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

  loadOnboardingState: async () => {
    try {
      const [name, onboarded] = await Promise.all([
        AsyncStorage.getItem('selene_user_name'),
        AsyncStorage.getItem('selene_onboarded'),
      ]);
      set({
        userName: name ?? '',
        isOnboarded: onboarded === 'true',
        isLoading: false,
      });
      console.log('Onboarding state loaded:', { name, onboarded });
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
      set({ isLoading: false });
    }
  },
}));
