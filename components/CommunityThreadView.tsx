import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Send, ThumbsUp, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useStreamClient } from '@/lib/hooks/useStreamClient';
import { useAuthStore } from '@/stores/authStore';
import { COMMUNITY_CHANNEL } from '@/lib/stream/channels';
import { ensureCommunityChannelMembership, getCommunityChannel } from '@/lib/stream/ensureCommunityChannelMembership';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LinkableText } from '@/components/LinkableText';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

interface ThreadMessage {
  id: string;
  text: string;
  user?: {
    id: string;
    name?: string;
  };
  created_at: string;
  reaction_counts?: Record<string, number>;
  own_reactions?: Array<{ type: string }>;
}

function mapThreadMessage(m: {
  id: string;
  text?: string;
  user?: { id: string; name?: string };
  created_at: string;
  reaction_counts?: Record<string, number>;
  own_reactions?: Array<{ type: string }>;
}): ThreadMessage {
  return {
    id: m.id,
    text: m.text ?? '',
    user: m.user ? { id: m.user.id, name: m.user.name } : undefined,
    created_at: m.created_at,
    reaction_counts: m.reaction_counts,
    own_reactions: m.own_reactions,
  };
}

type CommunityThreadViewProps = {
  messageId: string;
  channelId?: string;
  backLabel: string;
};

export function CommunityThreadView({ messageId, channelId, backLabel }: CommunityThreadViewProps) {
  const { client, isReady: isClientReady } = useStreamClient();
  const { session } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [parentMessage, setParentMessage] = useState<ThreadMessage | null>(null);
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const resolvedChannelId = channelId ?? COMMUNITY_CHANNEL.id;

  useEffect(() => {
    if (!client || !resolvedChannelId || !messageId) return;

    let isSubscribed = true;
    let tearDownListeners: (() => void) | undefined;

    const setupThread = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (session?.access_token) {
          await ensureCommunityChannelMembership(session.access_token);
        }

        const ch = await getCommunityChannel(client);
        channelRef.current = ch;

        let parent = (ch.state.messages ?? []).find((m: any) => m.id === messageId);
        if (!parent) {
          const response = await client.getMessage(messageId);
          parent = response.message;
        }

        if (!parent && isSubscribed) {
          setError('Post not found');
          setIsLoading(false);
          return;
        }

        if (parent && isSubscribed) {
          setParentMessage(mapThreadMessage(parent));
        }

        const result = await ch.getReplies(messageId, { limit: 50 });
        const rawReplies = Array.isArray(result) ? result : (result?.messages ?? []);
        const replyList = rawReplies.map((m: any) => mapThreadMessage(m));
        if (isSubscribed) {
          setReplies(replyList);
        }

        const appendReply = (msg: {
          id: string;
          parent_id?: string;
          text?: string;
          user?: { id: string; name?: string };
          created_at: string;
          reaction_counts?: Record<string, number>;
          own_reactions?: Array<{ type: string }>;
        }) => {
          if (!isSubscribed || msg.parent_id !== messageId) return;
          setReplies((prev) => {
            if (prev.some((reply) => reply.id === msg.id)) return prev;
            return [...prev, mapThreadMessage(msg)];
          });
        };

        const onMessageNew = (event: { message?: { parent_id?: string } & Parameters<typeof appendReply>[0] }) => {
          const msg = event.message;
          if (!msg) return;
          appendReply(msg);
        };

        const onMessageUpdated = (event: { message?: { id: string; parent_id?: string } & Parameters<typeof appendReply>[0] }) => {
          if (!isSubscribed) return;
          const msg = event.message;
          if (!msg) return;

          if (msg.id === messageId) {
            setParentMessage((prev) => (prev ? mapThreadMessage(msg) : prev));
          }

          if (msg.parent_id === messageId) {
            setReplies((prev) =>
              prev.map((m) => (m.id === msg.id ? mapThreadMessage(msg) : m)),
            );
          }
        };

        const onMessageDeleted = (event: { message?: { id: string; parent_id?: string } }) => {
          if (!isSubscribed) return;
          const msg = event.message;
          if (!msg || msg.parent_id !== messageId) return;
          setReplies((prev) => prev.filter((reply) => reply.id !== msg.id));
        };

        ch.on('message.new', onMessageNew);
        ch.on('message.updated', onMessageUpdated);
        ch.on('message.deleted', onMessageDeleted);

        tearDownListeners = () => {
          ch.off('message.new', onMessageNew);
          ch.off('message.updated', onMessageUpdated);
          ch.off('message.deleted', onMessageDeleted);
        };
      } catch (err) {
        console.error('[CommunityThreadView] Setup error:', err);
        if (isSubscribed) {
          setError('Failed to load thread. Please try again.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    setupThread();

    return () => {
      isSubscribed = false;
      tearDownListeners?.();
    };
  }, [client, resolvedChannelId, messageId, session?.access_token]);

  useEffect(() => {
    if (!flatListRef.current) return;
    const hasData = parentMessage !== null || replies.length > 0;
    if (!hasData) return;
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 0);
    return () => clearTimeout(timeout);
  }, [parentMessage?.id, replies.length]);

  const handleSendReply = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !client || !isClientReady || isSending || !messageId) return;

    setIsSending(true);
    setReplyError(null);
    setInputText('');

    try {
      if (session?.access_token) {
        await ensureCommunityChannelMembership(session.access_token);
      }

      const channel = channelRef.current ?? (await getCommunityChannel(client));
      channelRef.current = channel;

      const { message: sentMessage } = await channel.sendMessage({
        text,
        parent_id: messageId,
      });

      if (!sentMessage?.id) {
        throw new Error('Comment was not created');
      }

      setReplies((prev) => {
        if (prev.some((reply) => reply.id === sentMessage.id)) return prev;
        return [...prev, mapThreadMessage(sentMessage)];
      });

      flatListRef.current?.scrollToEnd({ animated: true });

      if (hasSupabaseConfig && supabase && parentMessage?.user?.id && session?.user?.id) {
        const postOwnerId = parentMessage.user.id;
        const actorUserId = session.user.id;
        if (postOwnerId !== actorUserId) {
          const snippet = text.slice(0, 80);
          const url = `${getSupabaseUrl()}/functions/v1/notify-comment`;
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              postOwnerId,
              actorUserId,
              messageSnippet: snippet,
            }),
          }).catch((notifyErr) => {
            console.error('[CommunityThreadView] notify-comment error:', notifyErr);
          });
        }
      }
    } catch (err) {
      console.error('[CommunityThreadView] Send reply error:', err);
      const message = "Couldn't post your comment. Check your connection and try again.";
      setInputText(text);
      setReplyError(message);
      Alert.alert("Couldn't post comment", message);
    } finally {
      setIsSending(false);
    }
  }, [client, inputText, isClientReady, isSending, messageId, parentMessage, session?.access_token, session?.user?.id]);

  const currentUserId = session?.user?.id;

  const handleLikeToggle = useCallback(
    async (messageIdToToggle: string, hasLiked: boolean, isParent: boolean) => {
      const ch = channelRef.current;
      const uid = session?.user?.id;
      if (!ch || !uid) return;

      const updateOne = (m: ThreadMessage): ThreadMessage => {
        const currentLikeCount = m.reaction_counts?.like ?? 0;
        const own = m.own_reactions ?? [];

        if (hasLiked) {
          const nextCount = Math.max(currentLikeCount - 1, 0);
          return {
            ...m,
            reaction_counts: { ...(m.reaction_counts ?? {}), like: nextCount },
            own_reactions: own.filter((r) => r.type !== 'like'),
          };
        }

        const nextCount = currentLikeCount + 1;
        return {
          ...m,
          reaction_counts: { ...(m.reaction_counts ?? {}), like: nextCount },
          own_reactions: [...own, { type: 'like' }],
        };
      };

      if (isParent) {
        setParentMessage((prev) => (prev && prev.id === messageIdToToggle ? updateOne(prev) : prev));
      }

      setReplies((prev) =>
        prev.map((m) => (m.id === messageIdToToggle ? updateOne(m) : m)),
      );

      try {
        if (hasLiked) {
          await ch.deleteReaction(messageIdToToggle, 'like', uid);
        } else {
          await ch.sendReaction(messageIdToToggle, { type: 'like' });

          if (hasSupabaseConfig && supabase) {
            const target = isParent
              ? parentMessage
              : replies.find((m) => m.id === messageIdToToggle);
            const postOwnerId = target?.user?.id;
            if (postOwnerId && postOwnerId !== uid) {
              const snippet = (target?.text ?? '').slice(0, 80);
              const url = `${getSupabaseUrl()}/functions/v1/notify-like`;
              fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  postOwnerId,
                  actorUserId: uid,
                  messageSnippet: snippet,
                }),
              }).catch((notifyErr) => {
                console.error('[CommunityThreadView] notify-like error:', notifyErr);
              });
            }
          }
        }
      } catch (err) {
        console.error('[CommunityThreadView] Reaction error:', err);
      }
    },
    [session?.user?.id, parentMessage, replies],
  );

  const handleDeleteReply = useCallback((replyId: string) => {
    Alert.alert(
      'Delete comment',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!client) return;

              let removedReply: ThreadMessage | undefined;
              setDeletingReplyId(replyId);
              setReplies((prev) => {
                removedReply = prev.find((reply) => reply.id === replyId);
                return prev.filter((reply) => reply.id !== replyId);
              });

              try {
                await client.deleteMessage(replyId, true);
              } catch (err) {
                console.error('[CommunityThreadView] Delete reply error:', err);
                if (removedReply) {
                  setReplies((prev) => {
                    if (prev.some((reply) => reply.id === removedReply!.id)) return prev;
                    return [...prev, removedReply!].sort(
                      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                    );
                  });
                }
                Alert.alert('Could not delete comment', 'Please try again.');
              } finally {
                setDeletingReplyId(null);
              }
            })();
          },
        },
      ],
    );
  }, [client]);

  const renderMessage = useCallback(
    ({ item }: { item: ThreadMessage }) => {
      const isOwn = item.user?.id === currentUserId;
      const displayName = item.user?.name ?? 'Anonymous';
      const time = new Date(item.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const likeCount = item.reaction_counts?.like ?? 0;
      const hasLiked = item.own_reactions?.some((r) => r.type === 'like') ?? false;
      const isParent = parentMessage && item.id === parentMessage.id;
      const commentCount = isParent ? replies.length : 0;

      return (
        <View style={[styles.messageBubbleWrap, isOwn && styles.messageBubbleWrapOwn]}>
          {!isOwn && <Text style={styles.messageSender}>{displayName}</Text>}
          <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
            <LinkableText
              style={[styles.messageText, isOwn && styles.messageTextOwn]}
              linkStyle={isOwn ? styles.messageLinkOwn : styles.messageLink}
            >
              {item.text}
            </LinkableText>
          </View>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>{time}</Text>
          <View style={styles.messageActions}>
            <Pressable
              onPress={() => handleLikeToggle(item.id, hasLiked, !!isParent)}
              style={styles.messageActionButton}
              hitSlop={8}
            >
              <ThumbsUp
                size={14}
                color={hasLiked ? Colors.accent : Colors.textMuted}
                fill={hasLiked ? Colors.accent : 'transparent'}
              />
              <Text style={[styles.messageActionText, hasLiked && styles.messageActionTextActive]}>
                {likeCount > 0 ? likeCount : 'Like'}
              </Text>
            </Pressable>
            {isParent && commentCount > 0 && (
              <Text style={styles.messageActionText}>
                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
              </Text>
            )}
            {isOwn && !isParent && (
              <Pressable
                onPress={() => handleDeleteReply(item.id)}
                disabled={deletingReplyId === item.id}
                style={styles.messageActionButton}
                hitSlop={8}
                accessibilityLabel="Delete comment"
              >
                {deletingReplyId === item.id ? (
                  <ActivityIndicator size="small" color={Colors.textMuted} />
                ) : (
                  <Trash2 size={14} color={Colors.textMuted} />
                )}
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [currentUserId, parentMessage, replies.length, handleLikeToggle, handleDeleteReply, deletingReplyId],
  );

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!client || !isClientReady || isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading thread...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const listData = parentMessage ? [parentMessage, ...replies] : [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScreenHeader title="Thread" backLabel={backLabel} containerStyle={styles.header} />

      {listData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No replies yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to reply</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {replyError ? (
          <Text style={styles.replyErrorText}>{replyError}</Text>
        ) : null}
        <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Add a reply..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={(value) => {
            setInputText(value);
            if (replyError) setReplyError(null);
          }}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSendReply}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSendReply}
          disabled={!inputText.trim() || isSending}
          style={({ pressed }) => [
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Send size={18} color={inputText.trim() ? Colors.background : Colors.textMuted} />
          )}
        </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function getSupabaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 15,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  messageList: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },
  messageBubbleWrap: {
    marginBottom: 12,
    maxWidth: '80%' as any,
    alignSelf: 'flex-start' as const,
  },
  messageBubbleWrapOwn: {
    alignSelf: 'flex-end' as const,
  },
  messageSender: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600' as const,
    marginBottom: 3,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleOther: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 4,
  },
  messageBubbleOwn: {
    backgroundColor: Colors.accent,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  messageTextOwn: {
    color: Colors.background,
  },
  messageLink: {
    color: Colors.accent,
  },
  messageLinkOwn: {
    color: Colors.background,
    textDecorationLine: 'underline',
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
    marginLeft: 4,
  },
  messageTimeOwn: {
    textAlign: 'right' as const,
    marginRight: 4,
    marginLeft: 0,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
    marginLeft: 4,
  },
  messageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageActionText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageActionTextActive: {
    color: Colors.accent,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyErrorText: {
    fontSize: 13,
    color: Colors.error,
    lineHeight: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surface,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
});
