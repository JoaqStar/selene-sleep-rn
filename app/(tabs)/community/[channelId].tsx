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
} from 'react-native';
import { useLocalSearchParams, Redirect, useRouter } from 'expo-router';
import { Send, ThumbsUp, MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { COMMUNITY_CHANNELS } from '@/lib/stream/channels';
import { ScreenHeader } from '@/components/ScreenHeader';

interface StreamMessage {
  id: string;
  text: string;
  user?: {
    id: string;
    name?: string;
  };
  created_at: string;
  reaction_counts?: Record<string, number>;
  own_reactions?: Array<{ type: string }>;
  reply_count?: number;
}

export default function ChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const router = useRouter();
  const { client } = useCommunityStore();
  const { session } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const channelConfig = COMMUNITY_CHANNELS.find((c) => c.id === channelId);
  const channelName = channelConfig?.name ?? channelId ?? 'Channel';

  useEffect(() => {
    if (!client || !channelId) return;

    let isSubscribed = true;

    const setupChannel = async () => {
      setIsLoading(true);
      setError(null);
      console.log('[ChannelScreen] Setting up channel:', channelId);

      try {
        const ch = client.channel('messaging', channelId, {
          name: channelName,
          description: channelConfig?.description,
        } as Record<string, unknown>);

        await ch.watch();
        channelRef.current = ch;
        console.log('[ChannelScreen] Channel ready:', channelId);

        const mapMessage = (m: any) => ({
          id: m.id,
          text: m.text ?? '',
          user: m.user ? { id: m.user.id, name: m.user.name } : undefined,
          created_at: m.created_at,
          reaction_counts: m.reaction_counts,
          own_reactions: m.own_reactions,
          reply_count: m.reply_count ?? 0,
        });

        const existingMessages = (ch.state.messages ?? [])
          .filter((m: any) => !m.parent_id)
          .map(mapMessage);

        if (isSubscribed) {
          setMessages(existingMessages);
        }

        ch.on('message.new', (event: any) => {
          if (!isSubscribed) return;
          const msg = event.message;
          if (!msg || msg.parent_id) return;
          setMessages((prev) => [...prev, mapMessage(msg)]);
        });

        ch.on('message.updated', (event: any) => {
          if (!isSubscribed) return;
          const msg = event.message;
          if (!msg || msg.parent_id) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? mapMessage(msg) : m)),
          );
        });
      } catch (err) {
        console.error('[ChannelScreen] Channel setup error:', err);
        if (isSubscribed) {
          setError('Failed to load channel. Please try again.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    setupChannel();

    return () => {
      isSubscribed = false;
      if (channelRef.current) {
        channelRef.current.stopWatching().catch((err: any) => {
          console.error('[ChannelScreen] Stop watching error:', err);
        });
      }
    };
  }, [client, channelId, channelName, channelConfig?.description]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !channelRef.current || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      await channelRef.current.sendMessage({ text });
    } catch (err) {
      console.error('[ChannelScreen] Send error:', err);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending]);

  const handleLikeToggle = useCallback(
    async (messageId: string, hasLiked: boolean) => {
      const ch = channelRef.current;
      const uid = session?.user?.id;
      if (!ch || !uid) return;

      // Optimistic update so the UI responds immediately
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;

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
        }),
      );

      try {
        if (hasLiked) {
          await ch.deleteReaction(messageId, 'like', uid);
        } else {
          await ch.sendReaction(messageId, { type: 'like' });
        }
      } catch (err) {
        console.error('[ChannelScreen] Reaction error:', err);
        // Optional: could revert optimistic change here on error
      }
    },
    [session?.user?.id],
  );

  const handleOpenThread = useCallback(
    (messageId: string) => {
      if (!channelId) return;
      router.push({
        pathname: '/community/thread',
        params: { messageId, channelId },
      });
    },
    [channelId, router],
  );

  const currentUserId = session?.user?.id;

  const renderMessage = useCallback(
    ({ item }: { item: StreamMessage }) => {
      const isOwn = item.user?.id === currentUserId;
      const displayName = item.user?.name ?? 'Anonymous';
      const time = new Date(item.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const likeCount = item.reaction_counts?.like ?? 0;
      const hasLiked = item.own_reactions?.some((r) => r.type === 'like') ?? false;
      const replyCount = item.reply_count ?? 0;

      return (
        <View style={[styles.messageBubbleWrap, isOwn && styles.messageBubbleWrapOwn]}>
          {!isOwn && <Text style={styles.messageSender}>{displayName}</Text>}
          <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{item.text}</Text>
          </View>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>{time}</Text>
          <View style={styles.messageActions}>
            <Pressable
              onPress={() => handleLikeToggle(item.id, hasLiked)}
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
            <Pressable
              onPress={() => handleOpenThread(item.id)}
              style={styles.messageActionButton}
              hitSlop={8}
            >
              <MessageCircle size={14} color={Colors.textMuted} />
              <Text style={styles.messageActionText}>
                {replyCount > 0 ? replyCount : 'Comment'}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [currentUserId, handleLikeToggle, handleOpenThread],
  );

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!client || isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading channel...</Text>
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScreenHeader title={channelName} backLabel="Community" />

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to start the conversation</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          testID="message-input"
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={({ pressed }) => [
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
          testID="send-button"
        >
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Send size={18} color={inputText.trim() ? Colors.background : Colors.textMuted} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    paddingHorizontal: 32,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    gap: 8,
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
