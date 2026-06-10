import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { getStreamDisplayName, resolveStreamClient } from '@/lib/stream/resolveStreamClient';

export function useStreamClient() {
  const storeClient = useCommunityStore((state) => state.client);
  const storeConnected = useCommunityStore((state) => state.isConnected);
  const { session } = useAuthStore();
  const { username } = useOnboardingStore();
  const [client, setClient] = useState<StreamChat | null>(storeClient);
  const [isReady, setIsReady] = useState(storeConnected);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setClient(null);
      setIsReady(false);
      return;
    }

    if (storeClient && storeConnected) {
      setClient(storeClient);
      setIsReady(true);
      setError(null);
      return;
    }

    let cancelled = false;
    const userId = session.user.id;
    const displayName = getStreamDisplayName(username, session.user.email);

    resolveStreamClient({
      existingClient: storeClient,
      existingConnected: storeConnected,
      userId,
      displayName,
    })
      .then((resolvedClient) => {
        if (cancelled) return;
        setClient(resolvedClient);
        setIsReady(Boolean(resolvedClient));
        setError(null);
      })
      .catch((err) => {
        console.error('[useStreamClient] Failed to resolve client', err);
        if (!cancelled) {
          setClient(null);
          setIsReady(false);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.email, storeClient, storeConnected, username]);

  return { client, isReady, error };
}
