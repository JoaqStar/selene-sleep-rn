import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Play, User, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Photo } from '@/components/Photo';
import { Badge } from '@/components/Badge';
import { useSessions } from '@/lib/hooks/useSessionsQuery';
import { usePlayerStore } from '@/stores/playerStore';
import { getSessionCover, getSessionInstructor, getSessionTags } from '@/lib/utils/sessionCover';
import { gradients, palette, spacing, type, radius } from '@/constants/theme';

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setCurrentSession } = usePlayerStore();
  const { data: sessions } = useSessions();

  const id = parseInt(sessionId ?? '', 10);
  const session = (sessions ?? []).find((s) => s.id === id);

  const handlePlay = useCallback(() => {
    if (!session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentSession(session);
    router.push('/player');
  }, [session, setCurrentSession, router]);

  if (!session) {
    return (
      <LinearGradient colors={[...gradients.appBackground.colors]} style={styles.container}>
        <View style={[styles.notFound, { paddingTop: insets.top + spacing.xl }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={palette.text} />
          </Pressable>
          <Text style={type.base}>Session not found</Text>
        </View>
      </LinearGradient>
    );
  }

  const instructor = getSessionInstructor(session);
  const minutes = Math.round(session.duration_seconds / 60);
  const tags = getSessionTags(session);
  const paragraphs = session.description?.split('\n\n').filter(Boolean) ?? [];
  const cover = getSessionCover(session);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {cover ? (
          <View style={styles.hero}>
            <Photo source={cover} variant="hero" />
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { top: insets.top + spacing.md }]}
              hitSlop={12}
            >
              <ArrowLeft size={20} color={palette.text} />
            </Pressable>
            <View style={styles.heroOverlay}>
              <Text style={type.eyebrow}>SLEEP MEDITATION</Text>
              <Text style={type.titleSerif}>{session.title}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.textHeader, { paddingTop: insets.top + spacing.md }]}>
            <Pressable onPress={() => router.back()} style={styles.backButtonInline} hitSlop={12}>
              <ArrowLeft size={20} color={palette.text} />
              <Text style={styles.backLabel}>Sleep</Text>
            </Pressable>
            <Text style={type.eyebrow}>SLEEP MEDITATION</Text>
            <Text style={type.titleSerif}>{session.title}</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.metaRow}>
            {instructor ? (
              <View style={styles.metaItem}>
                <User size={14} color={palette.accent} />
                <Text style={styles.metaGold}>{instructor}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Clock size={14} color={palette.textMuted} />
              <Text style={styles.metaMuted}>{minutes} min</Text>
            </View>
          </View>

          {tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <Badge key={tag} label={tag} variant="tag" />
              ))}
            </View>
          ) : null}

          {paragraphs.map((para, idx) => (
            <Text key={idx} style={[type.body, styles.paragraph]}>{para}</Text>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable onPress={handlePlay} style={styles.playCta} testID="play-session-cta">
          <Play size={18} color={palette.background} fill={palette.background} />
          <Text style={styles.playCtaText}>Play session</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  hero: {
    height: 300,
    position: 'relative',
  },
  textHeader: {
    paddingHorizontal: spacing.screenGutter,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: spacing.screenGutter,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11,14,26,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  backLabel: {
    fontSize: 15,
    color: palette.textSecondary,
  },
  heroOverlay: {
    position: 'absolute',
    left: spacing.screenGutter,
    right: spacing.screenGutter,
    bottom: spacing['2xl'],
    zIndex: 2,
  },
  body: {
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaGold: {
    fontSize: 14,
    color: palette.accent,
    fontWeight: '500',
  },
  metaMuted: {
    fontSize: 14,
    color: palette.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paragraph: {
    color: palette.textSecondary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.md,
    backgroundColor: palette.background,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  playCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
  },
  playCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.background,
  },
  notFound: {
    paddingHorizontal: spacing.screenGutter,
    gap: spacing.lg,
  },
});
