import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useStreamMessage } from '@/lib/hooks/useStreamMessage';
import { COMMUNITY_CHANNEL } from '@/lib/stream/channels';

export type ArticleDiscussionStack = 'learn' | 'community' | 'home';

type ArticleCommunityEngagementProps = {
  streamMessageId: string;
  discussionStack: ArticleDiscussionStack;
};

function formatCount(count: number, singular: string, plural: string): string {
  const label = count === 1 ? singular : plural;
  return `${count} ${label}`;
}

export function ArticleCommunityEngagement({
  streamMessageId,
  discussionStack,
}: ArticleCommunityEngagementProps) {
  const router = useRouter();
  const { stats, isLoading, refetch } = useStreamMessage(streamMessageId);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  const handlePress = useCallback(() => {
    const threadPath =
      discussionStack === 'learn'
        ? '/(tabs)/learn/thread'
        : discussionStack === 'home'
          ? '/(tabs)/(home)/thread'
          : '/(tabs)/community/thread';
    router.push({
      pathname: threadPath,
      params: {
        messageId: streamMessageId,
        channelId: COMMUNITY_CHANNEL.id,
        backLabel: 'Article',
      },
    });
  }, [discussionStack, router, streamMessageId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading community discussion...</Text>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${stats.replyCount} comments, ${stats.likeCount} likes. Open discussion.`}
    >
      <Text style={styles.engagementText}>
        {`💬 ${formatCount(stats.replyCount, 'comment', 'comments')}  ❤️ ${formatCount(stats.likeCount, 'like', 'likes')}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pressable: {
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  engagementText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
