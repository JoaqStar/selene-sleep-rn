import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Play, BookOpen } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useArticles } from '@/lib/hooks/useArticlesQuery';
import { useSessions } from '@/lib/hooks/useSessionsQuery';
import { usePlayerStore } from '@/stores/playerStore';
import { ScreenHeader } from '@/components/ScreenHeader';
import { isSeleneAuthor } from '@/lib/utils/articleAuthor';
import { formatSourceMeta, parseArticleSources } from '@/lib/utils/articleSources';
import { openInAppBrowser } from '@/lib/utils/inAppBrowser';
import { getArticleCategoryLabel } from '@/lib/utils/articleCategories';

export default function ArticleDetailScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const router = useRouter();
  const { setCurrentSession } = usePlayerStore();
  const { data: articles } = useArticles();
  const { data: sessions } = useSessions();

  const id = parseInt(articleId as string, 10);
  const article = (articles ?? []).find((a) => a.id === id);

  const relatedSession = article?.related_session_id
    ? (sessions ?? []).find((s) => s.id === article.related_session_id)
    : undefined;

  const handlePlayRelated = useCallback(() => {
    if (relatedSession) {
      setCurrentSession(relatedSession);
      router.push('/player');
    }
  }, [relatedSession, setCurrentSession, router]);

  const handleOpenSource = useCallback(async (url: string) => {
    try {
      await openInAppBrowser(url);
    } catch (error) {
      console.warn('[Article] Failed to open source URL:', error);
    }
  }, []);

  if (!article) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Article not found</Text>
      </View>
    );
  }

  const paragraphs = article.body.split('\n\n');
  const imageUrl = article.image_url?.trim();
  const articleSources = parseArticleSources(article.sources);
  const seleneAuthor = isSeleneAuthor(article.author);

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Article" backLabel="Learn" />
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <BookOpen size={11} color={Colors.accent} />
            <Text style={styles.categoryText}>{getArticleCategoryLabel(article.category)}</Text>
          </View>
          {article.readTime ? (
            <View style={styles.readTimeRow}>
              <Clock size={12} color={Colors.textMuted} />
              <Text style={styles.readTime}>{article.readTime}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.standfirst}>{article.standfirst}</Text>

        <View style={[styles.voiceBadge, seleneAuthor && styles.voiceBadgeSelene]}>
          <Text style={[styles.voiceText, seleneAuthor && styles.voiceTextSelene]}>
            {article.author}
          </Text>
        </View>

        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : null}

        <View style={styles.divider} />

        {paragraphs.map((para, idx) => (
          <Text key={idx} style={styles.bodyText}>{para}</Text>
        ))}

        {articleSources.length > 0 ? (
          <View style={styles.sourcesSection}>
            <Text style={styles.sourcesLabel}>Reference links</Text>
            {articleSources.map((source, idx) => {
              const meta = formatSourceMeta(source);
              return (
                <Pressable
                  key={`${source.url}-${idx}`}
                  onPress={() => handleOpenSource(source.url)}
                  style={({ pressed }) => [
                    styles.sourceItem,
                    pressed && styles.sourceItemPressed,
                  ]}
                  accessibilityRole="link"
                  accessibilityLabel={source.title || 'Read the original article'}
                >
                  <View style={styles.sourceTitleRow}>
                    <Text style={styles.sourceEmoji}>📰</Text>
                    <Text style={styles.sourceTitle}>
                      {source.title || 'Read the original'}
                    </Text>
                  </View>
                  {meta ? <Text style={styles.sourceMeta}>{meta}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {relatedSession ? (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedLabel}>Related Session</Text>
            <Pressable onPress={handlePlayRelated} testID="play-related-session">
              <LinearGradient
                colors={[Colors.cardBackground, Colors.cardBackgroundLight]}
                style={styles.relatedCard}
              >
                <View style={styles.relatedContent}>
                  <Text style={styles.relatedTitle}>{relatedSession.title}</Text>
                  <Text style={styles.relatedInstructor}>
                    {relatedSession.instructor ? `${relatedSession.instructor} · ` : ''}{Math.round(relatedSession.duration_seconds / 60)} min
                  </Text>
                </View>
                <View style={styles.playButton}>
                  <Play size={16} color={Colors.accent} fill={Colors.accent} />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 60,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 26,
    fontWeight: '400' as const,
    color: Colors.text,
    letterSpacing: 0.3,
    lineHeight: 34,
    marginBottom: 12,
  },
  standfirst: {
    fontSize: 16,
    color: Colors.accentLight,
    lineHeight: 24,
    marginBottom: 12,
    fontStyle: 'italic' as const,
  },
  voiceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 16,
  },
  voiceBadgeSelene: {
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.35)',
  },
  voiceText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  voiceTextSelene: {
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 20,
    backgroundColor: Colors.surface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  sourcesSection: {
    marginTop: 4,
    marginBottom: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sourcesLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },
  sourceItem: {
    marginBottom: 14,
    paddingVertical: 2,
  },
  sourceItemPressed: {
    opacity: 0.7,
  },
  sourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  sourceEmoji: {
    fontSize: 13,
    lineHeight: 20,
  },
  sourceTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(154, 150, 166, 0.5)',
  },
  sourceMeta: {
    marginTop: 2,
    marginLeft: 22,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  relatedSection: {
    marginTop: 12,
  },
  relatedLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  relatedContent: {
    flex: 1,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  relatedInstructor: {
    fontSize: 13,
    color: Colors.accent,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
