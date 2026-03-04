import { create } from 'zustand';
import { StreamChat } from 'stream-chat';

interface CommunityState {
  client: StreamChat | null;
  isConnected: boolean;
  setClient: (client: StreamChat | null) => void;
  setConnected: (connected: boolean) => void;
  clear: () => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  client: null,
  isConnected: false,

  setClient: (client) => {
    set({ client });
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  clear: () => {
    const state = useCommunityStore.getState();
    if (state.client) {
      state.client.disconnectUser().catch((err) => {
        console.error('[CommunityStore] Disconnect error:', err);
      });
    }
    set({ client: null, isConnected: false });
  },
}));
