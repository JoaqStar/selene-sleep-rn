import * as FileSystem from 'expo-file-system';

const AUDIO_CACHE_DIR = `${FileSystem.documentDirectory}offline-audio/`;

function getSessionAudioPath(sessionId: number): string {
  return `${AUDIO_CACHE_DIR}session-${sessionId}.mp3`;
}

async function ensureAudioCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
  }
}

export async function getCachedAudioUri(sessionId: number): Promise<string | null> {
  try {
    const path = getSessionAudioPath(sessionId);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? path : null;
  } catch (error) {
    console.warn('[offlineAudio] Failed to check cached audio', error);
    return null;
  }
}

export async function cacheAudioForSession(sessionId: number, remoteUrl: string): Promise<void> {
  try {
    if (!remoteUrl) return;
    await ensureAudioCacheDir();

    const destination = getSessionAudioPath(sessionId);
    const existing = await FileSystem.getInfoAsync(destination);
    if (existing.exists) return;

    const result = await FileSystem.downloadAsync(remoteUrl, destination);
    if (result.status !== 200) {
      console.warn('[offlineAudio] Download failed with status', result.status, 'for session', sessionId);
    } else {
      console.log('[offlineAudio] Cached audio for session', sessionId);
    }
  } catch (error) {
    console.warn('[offlineAudio] Failed to cache audio for session', sessionId, error);
  }
}
