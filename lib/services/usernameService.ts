import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import {
  isUniqueViolationError,
  normalizeUsernameForCheck,
  validateUsername,
} from '@/lib/user/username';

const AVAILABILITY_CHECK_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Username check timed out')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export type UserProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  /** False when the `users.username` column / RPC is not deployed yet. */
  usernameDbReady: boolean;
};

function isUsernameSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    (message.includes('username') &&
      (message.includes('column') || message.includes('schema cache')))
  );
}

async function fetchUsersRow(
  userId: string,
  columns: string,
): Promise<{ data: Record<string, unknown> | null; error: { code?: string; message?: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'No client' } };
  const { data, error } = await supabase.from('users').select(columns).eq('id', userId).maybeSingle();
  return { data: data as Record<string, unknown> | null, error };
}

export async function fetchCurrentUserProfile(): Promise<UserProfile | null> {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error('[UsernameService] getUser failed:', authError);
    return null;
  }
  if (!authData.user) {
    return null;
  }

  const userId = authData.user.id;
  let { data, error } = await fetchUsersRow(userId, 'id, username, display_name, email');

  if (error && isUsernameSchemaMissing(error)) {
    console.warn(
      '[UsernameService] users.username column missing — run supabase/migrations/20250529120000_unique_username.sql',
    );
    const fallback = await fetchUsersRow(userId, 'id, display_name, email');
    data = fallback.data;
    error = fallback.error;
    const base = {
      id: userId,
      username: null,
      display_name: (data?.display_name as string | null) ?? null,
      email: (data?.email as string | null) ?? authData.user.email ?? null,
      usernameDbReady: false,
    };
    if (fallback.error && fallback.error.code !== 'PGRST116') {
      console.error('[UsernameService] fetch profile fallback failed:', fallback.error);
    }
    return base;
  }

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        id: userId,
        username: null,
        display_name: null,
        email: authData.user.email ?? null,
        usernameDbReady: true,
      };
    }
    console.error('[UsernameService] fetch profile failed:', error);
    return {
      id: userId,
      username: null,
      display_name: null,
      email: authData.user.email ?? null,
      usernameDbReady: true,
    };
  }

  if (!data) {
    return {
      id: userId,
      username: null,
      display_name: null,
      email: authData.user.email ?? null,
      usernameDbReady: true,
    };
  }

  return {
    id: data.id as string,
    username: (data.username as string | null) ?? null,
    display_name: (data.display_name as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    usernameDbReady: true,
  };
}

export async function checkUsernameAvailable(
  username: string,
  options?: {
    excludeCurrentUser?: boolean;
    excludeUserId?: string | null;
    currentUsername?: string;
  },
): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsername(username);
  if (!validation.ok) {
    return { available: false, error: validation.error };
  }

  const baseline = options?.currentUsername?.trim();
  if (
    baseline &&
    normalizeUsernameForCheck(baseline) === validation.normalized
  ) {
    return { available: true };
  }

  if (!hasSupabaseConfig || !supabase) {
    return { available: true };
  }

  let excludeUserId = options?.excludeUserId ?? null;
  if (!excludeUserId && options?.excludeCurrentUser) {
    const { data } = await supabase.auth.getUser();
    excludeUserId = data.user?.id ?? null;
  }

  const { data, error } = await withTimeout(
    supabase.rpc('is_username_available', {
      p_username: validation.normalized,
      p_exclude_user_id: excludeUserId,
    }),
    AVAILABILITY_CHECK_TIMEOUT_MS,
  );

  if (error) {
    console.error('[UsernameService] is_username_available RPC failed:', error);
    if (
      error.code === 'PGRST202' ||
      error.message?.includes('is_username_available') ||
      isUsernameSchemaMissing(error)
    ) {
      return {
        available: false,
        error:
          'Username setup is not complete in Supabase yet. Run the SQL migration in supabase/migrations/20250529120000_unique_username.sql (SQL editor → New query → Run).',
      };
    }
    return { available: false, error: 'Could not check username. Try again.' };
  }

  return { available: data === true };
}

export async function saveUsername(username: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = validateUsername(username);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  if (!hasSupabaseConfig || !supabase) {
    return { ok: false, error: 'Account storage is not configured.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        id: authData.user.id,
        email: authData.user.email ?? null,
        username: validation.normalized,
      },
      { onConflict: 'id' },
    );

  if (error) {
    if (isUniqueViolationError(error)) {
      return { ok: false, error: 'That username was just taken. Try another.' };
    }
    if (isUsernameSchemaMissing(error)) {
      return {
        ok: false,
        error:
          'The username column is missing in Supabase. Run the migration SQL (see supabase/migrations/20250529120000_unique_username.sql) and try again.',
      };
    }
    console.error('[UsernameService] saveUsername failed:', error);
    return { ok: false, error: 'Could not save username. Try again.' };
  }

  return { ok: true };
}

export async function claimUsername(
  username: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const usernameResult = await saveUsername(username);
  if (!usernameResult.ok) {
    return usernameResult;
  }

  const validation = validateUsername(username);
  const storedUsername = validation.ok
    ? validation.normalized
    : username.trim().toLowerCase();

  if (!hasSupabaseConfig || !supabase) {
    return { ok: true, username: storedUsername };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: true, username: storedUsername };
  }

  // Keep Apple-provided names in auth metadata; only fall back to username when empty.
  const existingName =
    typeof authData.user.user_metadata?.full_name === 'string'
      ? authData.user.user_metadata.full_name.trim()
      : '';
  const shouldMirrorUsernameToMetadata =
    !existingName || existingName === storedUsername;

  if (shouldMirrorUsernameToMetadata) {
    void supabase.auth
      .updateUser({ data: { full_name: storedUsername } })
      .then(({ error: metaError }) => {
        if (metaError) {
          console.error('[UsernameService] updateUser metadata failed:', metaError);
        }
      })
      .catch((err) => {
        console.error('[UsernameService] updateUser metadata unexpected error:', err);
      });
  }

  return { ok: true, username: storedUsername };
}
