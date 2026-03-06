import { useEffect, useState, useRef } from 'react';
import { StreamChat } from 'stream-chat';
import { useAuthStore } from '@/stores/authStore';
import { getStreamToken } from '@/lib/services/streamService';

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY ?? '';

export function useStreamChat() {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectingRef = useRef(false);
  const clientRef = useRef<StreamChat | null>(null);

  const { session } = useAuthStore();

  useEffect(() => {
    if (!session?.user || !apiKey || connectingRef.current) return;

    const userId = session.user.id;
    const userEmail = session.user.email ?? 'user';

    const connect = async () => {
      connectingRef.current = true;
      console.log('[StreamChat] Connecting user:', userId);

      try {
        const chatClient = StreamChat.getInstance(apiKey);
        const streamToken = await getStreamToken(userId);

        await chatClient.connectUser(
          {
            id: userId,
            name: userEmail.split('@')[0],
          },
          streamToken,
        );

        console.log('[StreamChat] Connected successfully');
        clientRef.current = chatClient;
        setClient(chatClient);
        setIsConnected(true);
      } catch (error) {
        console.error('[StreamChat] Connection error:', error);
        connectingRef.current = false;
      }
    };

    connect();

    return () => {
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
  }, [session?.user?.id, apiKey]);

  return { client, isConnected };
}
