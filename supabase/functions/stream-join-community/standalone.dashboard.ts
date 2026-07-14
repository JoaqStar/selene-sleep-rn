// Paste this entire file into Supabase Dashboard → Edge Functions → stream-join-community
// (Dashboard deploys a single file; no _shared imports.)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const COMMUNITY_CHANNEL_ID = 'community';
const COMMUNITY_CHANNEL_TYPE = 'messaging';
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

type SupabaseUser = { id: string };

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

function decodeJwtSubject(authHeader: string): string | null {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { sub?: string };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

async function getUserFromRequest(req: Request): Promise<SupabaseUser | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization');
  const apiKey = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (!supabaseUrl || !authHeader) return null;

  if (apiKey) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.48.0');
      const client = createClient(supabaseUrl, apiKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const { data, error } = await client.auth.getUser(token);
      if (!error && data.user?.id) return { id: data.user.id };
      if (error) console.warn('[stream-join-community] getUser failed:', error.message);
    } catch (error) {
      console.warn('[stream-join-community] getUser threw:', error);
    }
  }

  const subject = decodeJwtSubject(authHeader);
  return subject ? { id: subject } : null;
}

async function streamRequest(method: string, path: string, body?: Record<string, unknown>) {
  const { apiKey, apiSecret } = getStreamCredentials();
  const token = await createStreamServerToken(apiSecret);
  return fetch(`${STREAM_API_BASE}${path}?api_key=${encodeURIComponent(apiKey)}`, {
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
    throw new Error(`Failed to restore grants: ${response.status} ${await response.text()}`);
  }
  console.log('[stream-join-community] Restored messaging grants');
}

async function clearCommunityChannelOverrides(): Promise<void> {
  const response = await streamRequest('PATCH', `/channels/${COMMUNITY_CHANNEL_TYPE}/${COMMUNITY_CHANNEL_ID}`, {
    set: { config_overrides: {} },
  });
  if (!response.ok) {
    throw new Error(`Failed to clear overrides: ${response.status} ${await response.text()}`);
  }
  console.log('[stream-join-community] Cleared channel overrides');
}

async function upsertStreamUser(userId: string): Promise<void> {
  const response = await streamRequest('POST', '/users', {
    users: { [userId]: { id: userId } },
  });
  if (!response.ok) {
    throw new Error(`Failed to upsert user: ${response.status} ${await response.text()}`);
  }
}

async function ensureCommunityChannelExists(userId: string): Promise<void> {
  const channelPath = `/channels/${COMMUNITY_CHANNEL_TYPE}/${COMMUNITY_CHANNEL_ID}`;
  const queryResponse = await streamRequest('POST', `${channelPath}/query`, {
    state: false,
    watch: false,
    presence: false,
  });
  if (queryResponse.ok) return;

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
      throw new Error(`Failed to create channel: ${createResponse.status} ${createError}`);
    }
  }
}

async function addUserToCommunityChannel(userId: string): Promise<void> {
  console.log('[stream-join-community] Starting for', userId);
  await restoreMessagingChannelTypeGrants();
  await clearCommunityChannelOverrides();
  await upsertStreamUser(userId);
  await ensureCommunityChannelExists(userId);

  const response = await streamRequest('POST', `/channels/${COMMUNITY_CHANNEL_TYPE}/${COMMUNITY_CHANNEL_ID}`, {
    add_members: [userId],
  });
  if (response.ok) return;

  const errorText = await response.text();
  if (/already|exists|duplicate|member/i.test(errorText)) return;
  throw new Error(`Failed to add member: ${response.status} ${errorText}`);
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const user = await getUserFromRequest(req);
    if (!user) return new Response('Unauthorized', { status: 401 });

    await addUserToCommunityChannel(user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stream-join-community] Error', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
