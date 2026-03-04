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
import { useLocalSearchParams, Redirect, Stack } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { COMMUNITY_CHANNELS } from '@/lib/stream/channels';

interface StreamMessage {
  id: string;
  text: string;
  user?: {
    id: string;
    name?: string;
  };
  created_at: string;
}

export default function ChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
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

        const existingMessages = (ch.state.messages ?? []).map((m: any) => ({
          id: m.id,
          text: m.text ?? '',
          user: m.user ? { id: m.user.id, name: m.user.name } : undefined,
          created_at: m.created_at,
        }));

        if (isSubscribed) {
          setMessages(existingMessages);
        }

        ch.on('message.new', (event: any) => {
          if (!isSubscribed) return;
          const msg = event.message;
          if (!msg) return;
          setMessages((prev) => [
            ...prev,
            {
              id: msg.id,
              text: msg.text ?? '',
              user: msg.user ? { id: msg.user.id, name: msg.user.name } : undefined,
              created_at: msg.created_at,
            },
          ]);
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

  const currentUserId = session?.user?.id;

  const renderMessage = useCallback(
    ({ item }: { item: StreamMessage }) => {
      const isOwn = item.user?.id === currentUserId;
      const displayName = item.user?.name ?? 'Anonymous';
      const time = new Date(item.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <View style={[styles.messageBubbleWrap, isOwn && styles.messageBubbleWrapOwn]}>
          {!isOwn && <Text style={styles.messageSender}>{displayName}</Text>}
          <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{item.text}</Text>
          </View>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>{time}</Text>
        </View>
      );
    },
    [currentUserId],
  );

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!client || isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: channelName }} />
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading channel...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: channelName }} />
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
      <Stack.Screen options={{ title: channelName }} />

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
