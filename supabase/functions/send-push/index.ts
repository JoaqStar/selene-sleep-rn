// Supabase Edge Function: send-push
// This function sends push notifications via the Expo Push API.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type PushPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type UserPushToken = {
  expo_push_token: string;
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = (await req.json()) as PushPayload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[send-push] Missing Supabase env vars');
      return new Response('Server misconfigured', { status: 500 });
    }

    const client = await createSupabaseClient(supabaseUrl, serviceRoleKey);

    const { data: tokens, error } = await client
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', payload.userId)
      .eq('is_active', true);

    if (error) {
      console.error('[send-push] Failed to load tokens', error);
      return new Response('Failed to load tokens', { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      console.log('[send-push] No tokens for user', payload.userId);
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map((t: UserPushToken) => ({
      to: t.expo_push_token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    const expoRes = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoRes.json();

    // TODO: optionally inspect expoJson.data for invalid tokens and prune them.

    return new Response(JSON.stringify({ success: true, response: expoJson }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push] Unexpected error', err);
    return new Response('Internal error', { status: 500 });
  }
});

async function createSupabaseClient(url: string, key: string) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.48.0');
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

