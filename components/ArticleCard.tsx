import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { BookOpen, Clock, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Article } from '@/types';

interface ArticleCardProps {
  article: Article;
  onPress: (article: Article) => void;
}

export default React.memo(function ArticleCard({ article, onPress }: ArticleCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    onPress(article);
  }, [onPress, article]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`article-card-${article.id}`}
      >
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.categoryBadge}>
              <BookOpen size={11} color={Colors.accent} />
              <Text style={styles.categoryText}>{article.category}</Text>
            </View>
            <View style={styles.metaRow}>
              <Clock size={11} color={Colors.textMuted} />
              <Text style={styles.readTime}>{article.readTime} min</Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
          <Text style={styles.standfirst} numberOfLines={2}>{article.standfirst}</Text>
          <View style={styles.bottomRow}>
            <Text style={styles.voice}>{article.voice}</Text>
            <ChevronRight size={16} color={Colors.textMuted} />
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
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.2,
    marginBottom: 6,
    lineHeight: 24,
  },
  standfirst: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voice: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
});
