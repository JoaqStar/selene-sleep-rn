// Supabase Edge Function: notify-like
// Sends a push notification when a post is liked, respecting user preferences.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type NotifyLikePayload = {
  postOwnerId: string;
  actorUserId: string;
  messageSnippet?: string;
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = (await req.json()) as NotifyLikePayload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[notify-like] Missing Supabase env vars');
      return new Response('Server misconfigured', { status: 500 });
    }

    const client = await createSupabaseClient(supabaseUrl, serviceRoleKey);

    const { data: prefs, error: prefsError } = await client
      .from('notification_preferences')
      .select('likes_enabled')
      .eq('user_id', payload.postOwnerId)
      .maybeSingle();

    if (prefsError) {
      console.error('[notify-like] Failed to load preferences', prefsError);
      return new Response('Failed to load preferences', { status: 500 });
    }

    if (prefs && prefs.likes_enabled === false) {
      console.log('[notify-like] Likes disabled for user', payload.postOwnerId);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: actor, error: actorError } = await client
      .from('profiles')
      .select('full_name')
      .eq('id', payload.actorUserId)
      .maybeSingle();

    if (actorError) {
      console.error('[notify-like] Failed to load actor profile', actorError);
    }

    const displayName = actor?.full_name || 'Someone';

    const title = 'New like on your post';
    const body = payload.messageSnippet
      ? `${displayName} liked: "${payload.messageSnippet}"`
      : `${displayName} liked your post.`;

    const sendPushUrl = new URL('/functions/v1/send-push', supabaseUrl).toString();

    const res = await fetch(sendPushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        userId: payload.postOwnerId,
        title,
        body,
        data: {
          type: 'like',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[notify-like] send-push failed', res.status, text);
      return new Response('Failed to send push', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify-like] Unexpected error', err);
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

