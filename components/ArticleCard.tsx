import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Article } from '@/types';
import { isSeleneAuthor } from '@/lib/utils/articleAuthor';
import { getArticleCategoryLabel } from '@/lib/utils/articleCategories';
import { Photo } from '@/components/Photo';
import { Badge } from '@/components/Badge';
import { motion, palette, radius, spacing, type } from '@/constants/theme';

interface ArticleCardProps {
  article: Article;
  onPress: (article: Article) => void;
}

export default React.memo(function ArticleCard({ article, onPress }: ArticleCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageUrl = article.image_url?.trim();
  const seleneAuthor = isSeleneAuthor(article.author);
  const hasImage = Boolean(imageUrl);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: motion.pressScale, useNativeDriver: true }).start();
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
          {hasImage ? (
            <View style={styles.imageBlock}>
              <Photo source={{ uri: imageUrl! }} variant="card" />
              <View style={styles.badgeOnImage}>
                <Badge label={getArticleCategoryLabel(article.category)} />
              </View>
            </View>
          ) : null}

          <View style={styles.textBlock}>
            {!hasImage ? (
              <Badge label={getArticleCategoryLabel(article.category)} />
            ) : null}
            <Text style={type.cardTitle} numberOfLines={2}>{article.title}</Text>
            <Text style={styles.standfirst} numberOfLines={2}>{article.standfirst}</Text>
            <View style={styles.footer}>
              <Text style={[styles.author, seleneAuthor && styles.authorSelene]}>
                {article.author}
              </Text>
              {article.readTime ? (
                <View style={styles.readTimeRow}>
                  <Clock size={11} color={palette.textMuted} />
                  <Text style={styles.readTime}>{article.readTime}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.cardBackground,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  imageBlock: {
    height: 168,
    position: 'relative',
  },
  badgeOnImage: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
  },
  textBlock: {
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  standfirst: {
    ...type.base,
    color: palette.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  author: {
    fontSize: 12,
    color: palette.accent,
    fontWeight: '500',
    flex: 1,
  },
  authorSelene: {
    fontWeight: '600',
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTime: {
    fontSize: 12,
    color: palette.textMuted,
  },
});
