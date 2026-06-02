import { useEffect, useRef, useState } from 'react';
import { checkUsernameAvailable } from '@/lib/services/usernameService';
import { normalizeUsernameForCheck, validateUsername } from '@/lib/user/username';

export type UsernameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export type UseUsernameAvailabilityOptions = {
  excludeCurrentUser?: boolean;
  /** Skip auth.getUser() when excluding the signed-in user from the check. */
  excludeUserId?: string | null;
  /** Treat this username as available (e.g. current value while editing in Settings). */
  currentUsername?: string;
  debounceMs?: number;
};

export function useUsernameAvailability(
  username: string,
  options?: UseUsernameAvailabilityOptions,
) {
  const debounceMs = options?.debounceMs ?? 400;
  const excludeCurrentUser = options?.excludeCurrentUser ?? false;
  const excludeUserId = options?.excludeUserId ?? null;
  const currentUsername = options?.currentUsername ?? '';

  const [status, setStatus] = useState<UsernameAvailabilityStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setStatus('idle');
      setMessage(null);
      return;
    }

    const validation = validateUsername(trimmed);
    if (!validation.ok) {
      setStatus('invalid');
      setMessage(validation.error);
      return;
    }

    const baseline = currentUsername.trim();
    if (
      baseline &&
      normalizeUsernameForCheck(trimmed) === normalizeUsernameForCheck(baseline)
    ) {
      setStatus('available');
      setMessage('Username is available');
      return;
    }

    setStatus('idle');
    setMessage(null);

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      if (requestId !== requestIdRef.current) return;

      setStatus('checking');
      setMessage(null);

      try {
        const result = await checkUsernameAvailable(trimmed, {
          excludeCurrentUser,
          excludeUserId,
          currentUsername: baseline || undefined,
        });
        if (requestId !== requestIdRef.current) return;

        if (result.error) {
          setStatus('invalid');
          setMessage(result.error);
          return;
        }

        if (result.available) {
          setStatus('available');
          setMessage('Username is available');
        } else {
          setStatus('taken');
          setMessage('That username is already taken');
        }
      } catch (err) {
        console.error('[useUsernameAvailability] check failed:', err);
        if (requestId !== requestIdRef.current) return;
        setStatus('invalid');
        setMessage('Could not check username. Try again.');
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [
    username,
    excludeCurrentUser,
    excludeUserId,
    currentUsername,
    debounceMs,
  ]);

  const validation = validateUsername(username);
  const canSubmit = validation.ok && status === 'available';

  return { status, message, canSubmit, validation };
}
