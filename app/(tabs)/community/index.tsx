import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useCommunityStore } from '@/stores/communityStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { BOARDS } from '@/mocks/community';
import { CommunityPost } from '@/types';
import CommunityPostCard from '@/components/CommunityPostCard';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [activeBoard, setActiveBoard] = useState<string>(BOARDS[0]);
  const [newPostText, setNewPostText] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const { posts, addPost } = useCommunityStore();
  const { userName } = useOnboardingStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const filteredPosts = posts.filter((p) => p.board === activeBoard);

  const handlePostPress = useCallback((_post: CommunityPost) => {
    console.log('Post pressed:', _post.id);
  }, []);

  const handleSubmitPost = useCallback(() => {
    const trimmed = newPostText.trim();
    if (!trimmed) {
      Alert.alert('Empty post', 'Please write something before posting.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addPost(activeBoard, userName || 'Anonymous', trimmed);
    setNewPostText('');
    setShowCompose(false);
  }, [newPostText, activeBoard, userName, addPost]);

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.iconContainer}>
              <Users size={24} color={Colors.accent} />
            </View>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>You're not alone in this. Share, ask, connect.</Text>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.boardScroll}
              contentContainerStyle={styles.boardContainer}
            >
              {BOARDS.map((board) => {
                const isActive = board === activeBoard;
                return (
                  <Pressable
                    key={board}
                    onPress={() => setActiveBoard(board)}
                    testID={`board-${board}`}
                  >
                    <View style={[styles.boardPill, isActive && styles.boardPillActive]}>
                      <Text style={[styles.boardPillText, isActive && styles.boardPillTextActive]}>
                        {board}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            <Pressable
              onPress={() => setShowCompose(!showCompose)}
              style={styles.composeToggle}
              testID="compose-toggle"
            >
              <Text style={styles.composeToggleText}>
                {showCompose ? 'Cancel' : 'Share something...'}
              </Text>
            </Pressable>

            {showCompose ? (
              <View style={styles.composeBox}>
                <TextInput
                  style={styles.composeInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor={Colors.textMuted}
                  value={newPostText}
                  onChangeText={setNewPostText}
                  multiline
                  maxLength={500}
                  autoFocus
                  testID="compose-input"
                />
                <Pressable onPress={handleSubmitPost} style={styles.sendButton} testID="submit-post">
                  <Send size={18} color={Colors.accent} />
                </Pressable>
              </View>
            ) : null}
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {filteredPosts.map((post) => (
              <CommunityPostCard key={post.id} post={post} onPress={handlePostPress} />
            ))}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '300' as const,
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  boardScroll: {
    marginBottom: 18,
  },
  boardContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  boardPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  boardPillActive: {
    backgroundColor: Colors.accentDim,
    borderColor: 'rgba(201, 169, 110, 0.3)',
  },
  boardPillText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  boardPillTextActive: {
    color: Colors.accent,
  },
  composeToggle: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  composeToggleText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  composeBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  composeInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top' as const,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
