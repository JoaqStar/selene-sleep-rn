import { supabase } from '@/lib/supabase';
import { Article } from '@/types';

export async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true);

  if (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }

  console.log('Fetched articles:', data?.length);
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
