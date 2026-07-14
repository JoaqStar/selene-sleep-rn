type SupabaseUser = {
  id: string;
};

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

export async function getUserFromRequest(req: Request): Promise<SupabaseUser | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization');
  const apiKey =
    req.headers.get('apikey') ??
    Deno.env.get('SUPABASE_ANON_KEY') ??
    '';

  if (!supabaseUrl || !authHeader) {
    return null;
  }

  if (apiKey) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.48.0');
      const client = createClient(supabaseUrl, apiKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const { data, error } = await client.auth.getUser(token);

      if (!error && data.user?.id) {
        return { id: data.user.id };
      }

      if (error) {
        console.warn('[supabaseAuth] getUser failed, falling back to JWT decode', error.message);
      }
    } catch (error) {
      console.warn('[supabaseAuth] getUser threw, falling back to JWT decode', error);
    }
  }

  const subject = decodeJwtSubject(authHeader);
  return subject ? { id: subject } : null;
}
