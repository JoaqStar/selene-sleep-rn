import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Play, BookOpen } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ARTICLES } from '@/mocks/articles';
import { SESSIONS } from '@/mocks/sessions';
import { usePlayerStore } from '@/stores/playerStore';

export default function ArticleDetailScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const router = useRouter();
  const { setCurrentSession } = usePlayerStore();

  const article = ARTICLES.find((a) => a.id === articleId);

  const relatedSession = article
    ? SESSIONS.find((s) => s.id === article.relatedSessionId)
    : undefined;

  const handlePlayRelated = useCallback(() => {
    if (relatedSession) {
      setCurrentSession(relatedSession);
      router.push('/player');
    }
  }, [relatedSession, setCurrentSession, router]);

  if (!article) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Article not found</Text>
      </View>
    );
  }

  const paragraphs = article.body.split('\n\n');

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <BookOpen size={11} color={Colors.accent} />
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          <View style={styles.readTimeRow}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.readTime}>{article.readTime} min read</Text>
          </View>
        </View>

        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.standfirst}>{article.standfirst}</Text>

        <View style={styles.voiceBadge}>
          <Text style={styles.voiceText}>{article.voice}</Text>
        </View>

        <View style={styles.divider} />

        {paragraphs.map((para, idx) => (
          <Text key={idx} style={styles.bodyText}>{para}</Text>
        ))}

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
                    {relatedSession.instructor} · {relatedSession.duration} min
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
  voiceText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
