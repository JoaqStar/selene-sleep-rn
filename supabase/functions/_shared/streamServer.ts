import {
  COMMUNITY_CHANNEL_ID,
  COMMUNITY_CHANNEL_TYPE,
} from './streamCommunity.ts';

const STREAM_API_BASE = 'https://chat.stream-io-api.com';

const MESSAGING_GRANTS: Record<string, string[]> = {
  channel_member: [
    'read-channel',
    'read-channel-members',
    'create-message',
    'add-links',
    'create-reaction',
    'create-attachment',
    'create-mention',
    'update-message-owner',
    'delete-message-owner',
    'delete-reaction-owner',
    'flag-message',
    'mute-channel',
    'remove-own-channel-membership',
    'run-message-action',
    'send-custom-event',
    'upload-attachment',
    'join-call',
    'create-call',
    'pin-message',
  ],
  user: [
    'create-channel',
    'create-message-owner',
    'read-channel-owner',
    'read-channel-members-owner',
    'add-links-owner',
    'create-attachment-owner',
    'create-mention-owner',
    'create-reaction-owner',
    'delete-channel-owner',
    'delete-message-owner',
    'delete-attachment-owner',
    'delete-reaction-owner',
    'flag-message-owner',
    'mute-channel-owner',
    'pin-message-owner',
    'remove-own-channel-membership-owner',
    'run-message-action-owner',
    'send-custom-event-owner',
    'update-channel-owner',
    'upload-attachment-owner',
    'recreate-channel-owner',
    'truncate-channel-owner',
  ],
};

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeJson(value: Record<string, unknown>): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

async function createStreamServerToken(apiSecret: string): Promise<string> {
  const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlEncodeJson({ server: true });
  const data = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

function getStreamCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = Deno.env.get('STREAM_API_KEY') ?? Deno.env.get('EXPO_PUBLIC_STREAM_API_KEY');
  const apiSecret = Deno.env.get('STREAM_SECRET');

  if (!apiKey || !apiSecret) {
    throw new Error('Missing STREAM_API_KEY or STREAM_SECRET');
  }

  return { apiKey, apiSecret };
}

async function streamRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  const { apiKey, apiSecret } = getStreamCredentials();
  const token = await createStreamServerToken(apiSecret);
  const url = `${STREAM_API_BASE}${path}?api_key=${encodeURIComponent(apiKey)}`;

  return fetch(url, {
    method,
    headers: {
      Authorization: token,
      'stream-auth-type': 'jwt',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function restoreMessagingChannelTypeGrants(): Promise<void> {
  const response = await streamRequest('PUT', `/channeltypes/${COMMUNITY_CHANNEL_TYPE}`, {
    grants: MESSAGING_GRANTS,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to restore messaging channel type grants: ${response.status} ${errorText}`,
    );
  }

  console.log('[streamServer] Restored messaging channel type grants');
}

async function clearCommunityChannelOverrides(): Promise<void> {
  const channelPath = `/channels/${COMMUNITY_CHANNEL_TYPE}/${COMMUNITY_CHANNEL_ID}`;
  const response = await streamRequest('PATCH', channelPath, {
    set: {
      config_overrides: {},
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to clear community channel overrides: ${response.status} ${errorText}`,
    );
  }

  console.log('[streamServer] Cleared community channel overrides');
}

async function upsertStreamUser(userId: string): Promise<void> {
  const response = await streamRequest('POST', '/users', {
    users: {
      [userId]: { id: userId },
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upsert Stream user: ${response.status} ${errorText}`);
  }
}

async function ensureCommunityChannelExists(userId: string): Promise<void> {
  const channelPath = `/channels/${COMMUNITY_CHANNEL_TYPE}/${COMMUNITY_CHANNEL_ID}`;

  const queryResponse = await streamRequest('POST', `${channelPath}/query`, {
    state: false,
    watch: false,
    presence: false,
  });

  if (queryResponse.ok) {
    return;
  }

  const createResponse = await streamRequest('POST', `${channelPath}/query`, {
    data: {
      created_by_id: userId,
      name: 'Community',
      description: 'A shared feed for support, questions, and recommendations.',
    },
    members: [userId],
    state: false,
    watch: false,
    presence: false,
  });

  if (!createResponse.ok) {
    const createError = await createResponse.text();
    if (!/already exists|duplicate/i.test(createError)) {
      throw new Error(`Failed to create community channel: ${createResponse.status} ${createError}`);
    }
  }
}

export async function addUserToCommunityChannel(userId: string): Promise<void> {
  console.log('[streamServer] Starting community setup for', userId);
  await restoreMessagingChannelTypeGrants();
  await clearCommunityChannelOverrides();
  await upsertStreamUser(userId);
  await ensureCommunityChannelExists(userId);

  const channelPath = `/channels/${COMMUNITY_CHANNEL_TYPE}/${COMMUNITY_CHANNEL_ID}`;
  const response = await streamRequest('POST', channelPath, {
    add_members: [userId],
  });

  if (response.ok) {
    console.log('[streamServer] Added user to community channel');
    return;
  }

  const errorText = await response.text();
  if (/already|exists|duplicate|member/i.test(errorText)) {
    console.log('[streamServer] User already in community channel');
    return;
  }

  throw new Error(`Failed to add community member: ${response.status} ${errorText}`);
}
