import { supabase } from '@/lib/supabase';
import { Article } from '@/types';

export async function getArticles(): Promise<Article[]> {
  console.log('[articleService] getArticles called');
  const { data, error, status, statusText } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true);

  console.log('[articleService] getArticles response — status:', status, statusText, 'data:', data?.length, 'error:', error);

  if (error) {
    console.error('[articleService] Error fetching articles:', JSON.stringify(error));
    throw error;
  }

  return data as Article[];
}

export async function getArticleById(id: number): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error('Error fetching article by id:', id, error);
    throw error;
  }

  console.log('Fetched article:', data?.title);
  return data as Article;
}
