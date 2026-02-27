export interface Session {
  id: string;
  title: string;
  instructor: string;
  duration: number;
  category: string;
  subcategory?: string;
  audioUrl: string;
  description?: string;
}

export interface Article {
  id: string;
  category: string;
  voice: string;
  readTime: number;
  title: string;
  standfirst: string;
  body: string;
  relatedSessionId: string;
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
