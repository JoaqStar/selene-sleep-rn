import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import { Session } from '@/types';
import { SESSIONS } from '@/mocks/sessions';

export async function getSessions(): Promise<Session[]> {
  console.log('[sessionService] getSessions called');

  if (!hasSupabaseConfig || !supabase) {
    console.log('[sessionService] Supabase not configured — using mock sessions');
    return SESSIONS.map((s, index) => ({
      id: index + 1,
      title: s.title,
      description: s.description ?? '',
      duration_seconds: (s.duration ?? 0) * 60,
      category: s.category,
      mood_tag: s.subcategory ?? '',
      audio_url: s.audioUrl,
      is_published: true,
      sort_order: index,
      instructor: s.instructor,
    }));
  }

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
  if (!hasSupabaseConfig || !supabase) {
    console.log('[sessionService] Supabase not configured — getSessionById using mock sessions');
    const all = await getSessions();
    const match = all.find((s) => s.id === id);
    if (!match) {
      throw new Error(`Mock session not found for id ${id}`);
    }
    return match;
  }

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

  if (!hasSupabaseConfig || !supabase) {
    console.log('[sessionService] Supabase not configured — getSessionsByMoodTag using mock sessions');
    const all = await getSessions();
    return all.filter((s) => s.mood_tag === moodTag);
  }

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
