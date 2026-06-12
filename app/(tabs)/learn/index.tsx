import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoHero } from '@/components/PhotoHero';
import { ChipRow } from '@/components/Chip';
import ArticleCard from '@/components/ArticleCard';
import { useArticles } from '@/lib/hooks/useArticlesQuery';
import { Article } from '@/types';
import { bundledHeroImages } from '@/lib/utils/imageAssets';
import { supabase } from '@/lib/supabase';
import { ARTICLE_CATEGORY_FILTERS } from '@/lib/utils/articleCategories';
import { gradients, palette, spacing, type } from '@/constants/theme';

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const { data, isLoading, error, refetch, isRefetching } = useArticles();
  const [isRecoveringAuth, setIsRecoveringAuth] = useState(false);

  const articles = data ?? [];
  const activeFilter = ARTICLE_CATEGORY_FILTERS.find((c) => c.label === activeCategory);
  const filteredArticles =
    !activeFilter || !activeFilter.value
      ? articles
      : articles.filter((a) => a.category === activeFilter.value);

  const handleArticlePress = useCallback((article: Article) => {
    router.push(`/(tabs)/learn/${article.id}`);
  }, [router]);

  const recoverAuthAndRefetch = useCallback(async () => {
    try {
      setIsRecoveringAuth(true);
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          await supabase.auth.refreshSession();
        }
      }
      await refetch();
    } catch {
      await refetch();
    } finally {
      setIsRecoveringAuth(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      if (error) recoverAuthAndRefetch();
    }, [error, recoverAuthAndRefetch]),
  );

  if (isLoading) {
    return (
      <LinearGradient colors={[...gradients.appBackground.colors]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={type.meta}>Loading articles...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...gradients.appBackground.colors]} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <PhotoHero
          source={bundledHeroImages.learn}
          height={250}
          eyebrow="LEARN"
          title="Learn"
          subtitle="Understanding your sleep is the first step to changing it"
        />

        <View style={styles.section}>
          <ChipRow
            options={ARTICLE_CATEGORY_FILTERS.map((c) => c.label)}
            selected={activeCategory}
            onSelect={setActiveCategory}
            testIDPrefix="learn-category"
          />

          {Boolean(error) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Couldn&apos;t load articles. Check your connection.</Text>
              <Pressable
                onPress={recoverAuthAndRefetch}
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
              >
                <Text style={styles.retryText}>
                  {(isRefetching || isRecoveringAuth) ? 'Retrying...' : 'Retry'}
                </Text>
              </Pressable>
            </View>
          )}

          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} onPress={handleArticlePress} />
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.screenGutter,
    marginTop: spacing.lg,
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.cardBackground,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accentDim,
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
