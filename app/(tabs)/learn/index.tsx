import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useArticles } from '@/lib/hooks/useArticlesQuery';
import { Article } from '@/types';
import ArticleCard from '@/components/ArticleCard';
import TagPillSlider from '@/components/TagPillSlider';
import { supabase } from '@/lib/supabase';
import { ARTICLE_CATEGORY_FILTERS } from '@/lib/utils/articleCategories';

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const { data, isLoading, error, refetch, isRefetching } = useArticles();
  const [isRecoveringAuth, setIsRecoveringAuth] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const articles = data ?? [];
  const activeFilter = ARTICLE_CATEGORY_FILTERS.find((c) => c.label === activeCategory);
  const filteredArticles =
    !activeFilter || !activeFilter.value
      ? articles
      : articles.filter((a) => a.category === activeFilter.value);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleArticlePress = useCallback((article: Article) => {
    router.push(`/(tabs)/learn/${article.id}`);
  }, [router]);

  const recoverAuthAndRefetch = useCallback(async () => {
    try {
      setIsRecoveringAuth(true);
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await supabase.auth.refreshSession();
        }
      }
      await refetch();
    } catch (recoveryError) {
      console.warn('[Learn] Failed to recover auth before article refetch', recoveryError);
      await refetch();
    } finally {
      setIsRecoveringAuth(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      if (error) {
        recoverAuthAndRefetch();
      }
    }, [error, recoverAuthAndRefetch]),
  );

  if (isLoading) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <BookOpen size={24} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Learn</Text>
          <Text style={styles.subtitle}>Understanding your sleep is the first step to changing it</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <TagPillSlider
            options={ARTICLE_CATEGORY_FILTERS.map((cat) => cat.label)}
            selectedValues={[activeCategory]}
            onPressOption={setActiveCategory}
            testIDPrefix="learn-category"
          />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {Boolean(error) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Couldn&apos;t load articles. Check your connection.</Text>
              <Pressable
                onPress={recoverAuthAndRefetch}
                style={({ pressed }) => [
                  styles.errorRetryButton,
                  (pressed || isRefetching || isRecoveringAuth) && styles.errorRetryButtonPressed,
                ]}
              >
                <Text style={styles.errorRetryText}>
                  {(isRefetching || isRecoveringAuth) ? 'Retrying...' : 'Retry'}
                </Text>
              </Pressable>
            </View>
          )}
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} onPress={handleArticlePress} />
          ))}
        </Animated.View>
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
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
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
    paddingHorizontal: 10,
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  errorRetryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.accentDim,
  },
  errorRetryButtonPressed: {
    opacity: 0.85,
  },
  errorRetryText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
