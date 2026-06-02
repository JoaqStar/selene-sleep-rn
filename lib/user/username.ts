export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export const RESERVED_USERNAMES = new Set([
  'admin',
  'selene',
  'support',
  'help',
  'moderator',
  'mod',
  'system',
  'anonymous',
  'friend',
  'user',
  'null',
  'undefined',
]);

export type UsernameValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function normalizeUsernameForCheck(input: string): string {
  return input.trim().toLowerCase();
}

export function validateUsername(input: string): UsernameValidationResult {
  const trimmed = input.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { ok: false, error: `Use at least ${USERNAME_MIN_LENGTH} characters.` };
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: `Use at most ${USERNAME_MAX_LENGTH} characters.` };
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: '3–20 characters: letters, numbers, and underscores only.',
    };
  }
  const normalized = trimmed.toLowerCase();
  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, error: 'That username is reserved. Try another.' };
  }
  return { ok: true, normalized };
}

export function isUniqueViolationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === '23505';
}
