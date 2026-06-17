import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Play, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { motion, palette, radius, spacing, type } from '@/constants/theme';
import { Session } from '@/types';
import { getSessionInstructor, getSessionCover } from '@/lib/utils/sessionCover';
import { Photo } from '@/components/Photo';

interface SessionCardProps {
  session: Session;
  onPress: (session: Session) => void;
  variant?: 'row' | 'compact';
}

export default React.memo(function SessionCard({
  session,
  onPress,
  variant = 'row',
}: SessionCardProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const instructor = getSessionInstructor(session);
  const minutes = Math.round(session.duration_seconds / 60);
  const cover = getSessionCover(session);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: motion.pressScale, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handleMoreInfo = useCallback(() => {
    router.push({
      pathname: '/(tabs)/sleep/[sessionId]',
      params: { sessionId: String(session.id) },
    });
  }, [router, session.id]);

  if (variant === 'compact') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          onPress={() => onPress(session)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID={`session-card-${session.id}`}
        >
          <LinearGradient
            colors={[Colors.cardBackground, Colors.cardBackgroundLight]}
            style={styles.compactCard}
          >
            <Text style={styles.compactTitle} numberOfLines={2}>{session.title}</Text>
            {instructor ? <Text style={styles.instructor}>{instructor}</Text> : null}
            <Text style={styles.duration}>{minutes} min</Text>
            <View style={styles.playButtonSmall}>
              <Play size={14} color={Colors.accent} fill={Colors.accent} />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.rowCard}>
        <View style={styles.thumb}>
          {cover ? <Photo source={cover} variant="card" /> : null}
        </View>
        <View style={styles.middle}>
          <Text style={type.cardTitle} numberOfLines={2}>{session.title}</Text>
          <Text style={styles.metaGold}>
            {[instructor, `${minutes} min`].filter(Boolean).join(' · ')}
          </Text>
          <Pressable onPress={handleMoreInfo} style={styles.moreInfoPill} hitSlop={8}>
            <Text style={styles.moreInfoText}>More info</Text>
            <ChevronRight size={12} color={palette.textMuted} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => onPress(session)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.playButton}
          testID={`session-play-${session.id}`}
        >
          <Play size={16} color={palette.accent} fill={palette.accent} />
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.md,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: palette.surface,
  },
  middle: {
    flex: 1,
    gap: 4,
  },
  metaGold: {
    fontSize: 13,
    color: palette.accent,
    fontWeight: '500',
  },
  moreInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 2,
    marginTop: 4,
  },
  moreInfoText: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructor: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
    marginBottom: 4,
  },
  duration: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  playButtonSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  compactCard: {
    borderRadius: 14,
    padding: 14,
    width: 165,
    height: 140,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 20,
  },
});
