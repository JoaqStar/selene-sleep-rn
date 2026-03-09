import { useQuery } from '@tanstack/react-query';
import { getSessions, getSessionsByMoodTag } from '@/lib/services/sessionService';
import { useAuthStore } from '@/stores/authStore';

export function useSessions() {
  const { session } = useAuthStore();
  const userKey = session?.user?.id ?? 'anonymous';

  return useQuery({
    queryKey: ['sessions', userKey],
    queryFn: getSessions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSessionsByMoodTag(moodTag: string) {
  const { session } = useAuthStore();
  const userKey = session?.user?.id ?? 'anonymous';

  return useQuery({
    queryKey: ['sessions', 'mood', moodTag, userKey],
    queryFn: () => getSessionsByMoodTag(moodTag),
    staleTime: 5 * 60 * 1000,
  });
}
