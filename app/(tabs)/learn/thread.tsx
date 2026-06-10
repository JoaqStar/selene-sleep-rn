import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { CommunityThreadView } from '@/components/CommunityThreadView';

export default function LearnThreadScreen() {
  const { messageId, channelId } = useLocalSearchParams<{ messageId: string; channelId: string }>();

  return (
    <CommunityThreadView
      messageId={String(messageId ?? '')}
      channelId={channelId}
      backLabel="Article"
    />
  );
}
