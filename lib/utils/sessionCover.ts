import { ImageSource } from 'expo-image';
import { Session } from '@/types';
import { sessionTileImages } from './imageAssets';

const categoryImages: Record<string, string> = {
  meditation: sessionTileImages[0],
  'body scan': sessionTileImages[1],
  yoga: sessionTileImages[2],
  breathwork: sessionTileImages[0],
};

export function getSessionCover(session: Session): ImageSource {
  const key = session.category?.toLowerCase() ?? '';
  const uri = categoryImages[key] ?? sessionTileImages[session.id % sessionTileImages.length];
  return { uri };
}

export function getSessionTags(session: Session): string[] {
  const tags: string[] = [];
  if (session.category?.trim()) {
    tags.push(session.category.trim());
  }
  const mood = session.mood_tag?.trim();
  if (mood && mood !== session.category) {
    tags.push(mood);
  }
  return tags.slice(0, 3);
}

export function getSessionInstructor(session: Session): string | undefined {
  return session.instructor ?? session.teacher_name;
}
