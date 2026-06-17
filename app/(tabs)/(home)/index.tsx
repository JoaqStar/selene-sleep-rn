import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, ChevronRight, Settings } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoHero, PhotoHeroIconButton } from '@/components/PhotoHero';
import { FeaturedArticleCard } from '@/components/FeaturedArticleCard';
import { PhotoTile } from '@/components/PhotoTile';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSessions } from '@/lib/hooks/useSessionsQuery';
import { useArticles } from '@/lib/hooks/useArticlesQuery';
import { Session, Article } from '@/types';
import { bundledHeroImages } from '@/lib/utils/imageAssets';
import { getHomeHeroImage } from '@/lib/utils/homeHeroImage';
import { getSessionCover } from '@/lib/utils/sessionCover';
import { getContextualEyebrow, getTimeGreeting } from '@/lib/utils/formatGreeting';
import { gradients, palette, spacing, type } from '@/constants/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { username } = useOnboardingStore();
  const { setCurrentSession } = usePlayerStore();
  const { data: sessions, error: sessionsError, refetch: refetchSessions, isRefetching } = useSessions();
  const { data: articles } = useArticles();
  const threeAmShownRef = useRef(false);
  const [homeHeroSource, setHomeHeroSource] = useState(getHomeHeroImage);

  const latestArticle = (articles ?? [])[0];
  const exploreSessions = (sessions ?? []).slice(0, 6);

  const handleSessionPress = useCallback((session: Session) => {
    setCurrentSession(session);
    router.push('/player');
  }, [setCurrentSession, router]);

  const handleArticlePress = useCallback((article: Article) => {
    router.push(`/(tabs)/(home)/${article.id}`);
  }, [router]);

  const handleThreeAmPress = useCallback(() => {
    router.push('/(tabs)/(home)/three-am');
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  }, [router]);

  const shouldShowThreeAmNow = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 90 && totalMinutes <= 300;
  }, []);

  const maybeAutoOpenThreeAm = useCallback(() => {
    if (threeAmShownRef.current || !shouldShowThreeAmNow()) return;
    threeAmShownRef.current = true;
    router.push('/(tabs)/(home)/three-am');
  }, [router, shouldShowThreeAmNow]);

  const refreshHomeHero = useCallback(() => {
    setHomeHeroSource(getHomeHeroImage());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshHomeHero();
      maybeAutoOpenThreeAm();
    }, [maybeAutoOpenThreeAm, refreshHomeHero]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refreshHomeHero();
        maybeAutoOpenThreeAm();
      }
    });
    return () => sub.remove();
  }, [maybeAutoOpenThreeAm, refreshHomeHero]);

  const greeting = `${getTimeGreeting()},\n${username || 'Friend'}`;
  const articleImage = latestArticle?.image_url?.trim()
    ? { uri: latestArticle.image_url.trim() }
    : bundledHeroImages.learn;

  return (
    <LinearGradient colors={[...gradients.appBackground.colors]} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <PhotoHero
          source={homeHeroSource}
          height={384}
          eyebrow={getContextualEyebrow()}
          title={greeting}
          rightAction={(
            <PhotoHeroIconButton onPress={handleOpenSettings} testID="settings-button">
              <Settings size={20} color={palette.textMuted} />
            </PhotoHeroIconButton>
          )}
        />

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={type.eyebrow}>LATEST ARTICLE</Text>
            <Pressable onPress={() => router.push('/(tabs)/learn')} hitSlop={8}>
              <Text style={styles.goldLink}>All articles</Text>
            </Pressable>
          </View>

          {latestArticle ? (
            <FeaturedArticleCard
              article={latestArticle}
              imageSource={articleImage}
              onPress={handleArticlePress}
            />
          ) : (
            <Text style={type.meta}>No articles yet</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={type.section}>Sleep Meditations</Text>
            <Pressable onPress={() => router.push('/(tabs)/sleep')} hitSlop={8}>
              <Text style={styles.goldLink}>See all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.railScroll}
            contentContainerStyle={styles.rail}
          >
            {exploreSessions.map((session) => (
              <PhotoTile
                key={session.id}
                source={getSessionCover(session)}
                title={session.title}
                subtitle={`${Math.round(session.duration_seconds / 60)} min`}
                onPress={() => handleSessionPress(session)}
                testID={`explore-session-${session.id}`}
              />
            ))}
          </ScrollView>
          {sessionsError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Couldn&apos;t load sessions.</Text>
              <Pressable onPress={() => refetchSessions()} style={styles.retryButton}>
                <Text style={styles.retryText}>{isRefetching ? 'Retrying...' : 'Retry'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, { paddingHorizontal: spacing.screenGutter }]}>
          <Pressable onPress={handleThreeAmPress} style={styles.threeAmStrip} testID="three-am-mode-button">
            <AlertCircle size={20} color={palette.accent} />
            <Text style={styles.threeAmText}>
              Awake at 3am? <Text style={styles.threeAmBold}>We&apos;ve got you.</Text>
            </Text>
            <ChevronRight size={18} color={palette.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.screenGutter,
    marginTop: spacing['3xl'],
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  goldLink: {
    fontSize: 13,
    color: palette.accent,
    fontWeight: '600',
  },
  railScroll: {
    marginHorizontal: -spacing.screenGutter,
  },
  rail: {
    paddingHorizontal: spacing.screenGutter,
  },
  threeAmStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.accentDim12,
    borderWidth: 1,
    borderColor: palette.accentBorder,
    borderRadius: 14,
    padding: spacing.lg,
  },
  threeAmText: {
    flex: 1,
    fontSize: 15,
    color: palette.text,
  },
  threeAmBold: {
    color: palette.accent,
    fontWeight: '600',
  },
  errorBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.cardBackground,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accentDim,
  },
  retryText: {
    fontSize: 13,
    color: palette.accent,
    fontWeight: '600',
  },
});
