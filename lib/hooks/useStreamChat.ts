import { useEffect, useState, useRef } from 'react';
import { StreamChat } from 'stream-chat';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { getStreamToken } from '@/lib/services/streamService';

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY ?? '';

export function useStreamChat() {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const connectingRef = useRef(false);
  const clientRef = useRef<StreamChat | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const { session } = useAuthStore();
  const { userName, username } = useOnboardingStore();

  useEffect(() => {
    if (!session?.user || !apiKey || connectingRef.current) return;

    const userId = session.user.id;
    const userEmail = session.user.email ?? 'user';
    const streamDisplayName =
      (username && username.trim().length > 0)
        ? username.trim()
        : (userName && userName.trim().length > 0)
          ? userName.trim()
          : userEmail.split('@')[0];

    const connectOnce = async () => {
      connectingRef.current = true;
      setError(null);
      console.log('[StreamChat] Connecting user:', userId);

      const chatClient = StreamChat.getInstance(apiKey);
      const streamToken = await getStreamToken(userId);

      await chatClient.connectUser(
        {
          id: userId,
          name: streamDisplayName,
        },
        streamToken,
      );

      console.log('[StreamChat] Connected successfully');
      clientRef.current = chatClient;
      setClient(chatClient);
      setIsConnected(true);
    };

    const connectWithRetry = async () => {
      try {
        await connectOnce();
      } catch (err: any) {
        console.error('[StreamChat] Connection error (first attempt):', err);
        const message = String(err?.message ?? err);
        const isNetworkError =
          message.includes('Network request failed') || message.includes('fetch failed');

        if (!isNetworkError) {
          setError(err instanceof Error ? err : new Error(message));
          connectingRef.current = false;
          return;
        }

        // Small backoff before retrying once
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          console.log('[StreamChat] Retrying connection after network error');
          await connectOnce();
        } catch (err2: any) {
          console.error('[StreamChat] Connection error (second attempt):', err2);
          setError(err2 instanceof Error ? err2 : new Error(String(err2?.message ?? err2)));
          connectingRef.current = false;
        }
      }
    };

    connectWithRetry();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const isActive = nextState === 'active';
      appStateRef.current = nextState;

      // Reduce background resource pressure while audio is playing in background.
      if (wasActive && !isActive && clientRef.current) {
        const existingClient = clientRef.current;
        clientRef.current = null;
        setClient(null);
        setIsConnected(false);
        connectingRef.current = false;
        existingClient.disconnectUser().catch((err) => {
          console.error('[StreamChat] Background disconnect error:', err);
        });
        return;
      }

      // Reconnect when app becomes active again.
      if (!wasActive && isActive && !clientRef.current && !connectingRef.current) {
        connectWithRetry();
      }
    });

    return () => {
      appStateSub.remove();
      if (clientRef.current) {
        console.log('[StreamChat] Disconnecting user');
        clientRef.current.disconnectUser().then(() => {
          console.log('[StreamChat] Disconnected');
        }).catch((err) => {
          console.error('[StreamChat] Disconnect error:', err);
        });
        clientRef.current = null;
        setClient(null);
        setIsConnected(false);
        connectingRef.current = false;
      }
    };
  }, [session?.user?.id, apiKey, userName, username]);

  const retry = () => {
    if (!session?.user || !apiKey) return;
    if (connectingRef.current) return;
    setIsConnected(false);
    setClient(null);
    setError(null);
    // effect will re-run because session.user.id/apiKey are stable; we can force by toggling a flag if needed
  };

  return { client, isConnected, error, retry };
}
