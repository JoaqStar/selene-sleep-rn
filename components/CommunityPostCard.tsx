import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { CommunityPost } from '@/types';

interface CommunityPostCardProps {
  post: CommunityPost;
  onPress: (post: CommunityPost) => void;
}

export default React.memo(function CommunityPostCard({ post, onPress }: CommunityPostCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;
  const isLiked = false;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    console.log('[CommunityPostCard] Like pressed:', post.id);
  }, [heartAnim, post.id]);

  const handlePress = useCallback(() => {
    onPress(post);
  }, [onPress, post]);

  const initials = post.userName
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`community-post-${post.id}`}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.userName}>{post.userName}</Text>
              <Text style={styles.timeAgo}>{post.timeAgo}</Text>
            </View>
          </View>
          <Text style={styles.postText}>{post.text}</Text>
          <View style={styles.actions}>
            <Pressable onPress={handleLike} style={styles.actionButton} hitSlop={8}>
              <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
                <Heart
                  size={18}
                  color={isLiked ? '#E85D75' : Colors.textMuted}
                  fill={isLiked ? '#E85D75' : 'transparent'}
                />
              </Animated.View>
              <Text style={[styles.actionText, isLiked && styles.likedText]}>{post.likes}</Text>
            </Pressable>
            <View style={styles.actionButton}>
              <MessageCircle size={18} color={Colors.textMuted} />
              <Text style={styles.actionText}>{post.commentCount}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  postText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  likedText: {
    color: '#E85D75',
  },
});
