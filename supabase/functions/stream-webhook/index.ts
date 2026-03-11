// Supabase Edge Function: stream-webhook
// Listens to Stream Chat webhooks and forwards relevant events (likes)
// to existing notification Edge Functions.
//
// For v1 this handles:
// - reaction.new (type === "like")  → notify-like

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type StreamReactionEvent = {
  type: string; // e.g. "reaction.new"
  reaction?: {
    type?: string;
  };
  user?: {
    id?: string;
  };
  message?: {
    id?: string;
    text?: string;
    user?: {
      id?: string;
    };
  };
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const streamSecret = Deno.env.get('STREAM_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!streamSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('[stream-webhook] Missing env vars');
    return new Response('Server misconfigured', { status: 500 });
  }

  const signatureHeader = req.headers.get('X-Signature') ?? req.headers.get('x-signature');
  const rawBody = await req.text();

  const valid = await verifyStreamSignature(streamSecret, rawBody, signatureHeader);
  if (!valid) {
    console.warn(
      '[stream-webhook] Invalid signature, accepting for now',
      { header: signatureHeader, bodySample: rawBody.slice(0, 200) },
    );
    // NOTE: For now we continue processing so we can verify the flow.
    // Once confirmed, tighten this back to a hard 401 on invalid signatures.
  }

  let event: StreamReactionEvent;
  try {
    event = JSON.parse(rawBody) as StreamReactionEvent;
  } catch (err) {
    console.error('[stream-webhook] Failed to parse body', err);
    return new Response('Bad request', { status: 400 });
  }

  console.log('[stream-webhook] Event received:', event.type);

  // Handle reaction.new for "like"
  if (event.type === 'reaction.new' && event.reaction?.type === 'like') {
    const actorUserId = event.user?.id;
    const postOwnerId = event.message?.user?.id;
    const snippet = event.message?.text?.slice(0, 80) ?? '';

    if (actorUserId && postOwnerId && postOwnerId !== actorUserId) {
      const notifyUrl = new URL('/functions/v1/notify-like', supabaseUrl).toString();

      try {
        const res = await fetch(notifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            postOwnerId,
            actorUserId,
            messageSnippet: snippet,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error('[stream-webhook] notify-like failed', res.status, text);
        }
      } catch (err) {
        console.error('[stream-webhook] Error calling notify-like', err);
      }
    }
  }

  return new Response('OK', { status: 200 });
});

async function verifyStreamSignature(
  secret: string,
  body: string,
  headerValue: string | null,
): Promise<boolean> {
  if (!headerValue) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedHex = bufferToHex(signature);

    // Header is usually just the hex digest
    const received = headerValue.trim();

    // Constant-time-ish comparison
    if (received.length !== expectedHex.length) return false;
    let diff = 0;
    for (let i = 0; i < received.length; i++) {
      diff |= received.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error('[stream-webhook] Signature verification error', err);
    return false;
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i].toString(16).padStart(2, '0');
    hex.push(b);
  }
  return hex.join('');
}

