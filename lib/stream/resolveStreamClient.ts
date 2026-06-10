import { StreamChat } from 'stream-chat';
import { getStreamToken } from '@/lib/services/streamService';

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY ?? '';

type ResolveStreamClientOptions = {
  existingClient?: StreamChat | null;
  existingConnected?: boolean;
  userId: string;
  displayName: string;
};

export async function resolveStreamClient({
  existingClient,
  existingConnected,
  userId,
  displayName,
}: ResolveStreamClientOptions): Promise<StreamChat | null> {
  if (!apiKey) {
    return null;
  }

  if (existingClient && existingConnected) {
    return existingClient;
  }

  const singleton = StreamChat.getInstance(apiKey);
  if (singleton.userID) {
    return singleton;
  }

  const streamToken = await getStreamToken(userId);
  await singleton.connectUser({ id: userId, name: displayName }, streamToken);
  return singleton;
}

export function getStreamDisplayName(username: string | null | undefined, email: string | undefined): string {
  if (username && username.trim().length > 0) {
    return username.trim();
  }
  return (email ?? 'user').split('@')[0];
}
