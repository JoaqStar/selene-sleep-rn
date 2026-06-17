import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoHero, PhotoHeroIconButton } from '@/components/PhotoHero';
import { FeatureCard } from '@/components/FeatureCard';
import SessionCard from '@/components/SessionCard';
import { usePlayerStore } from '@/stores/playerStore';
import { useSessions } from '@/lib/hooks/useSessionsQuery';
import { Session } from '@/types';
import { bundledHeroImages } from '@/lib/utils/imageAssets';
import { gradients, palette, spacing, type } from '@/constants/theme';

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setCurrentSession } = usePlayerStore();
  const { data, isLoading, error, refetch, isRefetching } = useSessions();

  const sleepSessions = (data ?? []).filter((s) => s.mood_tag === "can't sleep");
  const featuredSession = sleepSessions[0] ?? (data ?? [])[0];

  const handleSessionPress = useCallback((session: Session) => {
    setCurrentSession(session);
    router.push('/player');
  }, [setCurrentSession, router]);

  if (isLoading) {
    return (
      <LinearGradient colors={[...gradients.appBackground.colors]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={type.meta}>Loading sessions...</Text>
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
          source={bundledHeroImages.sleep}
          height={250}
          eyebrow="SLEEP"
          title="Evening Wind-Down"
          subtitle="Prepare your body and mind for deep, restorative sleep"
          rightAction={(
            <PhotoHeroIconButton onPress={() => {}} testID="sleep-search">
              <Search size={20} color={palette.textMuted} />
            </PhotoHeroIconButton>
          )}
        />

        <View style={styles.section}>
          <Text style={[type.eyebrow, styles.sectionEyebrow]}>FEATURED TONIGHT</Text>
          {featuredSession ? (
            <FeatureCard
              session={featuredSession}
              onPlay={handleSessionPress}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[type.section, styles.listTitle]}>All sessions</Text>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Couldn&apos;t load sessions. Check your connection.</Text>
              <Pressable onPress={() => refetch()} style={styles.retryButton}>
                <Text style={styles.retryText}>{isRefetching ? 'Retrying...' : 'Retry'}</Text>
              </Pressable>
            </View>
          ) : null}
          {sleepSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={handleSessionPress}
            />
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
    marginTop: spacing['3xl'],
  },
  sectionEyebrow: {
    marginBottom: spacing.lg,
  },
  listTitle: {
    marginBottom: spacing.lg,
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
  retryText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
