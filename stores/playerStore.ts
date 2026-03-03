import { create } from 'zustand';
import { Session } from '@/types';

interface PlayerState {
  currentSession: Session | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isBuffering: boolean;
  setCurrentSession: (session: Session) => void;
  setIsPlaying: (playing: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setIsBuffering: (buffering: boolean) => void;
  clearSession: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSession: null,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  isBuffering: false,

  setCurrentSession: (session: Session) => {
    console.log('Setting current session:', session.title);
    set({ currentSession: session, positionMillis: 0, durationMillis: session.duration_seconds * 1000 });
  },

  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setPosition: (position: number) => set({ positionMillis: position }),
  setDuration: (duration: number) => set({ durationMillis: duration }),
  setIsBuffering: (buffering: boolean) => set({ isBuffering: buffering }),

  clearSession: () => set({
    currentSession: null,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
    isBuffering: false,
  }),
}));
