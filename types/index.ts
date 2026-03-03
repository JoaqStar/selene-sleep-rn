export interface Session {
  id: number;
  title: string;
  description: string;
  duration_seconds: number;
  category: string;
  mood_tag: string;
  audio_url: string;
  is_published: boolean;
  sort_order: number;
  instructor?: string;
}

export interface Article {
  id: number;
  title: string;
  standfirst: string;
  body: string;
  category: string;
  author: string;
  related_session_id: number | null;
  is_published: boolean;
  readTime?: string;
}

export interface Comment {
  id: string;
  userName: string;
  text: string;
  timeAgo: string;
}

export interface CommunityPost {
  id: string;
  board: string;
  userName: string;
  timeAgo: string;
  text: string;
  likes: number;
  commentCount: number;
  comments: Comment[];
}
