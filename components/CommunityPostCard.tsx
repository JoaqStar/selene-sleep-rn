import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Heart, MessageCircle, Pencil, BookOpen } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { palette, radius, spacing, type } from '@/constants/theme';

export type CommunityPostCardData = {
  id: string;
  userName: string;
  timeAgo: string;
  text: string;
  tags: string[];
  likes: number;
  commentCount: number;
  liked: boolean;
  isOwnPost?: boolean;
  articlePost?: {
    articleId: string;
    title: string;
    standfirst: string;
  };
};

type CommunityPostCardProps = {
  post: CommunityPostCardData;
  onLike: () => void;
  onComment: () => void;
  onEdit?: () => void;
  onOpenArticle?: (articleId: string) => void;
};

export function CommunityPostCard({
  post,
  onLike,
  onComment,
  onEdit,
  onOpenArticle,
}: CommunityPostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.userName} size={40} />
        <View style={styles.headerText}>
          <Text style={styles.userName}>{post.userName}</Text>
          <Text style={styles.timeAgo}>{post.timeAgo}</Text>
        </View>
        <View style={styles.tagRow}>
          {post.tags.slice(0, 3).map((tag) => (
            <Badge key={`${post.id}-${tag}`} label={tag} variant="tag" />
          ))}
          {post.isOwnPost && !post.articlePost && onEdit ? (
            <Pressable onPress={onEdit} hitSlop={8} style={styles.editButton}>
              <Pencil size={14} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {post.articlePost ? (
        <Pressable
          onPress={() => onOpenArticle?.(post.articlePost!.articleId)}
          style={({ pressed }) => [styles.articleCard, pressed && styles.pressed]}
        >
          <Badge label="Article" icon={BookOpen} />
          <Text style={styles.articleTitle}>{post.articlePost.title}</Text>
          {post.articlePost.standfirst ? (
            <Text style={styles.articleStandfirst} numberOfLines={3}>
              {post.articlePost.standfirst}
            </Text>
          ) : null}
        </Pressable>
      ) : (
        <Text style={type.base}>{post.text}</Text>
      )}

      <View style={styles.actions}>
        <Pressable onPress={onLike} style={styles.actionButton} hitSlop={8}>
          <Heart
            size={16}
            color={post.liked ? palette.like : palette.textMuted}
            fill={post.liked ? palette.like : 'transparent'}
          />
          <Text style={[styles.actionText, post.liked && styles.actionTextActive]}>
            {post.likes > 0 ? post.likes : 'Like'}
          </Text>
        </Pressable>
        <Pressable onPress={onComment} style={styles.actionButton} hitSlop={8}>
          <MessageCircle size={16} color={palette.textMuted} />
          <Text style={styles.actionText}>
            {post.commentCount > 0 ? post.commentCount : 'Comment'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  timeAgo: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    maxWidth: 120,
    justifyContent: 'flex-end',
  },
  editButton: {
    padding: 4,
  },
  articleCard: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    lineHeight: 22,
  },
  articleStandfirst: {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionText: {
    fontSize: 13,
    color: palette.textMuted,
  },
  actionTextActive: {
    color: palette.like,
  },
});
