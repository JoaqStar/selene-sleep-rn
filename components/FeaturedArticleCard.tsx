import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { ImageSource } from 'expo-image';
import { Photo } from '@/components/Photo';
import { Article } from '@/types';
import { getArticleCategoryLabel } from '@/lib/utils/articleCategories';
import { motion, palette, radius, spacing, type } from '@/constants/theme';

type FeaturedArticleCardProps = {
  article: Article;
  imageSource: ImageSource;
  onPress: (article: Article) => void;
};

export function FeaturedArticleCard({ article, imageSource, onPress }: FeaturedArticleCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: motion.pressScale, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const meta = [article.author, article.readTime].filter(Boolean).join(' · ');

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => onPress(article)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`featured-article-${article.id}`}
      >
        <View style={styles.card}>
          <Photo source={imageSource} variant="card" />
          <View style={styles.overlay}>
            <Text style={styles.category}>{getArticleCategoryLabel(article.category)}</Text>
            <Text style={type.titleSerif} numberOfLines={3}>{article.title}</Text>
            <View style={styles.footer}>
              <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
              <Text style={styles.cta}>Read article →</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 252,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  overlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  category: {
    fontSize: 12,
    color: palette.accentLight,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    color: palette.textSecondary,
  },
  cta: {
    fontSize: 13,
    color: palette.accent,
    fontWeight: '600',
  },
});
