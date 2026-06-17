import { ImageSource } from 'expo-image';
import { Session } from '@/types';

export function getSessionCover(session: Session): ImageSource | null {
  const uri = session.image_url?.trim();
  if (!uri) return null;
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
