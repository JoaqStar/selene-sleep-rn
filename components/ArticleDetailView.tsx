import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Play, Bookmark } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useArticles } from '@/lib/hooks/useArticlesQuery';
import { useSessions } from '@/lib/hooks/useSessionsQuery';
import { usePlayerStore } from '@/stores/playerStore';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Photo } from '@/components/Photo';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { heroImages } from '@/lib/utils/imageAssets';
import { formatSourceMeta, parseArticleSources } from '@/lib/utils/articleSources';
import { openInAppBrowser } from '@/lib/utils/inAppBrowser';
import { getArticleCategoryLabel } from '@/lib/utils/articleCategories';
import { gradients, palette, spacing, type } from '@/constants/theme';
import {
  ArticleCommunityEngagement,
  ArticleDiscussionStack,
} from '@/components/ArticleCommunityEngagement';

type ArticleDetailViewProps = {
  articleId: string;
  backLabel: string;
  discussionStack: ArticleDiscussionStack;
};

export function ArticleDetailView({ articleId, backLabel, discussionStack }: ArticleDetailViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setCurrentSession } = usePlayerStore();
  const { data: articles, isLoading, isFetched } = useArticles();
  const isArticlesLoading = isLoading || !isFetched;
  const { data: sessions } = useSessions();

  const id = parseInt(articleId, 10);
  const hasValidId = Number.isFinite(id);
  const article = hasValidId ? (articles ?? []).find((a) => a.id === id) : undefined;

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

  if (isArticlesLoading) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.stateContent}>
          <ScreenHeader title="Article" backLabel={backLabel} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Loading article...</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (!article) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.stateContent}>
          <ScreenHeader title="Article" backLabel={backLabel} />
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Article not found</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  const paragraphs = article.body.split('\n\n');
  const imageUrl = article.image_url?.trim();
  const articleSources = parseArticleSources(article.sources);
  const categoryLabel = getArticleCategoryLabel(article.category);
  const dateLabel = article.created_at
    ? new Date(article.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const bylineMeta = [dateLabel, article.readTime].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {imageUrl ? (
          <View style={styles.hero}>
            <Photo source={{ uri: imageUrl }} variant="hero" />
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { top: insets.top + spacing.md }]}
              hitSlop={12}
            >
              <ArrowLeft size={20} color={palette.text} />
            </Pressable>
            <View style={styles.heroOverlay}>
              <Badge label={categoryLabel} />
              <Text style={type.titleSerif}>{article.title}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.textHeader, { paddingTop: insets.top + spacing.md }]}>
            <Pressable onPress={() => router.back()} style={styles.backButtonInline} hitSlop={12}>
              <ArrowLeft size={20} color={palette.text} />
              <Text style={styles.backLabel}>{backLabel}</Text>
            </Pressable>
            <Badge label={categoryLabel} />
            <Text style={type.titleSerif}>{article.title}</Text>
            <Text style={styles.standfirst}>{article.standfirst}</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.bylineRow}>
            <Avatar name={article.author} size={36} />
            <View style={styles.bylineText}>
              <Text style={styles.authorName}>{article.author}</Text>
              {bylineMeta ? <Text style={styles.bylineMeta}>{bylineMeta}</Text> : null}
            </View>
            <Bookmark size={20} color={palette.textMuted} />
          </View>

          {imageUrl ? <Text style={styles.standfirst}>{article.standfirst}</Text> : null}

          <View style={styles.divider} />

          {paragraphs.map((para, idx) => (
            <Text key={idx} style={type.body}>{para}</Text>
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

        {article.stream_message_id ? (
          <ArticleCommunityEngagement
            streamMessageId={article.stream_message_id}
            discussionStack={discussionStack}
          />
        ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  stateContent: {
    flex: 1,
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 16,
  },
  hero: {
    height: 280,
    position: 'relative',
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
    marginBottom: spacing.lg,
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
    gap: spacing.sm,
    zIndex: 2,
  },
  textHeader: {
    paddingHorizontal: spacing.screenGutter,
    gap: spacing.md,
  },
  body: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing['2xl'],
    gap: spacing.lg,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  bylineText: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  bylineMeta: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 80,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  standfirst: {
    fontSize: 16,
    color: palette.textSecondary,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
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
