import { create } from 'zustand';
import { CommunityPost, Comment } from '@/types';
import { COMMUNITY_POSTS } from '@/mocks/community';

interface CommunityState {
  posts: CommunityPost[];
  toggleLike: (postId: string) => void;
  addComment: (postId: string, userName: string, text: string) => void;
  addPost: (board: string, userName: string, text: string) => void;
  likedPosts: Set<string>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: COMMUNITY_POSTS,
  likedPosts: new Set<string>(),

  toggleLike: (postId: string) => {
    const { likedPosts } = get();
    const newLiked = new Set(likedPosts);
    set({
      posts: get().posts.map((post) => {
        if (post.id === postId) {
          const isLiked = newLiked.has(postId);
          if (isLiked) {
            newLiked.delete(postId);
          } else {
            newLiked.add(postId);
          }
          return { ...post, likes: post.likes + (isLiked ? -1 : 1) };
        }
        return post;
      }),
      likedPosts: newLiked,
    });
  },

  addComment: (postId: string, userName: string, text: string) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      userName,
      text,
      timeAgo: 'Just now',
    };
    set({
      posts: get().posts.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, newComment], commentCount: post.commentCount + 1 }
          : post
      ),
    });
  },

  addPost: (board: string, userName: string, text: string) => {
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      board,
      userName,
      timeAgo: 'Just now',
      text,
      likes: 0,
      commentCount: 0,
      comments: [],
    };
    set({ posts: [newPost, ...get().posts] });
  },
}));
