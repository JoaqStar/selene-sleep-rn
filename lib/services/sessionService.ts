import { supabase } from '@/lib/supabase';
import { Session } from '@/types';

export async function getSessions(): Promise<Session[]> {
  console.log('[sessionService] getSessions called');
  const { data, error, status, statusText } = await supabase
    .from('sessions')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  console.log('[sessionService] getSessions response — status:', status, statusText, 'data:', data?.length, 'error:', error);

  if (error) {
    console.error('[sessionService] Error fetching sessions:', JSON.stringify(error));
    throw error;
  }

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
  console.log('[sessionService] getSessionsByMoodTag called:', moodTag);
  const { data, error, status, statusText } = await supabase
    .from('sessions')
    .select('*')
    .eq('is_published', true)
    .eq('mood_tag', moodTag)
    .order('sort_order', { ascending: true });

  console.log('[sessionService] getSessionsByMoodTag response — status:', status, statusText, 'data:', data?.length, 'error:', error);

  if (error) {
    console.error('[sessionService] Error fetching sessions by mood tag:', moodTag, JSON.stringify(error));
    throw error;
  }

  return data as Session[];
}
