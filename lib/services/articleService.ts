import { supabase } from '@/lib/supabase';
import { Article } from '@/types';
import { loadCachedArticles, saveCachedArticles } from '@/lib/services/offlineContentService';

const QUERY_TIMEOUT_MS = 6000;

async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, label: string): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`[articleService] ${label} timed out after ${QUERY_TIMEOUT_MS}ms`));
    }, QUERY_TIMEOUT_MS);
  });
  try {
    return await Promise.race([task(controller.signal), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getArticles(): Promise<Article[]> {
  console.log('[articleService] getArticles called');
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  let data, error, status, statusText;
  try {
    ({ data, error, status, statusText } = await withTimeout(
      (signal) =>
        supabase
          .from('articles')
          .select('*')
          .eq('is_published', true)
          .abortSignal(signal),
      'getArticles',
    ));
  } catch (requestError) {
    console.error('[articleService] getArticles request failed:', requestError);
    const cached = await loadCachedArticles();
    if (cached && cached.length > 0) {
      console.log('[articleService] Returning cached articles after request failure:', cached.length);
      return cached;
    }
    throw requestError;
  }

  console.log('[articleService] getArticles response — status:', status, statusText, 'data:', data?.length, 'error:', error);

  if (error) {
    console.error('[articleService] Error fetching articles:', JSON.stringify(error));
    const cached = await loadCachedArticles();
    if (cached && cached.length > 0) {
      console.log('[articleService] Returning cached articles after API error:', cached.length);
      return cached;
    }
    throw error;
  }
  const articles = data as Article[];
  await saveCachedArticles(articles);
  return articles;
}

export async function getArticleById(id: number): Promise<Article> {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  let data, error;
  try {
    ({ data, error } = await withTimeout(
      (signal) =>
        supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .eq('is_published', true)
          .single()
          .abortSignal(signal),
      'getArticleById',
    ));
  } catch (requestError) {
    console.error('[articleService] getArticleById request failed:', requestError);
    throw requestError;
  }

  if (error) {
    console.error('Error fetching article by id:', id, error);
    throw error;
  }

  console.log('Fetched article:', data?.title);
  return data as Article;
}
