import { useQuery } from '@tanstack/react-query';
import { getArticles } from '@/lib/services/articleService';

export function useArticles() {
  return useQuery({
    queryKey: ['articles'],
    queryFn: getArticles,
    staleTime: 5 * 60 * 1000,
  });
}
