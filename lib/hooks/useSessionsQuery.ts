import { useQuery } from '@tanstack/react-query';
import { getSessions, getSessionsByMoodTag } from '@/lib/services/sessionService';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSessionsByMoodTag(moodTag: string) {
  return useQuery({
    queryKey: ['sessions', 'mood', moodTag],
    queryFn: () => getSessionsByMoodTag(moodTag),
    staleTime: 5 * 60 * 1000,
  });
}
