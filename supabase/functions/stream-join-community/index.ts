// Supabase Edge Function: stream-join-community
// Adds the authenticated user to the shared Stream community channel so they
// receive channel_member permissions (required for posting links).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { addUserToCommunityChannel } from '../_shared/streamServer.ts';
import { getUserFromRequest } from '../_shared/supabaseAuth.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      console.warn('[stream-join-community] Unauthorized request');
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('[stream-join-community] Starting for user', user.id);
    await addUserToCommunityChannel(user.id);
    console.log('[stream-join-community] Completed for user', user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stream-join-community] Unexpected error', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
