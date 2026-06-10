import { useEffect, useState } from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { getStreamDisplayName, resolveStreamClient } from '@/lib/stream/resolveStreamClient';

export type StreamMessageStats = {
  likeCount: number;
  replyCount: number;
};

export function useStreamMessage(messageId: string | null | undefined) {
  const storeClient = useCommunityStore((state) => state.client);
  const storeConnected = useCommunityStore((state) => state.isConnected);
  const { session } = useAuthStore();
  const { username } = useOnboardingStore();
  const [stats, setStats] = useState<StreamMessageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const id = messageId?.trim();
    if (!id || !session?.user) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const client = await resolveStreamClient({
          existingClient: storeClient,
          existingConnected: storeConnected,
          userId: session.user.id,
          displayName: getStreamDisplayName(username, session.user.email),
        });
        if (!client || cancelled) return;

        const response = await client.getMessage(id);
        if (cancelled) return;

        const message = response.message;
        setStats({
          likeCount: message.reaction_counts?.like ?? 0,
          replyCount: message.reply_count ?? 0,
        });
      } catch (err) {
        console.warn('[useStreamMessage] Failed to load message', err);
        if (!cancelled) {
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [messageId, storeClient, storeConnected, session?.user?.id, session?.user?.email, username]);

  return { stats, isLoading };
}
