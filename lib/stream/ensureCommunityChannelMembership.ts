import type { StreamChat } from 'stream-chat';
import { COMMUNITY_CHANNEL } from '@/lib/stream/channels';
import { joinCommunityChannel } from '@/lib/services/streamCommunityService';

export async function ensureCommunityChannelMembership(
  accessToken: string,
): Promise<boolean> {
  try {
    await joinCommunityChannel(accessToken);
    return true;
  } catch (error) {
    console.warn('[ensureCommunityChannelMembership] Failed to join community channel', error);
    return false;
  }
}

export async function getCommunityChannel(client: StreamChat) {
  const channel = client.channel('messaging', COMMUNITY_CHANNEL.id, {
    name: COMMUNITY_CHANNEL.name,
    description: COMMUNITY_CHANNEL.description,
  } as Record<string, unknown>);

  await channel.watch();
  return channel;
}
