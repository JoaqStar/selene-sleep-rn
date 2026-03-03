import { supabase } from '@/lib/supabase';
import { Session } from '@/types';

export async function getSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }

  console.log('Fetched sessions:', data?.length);
  return data as Session[];
}

export async function getSessionById(id: number): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error('Error fetching session by id:', id, error);
    throw error;
  }

  console.log('Fetched session:', data?.title);
  return data as Session;
}

export async function getSessionsByMoodTag(moodTag: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('is_published', true)
    .eq('mood_tag', moodTag)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching sessions by mood tag:', moodTag, error);
    throw error;
  }

  console.log('Fetched sessions for mood tag:', moodTag, data?.length);
  return data as Session[];
}
