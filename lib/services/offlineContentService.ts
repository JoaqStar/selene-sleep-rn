import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, Session } from '@/types';

const CACHED_SESSIONS_KEY = 'offline_cache_sessions_v1';
const CACHED_ARTICLES_KEY = 'offline_cache_articles_v1';

export async function saveCachedSessions(sessions: Session[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHED_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.warn('[offlineContent] Failed to save sessions cache', error);
  }
}

export async function loadCachedSessions(): Promise<Session[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_SESSIONS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('[offlineContent] Failed to read sessions cache', error);
    return null;
  }
}

export async function saveCachedArticles(articles: Article[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHED_ARTICLES_KEY, JSON.stringify(articles));
  } catch (error) {
    console.warn('[offlineContent] Failed to save articles cache', error);
  }
}

export async function loadCachedArticles(): Promise<Article[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_ARTICLES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Article[];
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('[offlineContent] Failed to read articles cache', error);
    return null;
  }
}
