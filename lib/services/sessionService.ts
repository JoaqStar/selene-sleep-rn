import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import { Session } from '@/types';
import { SESSIONS } from '@/mocks/sessions';
import { loadCachedSessions, saveCachedSessions } from '@/lib/services/offlineContentService';

const QUERY_TIMEOUT_MS = 6000;

async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, label: string): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`[sessionService] ${label} timed out after ${QUERY_TIMEOUT_MS}ms`));
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

export async function getSessions(): Promise<Session[]> {
  console.log('[sessionService] getSessions called');

  if (!hasSupabaseConfig || !supabase) {
    console.log('[sessionService] Supabase not configured — using mock sessions');
    const mapped = SESSIONS.map((s, index) => ({
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
      teacher_name: s.instructor,
    }));
    await saveCachedSessions(mapped);
    return mapped;
  }

  let data, error, status, statusText;
  try {
    ({ data, error, status, statusText } = await withTimeout(
      (signal) =>
        supabase
          .from('sessions')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .abortSignal(signal),
      'getSessions',
    ));
  } catch (requestError) {
    console.error('[sessionService] getSessions request failed:', requestError);
    const cached = await loadCachedSessions();
    if (cached && cached.length > 0) {
      console.log('[sessionService] Returning cached sessions after request failure:', cached.length);
      return cached;
    }
    throw requestError;
  }

  console.log('[sessionService] getSessions response — status:', status, statusText, 'data:', data?.length, 'error:', error);

  if (error) {
    console.error('[sessionService] Error fetching sessions:', JSON.stringify(error));
    const cached = await loadCachedSessions();
    if (cached && cached.length > 0) {
      console.log('[sessionService] Returning cached sessions after API error:', cached.length);
      return cached;
    }
    throw error;
  }
  const sessions = data as Session[];
  await saveCachedSessions(sessions);
  return sessions;
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

  let data, error;
  try {
    ({ data, error } = await withTimeout(
      (signal) =>
        supabase
          .from('sessions')
          .select('*')
          .eq('id', id)
          .eq('is_published', true)
          .single()
          .abortSignal(signal),
      'getSessionById',
    ));
  } catch (requestError) {
    console.error('[sessionService] getSessionById request failed:', requestError);
    throw requestError;
  }

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

  let data, error, status, statusText;
  try {
    ({ data, error, status, statusText } = await withTimeout(
      (signal) =>
        supabase
          .from('sessions')
          .select('*')
          .eq('is_published', true)
          .eq('mood_tag', moodTag)
          .order('sort_order', { ascending: true })
          .abortSignal(signal),
      'getSessionsByMoodTag',
    ));
  } catch (requestError) {
    console.error('[sessionService] getSessionsByMoodTag request failed:', requestError);
    const cached = await loadCachedSessions();
    if (cached && cached.length > 0) {
      return cached.filter((s) => s.mood_tag === moodTag);
    }
    throw requestError;
  }

  console.log('[sessionService] getSessionsByMoodTag response — status:', status, statusText, 'data:', data?.length, 'error:', error);

  if (error) {
    console.error('[sessionService] Error fetching sessions by mood tag:', moodTag, JSON.stringify(error));
    const cached = await loadCachedSessions();
    if (cached && cached.length > 0) {
      return cached.filter((s) => s.mood_tag === moodTag);
    }
    throw error;
  }

  return data as Session[];
}
