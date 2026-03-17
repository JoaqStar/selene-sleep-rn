import { useQuery } from '@tanstack/react-query';
import { getArticles } from '@/lib/services/articleService';
import { useAuthStore } from '@/stores/authStore';

export function useArticles() {
  const { session } = useAuthStore();
  const userKey = session?.user?.id ?? 'anonymous';

  return useQuery({
    queryKey: ['articles', userKey],
    queryFn: getArticles,
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(session?.user?.id),
    retry: false,
    refetchOnMount: 'always',
  });
}
