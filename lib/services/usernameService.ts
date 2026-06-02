import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import {
  isUniqueViolationError,
  validateUsername,
} from '@/lib/user/username';

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
  options?: { excludeCurrentUser?: boolean },
): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsername(username);
  if (!validation.ok) {
    return { available: false, error: validation.error };
  }

  if (!hasSupabaseConfig || !supabase) {
    return { available: true };
  }

  let excludeUserId: string | null = null;
  if (options?.excludeCurrentUser) {
    const { data } = await supabase.auth.getUser();
    excludeUserId = data.user?.id ?? null;
  }

  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: validation.normalized,
    p_exclude_user_id: excludeUserId,
  });

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

export async function syncUserProfileFields(input: {
  displayName: string;
  username: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const displayTrimmed = input.displayName.trim();
  const finalDisplay = displayTrimmed.length > 0 ? displayTrimmed : 'Friend';

  const usernameResult = await saveUsername(input.username);
  if (!usernameResult.ok) {
    return usernameResult;
  }

  if (!hasSupabaseConfig || !supabase) {
    return { ok: false, error: 'Account storage is not configured.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: finalDisplay },
  });
  if (metaError) {
    console.error('[UsernameService] updateUser metadata failed:', metaError);
  }

  const usernameValidation = validateUsername(input.username);
  const storedUsername = usernameValidation.ok
    ? usernameValidation.normalized
    : input.username.trim().toLowerCase();

  const { error: tableError } = await supabase
    .from('users')
    .upsert(
      {
        id: authData.user.id,
        email: authData.user.email ?? null,
        display_name: finalDisplay,
        username: storedUsername,
      },
      { onConflict: 'id' },
    );

  if (tableError) {
    if (isUniqueViolationError(tableError)) {
      return { ok: false, error: 'That username was just taken. Try another.' };
    }
    console.error('[UsernameService] syncUserProfileFields failed:', tableError);
    return { ok: false, error: 'Could not save profile. Try again.' };
  }

  return { ok: true };
}
