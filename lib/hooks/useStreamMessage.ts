import { useCallback, useEffect, useRef, useState } from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { getStreamDisplayName, resolveStreamClient } from '@/lib/stream/resolveStreamClient';
import { COMMUNITY_CHANNEL } from '@/lib/stream/channels';

export type StreamMessageStats = {
  likeCount: number;
  replyCount: number;
};

type StreamMessageLike = {
  id?: string;
  reaction_counts?: Record<string, number>;
  reply_count?: number;
};

function mapMessageStats(message: StreamMessageLike): StreamMessageStats {
  return {
    likeCount: message.reaction_counts?.like ?? 0,
    replyCount: message.reply_count ?? 0,
  };
}

export function useStreamMessage(messageId: string | null | undefined) {
  const storeClient = useCommunityStore((state) => state.client);
  const storeConnected = useCommunityStore((state) => state.isConnected);
  const { session } = useAuthStore();
  const { username } = useOnboardingStore();
  const [stats, setStats] = useState<StreamMessageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messageIdRef = useRef(messageId);
  messageIdRef.current = messageId;

  const refetch = useCallback(async () => {
    const id = messageIdRef.current?.trim();
    if (!id || !session?.user) return;

    try {
      const client = await resolveStreamClient({
        existingClient: storeClient,
        existingConnected: storeConnected,
        userId: session.user.id,
        displayName: getStreamDisplayName(username, session.user.email),
      });
      if (!client) return;

      const response = await client.getMessage(id);
      setStats(mapMessageStats(response.message));
    } catch (err) {
      console.warn('[useStreamMessage] Failed to refetch message', err);
    }
  }, [session?.user, storeClient, storeConnected, username]);

  useEffect(() => {
    const id = messageId?.trim();
    if (!id || !session?.user) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let removeListeners: (() => void) | undefined;

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
        setStats(mapMessageStats(response.message));

        const channel = client.channel('messaging', COMMUNITY_CHANNEL.id, {
          name: COMMUNITY_CHANNEL.name,
          description: COMMUNITY_CHANNEL.description,
        } as Record<string, unknown>);
        await channel.watch();
        if (cancelled) return;

        const refreshParent = () => {
          void client.getMessage(id).then((latest) => {
            if (!cancelled) {
              setStats(mapMessageStats(latest.message));
            }
          }).catch((err) => {
            console.warn('[useStreamMessage] Failed to refresh message', err);
          });
        };

        const handleMessageUpdated = (event: { message?: StreamMessageLike }) => {
          if (event.message?.id === id) {
            setStats(mapMessageStats(event.message));
          }
        };

        const handleMessageNew = (event: { message?: { parent_id?: string } }) => {
          if (event.message?.parent_id === id) {
            refreshParent();
          }
        };

        const handleReaction = (event: {
          message?: StreamMessageLike;
          reaction?: { message_id?: string };
        }) => {
          const targetId = event.message?.id ?? event.reaction?.message_id;
          if (targetId === id) {
            refreshParent();
          }
        };

        channel.on('message.updated', handleMessageUpdated);
        channel.on('message.new', handleMessageNew);
        channel.on('reaction.new', handleReaction);
        channel.on('reaction.deleted', handleReaction);

        removeListeners = () => {
          channel.off('message.updated', handleMessageUpdated);
          channel.off('message.new', handleMessageNew);
          channel.off('reaction.new', handleReaction);
          channel.off('reaction.deleted', handleReaction);
        };
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

    void load();

    return () => {
      cancelled = true;
      removeListeners?.();
    };
  }, [messageId, storeClient, storeConnected, session?.user?.id, session?.user?.email, username]);

  return { stats, isLoading, refetch };
}
