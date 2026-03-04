import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Redirect, Stack } from 'expo-router';
import { Channel, MessageList, MessageInput } from 'stream-chat-expo';
import { Channel as ChannelType } from 'stream-chat';
import Colors from '@/constants/colors';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { COMMUNITY_CHANNELS } from '@/lib/stream/channels';

export default function ChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const { client } = useCommunityStore();
  const { session } = useAuthStore();
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelConfig = useMemo(
    () => COMMUNITY_CHANNELS.find((c) => c.id === channelId),
    [channelId],
  );

  const channelName = channelConfig?.name ?? channelId ?? 'Channel';
  const channelDescription = channelConfig?.description;

  useEffect(() => {
    if (!client || !channelId) return;

    const setupChannel = async () => {
      setIsLoading(true);
      setError(null);
      console.log('[ChannelScreen] Setting up channel:', channelId);

      try {
        const ch = client.channel('messaging', channelId, {
          name: channelName,
          description: channelDescription,
        } as Record<string, unknown>);

        await ch.watch();
        console.log('[ChannelScreen] Channel ready:', channelId);
        setChannel(ch);
      } catch (err) {
        console.error('[ChannelScreen] Channel setup error:', err);
        setError('Failed to load channel. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    setupChannel();
  }, [client, channelId, channelName, channelDescription]);

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (isLoading || !channel) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: channelConfig?.name ?? 'Channel' }} />
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading channel...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: channelConfig?.name ?? 'Channel' }} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: channelConfig?.name ?? 'Channel' }} />
      <Channel channel={channel}>
        <MessageList />
        <MessageInput />
      </Channel>
    </View>
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
});
