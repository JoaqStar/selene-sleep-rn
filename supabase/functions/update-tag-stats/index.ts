// Supabase Edge Function: update-tag-stats
// Applies added/removed community tags using the secure RPC upsert_tag_counts.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type UpdateTagStatsPayload = {
  addedTags?: string[];
  removedTags?: string[];
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = (await req.json()) as UpdateTagStatsPayload;
    const addedTags = (payload.addedTags ?? []).map((tag) => String(tag ?? '').trim()).filter(Boolean);
    const removedTags = (payload.removedTags ?? []).map((tag) => String(tag ?? '').trim()).filter(Boolean);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[update-tag-stats] Missing Supabase env vars');
      return new Response('Server misconfigured', { status: 500 });
    }

    const client = await createSupabaseClient(supabaseUrl, serviceRoleKey);
    const { error } = await client.rpc('upsert_tag_counts', {
      added_tags: addedTags,
      removed_tags: removedTags,
    });

    if (error) {
      console.error('[update-tag-stats] RPC failed', error);
      return new Response('Failed to update tag stats', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[update-tag-stats] Unexpected error', err);
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
