import { useEffect, useMemo, useState } from 'react';
import { checkUsernameAvailable } from '@/lib/services/usernameService';
import { validateUsername } from '@/lib/user/username';

export type UsernameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function useUsernameAvailability(
  username: string,
  options?: { excludeCurrentUser?: boolean; debounceMs?: number },
) {
  const debounceMs = options?.debounceMs ?? 400;
  const excludeCurrentUser = options?.excludeCurrentUser ?? false;

  const [status, setStatus] = useState<UsernameAvailabilityStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const validation = useMemo(() => validateUsername(username), [username]);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setStatus('idle');
      setMessage(null);
      return;
    }

    if (!validation.ok) {
      setStatus('invalid');
      setMessage(validation.error);
      return;
    }

    setStatus('checking');
    setMessage(null);

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailable(trimmed, { excludeCurrentUser });
      if (cancelled) return;

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
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, validation, excludeCurrentUser, debounceMs]);

  const canSubmit = validation.ok && status === 'available';

  return { status, message, canSubmit, validation };
}
