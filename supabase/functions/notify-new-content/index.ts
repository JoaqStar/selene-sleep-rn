// Supabase Edge Function: notify-new-content
// Sends a push notification to users who opted in to new content alerts.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type NotifyNewContentPayload = {
  title: string;
  body: string;
  deepLink?: string;
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = (await req.json()) as NotifyNewContentPayload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[notify-new-content] Missing Supabase env vars');
      return new Response('Server misconfigured', { status: 500 });
    }

    const client = await createSupabaseClient(supabaseUrl, serviceRoleKey);

    const { data: users, error } = await client
      .from('notification_preferences')
      .select('user_id')
      .eq('new_content_enabled', true);

    if (error) {
      console.error('[notify-new-content] Failed to load users', error);
      return new Response('Failed to load users', { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log('[notify-new-content] No users opted in');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sendPushUrl = new URL('/functions/v1/send-push', supabaseUrl).toString();

    await Promise.all(
      users.map(async (row: { user_id: string }) => {
        try {
          const res = await fetch(sendPushUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              userId: row.user_id,
              title: payload.title,
              body: payload.body,
              data: {
                type: 'new_content',
                deepLink: payload.deepLink,
              },
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            console.error(
              '[notify-new-content] send-push failed for user',
              row.user_id,
              res.status,
              text,
            );
          }
        } catch (err) {
          console.error('[notify-new-content] Error sending to user', row.user_id, err);
        }
      }),
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify-new-content] Unexpected error', err);
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

