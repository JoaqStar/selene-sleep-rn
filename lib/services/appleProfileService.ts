import type { User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { checkUsernameAvailable, claimUsername } from '@/lib/services/usernameService';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { deriveUsernameFromLabel, validateUsername, USERNAME_MAX_LENGTH } from '@/lib/user/username';

export function formatAppleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): string {
  if (!fullName) return '';
  return [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim();
}

export function getNameFromUserMetadata(
  user: Pick<User, 'user_metadata'>,
): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return (
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    ''
  );
}

export function isGoogleAuthUser(
  user: Pick<User, 'app_metadata' | 'identities'> | null | undefined,
): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === 'google') return true;
  return user.identities?.some((identity) => identity.provider === 'google') ?? false;
}

/** Apple or Google — providers that already supply name and email. */
export function isOAuthSocialUser(
  user: Pick<User, 'app_metadata' | 'identities'> | null | undefined,
): boolean {
  return isAppleAuthUser(user) || isGoogleAuthUser(user);
}

export async function syncOAuthProfileFromUser(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
): Promise<void> {
  if (!supabase) return;

  const fullName = getNameFromUserMetadata(user);
  const row: { id: string; display_name?: string; email?: string | null } = {
    id: user.id,
    email: user.email ?? null,
  };
  if (fullName) row.display_name = fullName;

  const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('[OAuth] Failed to save users row:', error);
  }
}

export function getDefaultUsernameSuggestion(
  user: Pick<User, 'email' | 'user_metadata'>,
): string | null {
  const fromName = deriveUsernameFromLabel(getNameFromUserMetadata(user));
  if (fromName) return fromName;
  const emailLocal = user.email?.split('@')[0] ?? '';
  return deriveUsernameFromLabel(emailLocal);
}

export async function applyProvisionedUsername(username: string): Promise<void> {
  await AsyncStorage.setItem('selene_username', username);
  await AsyncStorage.setItem('selene_onboarded', 'true');
  useOnboardingStore.setState({
    username,
    hasUsername: true,
    isOnboarded: true,
    profileChecked: true,
  });
}

export async function syncAppleProfileFromCredential(
  credential: AppleAuthentication.AppleAuthenticationCredential,
): Promise<void> {
  if (!supabase) return;

  const fullName = formatAppleFullName(credential.fullName ?? null);
  const metadata: Record<string, string> = {};
  if (fullName) {
    metadata.full_name = fullName;
    metadata.name = fullName;
  }

  if (Object.keys(metadata).length > 0) {
    const { error } = await supabase.auth.updateUser({ data: metadata });
    if (error) {
      console.error('[Apple] Failed to save profile metadata:', error);
    }
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return;

  const row: { id: string; display_name?: string; email?: string | null } = {
    id: authData.user.id,
  };
  if (fullName) row.display_name = fullName;
  row.email = credential.email ?? authData.user.email ?? null;

  const { error: upsertError } = await supabase.from('users').upsert(row, { onConflict: 'id' });
  if (upsertError) {
    console.error('[Apple] Failed to save users row:', upsertError);
  }
}

async function claimIfAvailable(candidate: string, userId: string): Promise<string | null> {
  const derived = deriveUsernameFromLabel(candidate);
  if (!derived) return null;

  const check = await checkUsernameAvailable(derived, {
    excludeCurrentUser: true,
    excludeUserId: userId,
  });
  if (!check.available) return null;

  const result = await claimUsername(derived);
  return result.ok ? result.username : null;
}

async function claimWithNumericSuffix(baseLabel: string, userId: string): Promise<string | null> {
  const base = deriveUsernameFromLabel(baseLabel);
  if (!base) return null;

  for (let n = 2; n <= 50; n++) {
    const suffix = `_${n}`;
    const candidate = `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const validation = validateUsername(candidate);
    if (!validation.ok) continue;

    const check = await checkUsernameAvailable(validation.normalized, {
      excludeCurrentUser: true,
      excludeUserId: userId,
    });
    if (!check.available) continue;

    const result = await claimUsername(validation.normalized);
    if (result.ok) return result.username;
  }

  return null;
}

export async function autoProvisionUsername(
  userId: string,
  labels: string[],
): Promise<string | null> {
  const candidates = labels.map((label) => label.trim()).filter(Boolean);
  for (const label of candidates) {
    const claimed = await claimIfAvailable(label, userId);
    if (claimed) return claimed;

    const suffixed = await claimWithNumericSuffix(label, userId);
    if (suffixed) return suffixed;
  }

  const fallback = `user_${userId.replace(/-/g, '').slice(0, 8)}`;
  const result = await claimUsername(fallback);
  return result.ok ? result.username : null;
}

export async function autoProvisionUsernameForAppleCredential(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  userId: string,
): Promise<string | null> {
  const fullName = formatAppleFullName(credential.fullName ?? null);
  const emailLocal = credential.email?.split('@')[0] ?? '';
  return autoProvisionUsername(userId, [fullName, emailLocal]);
}

export async function autoProvisionUsernameForOAuthUser(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
): Promise<string | null> {
  const fullName = getNameFromUserMetadata(user);
  const emailLocal = user.email?.split('@')[0] ?? '';
  return autoProvisionUsername(user.id, [fullName, emailLocal]);
}

/** @deprecated Use autoProvisionUsernameForOAuthUser */
export const autoProvisionUsernameForAppleUser = autoProvisionUsernameForOAuthUser;

export function isAppleAuthUser(
  user: Pick<User, 'app_metadata' | 'identities'> | null | undefined,
): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === 'apple') return true;
  return user.identities?.some((identity) => identity.provider === 'apple') ?? false;
}
