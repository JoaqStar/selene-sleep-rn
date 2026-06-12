import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { ImageSource } from 'expo-image';
import { Play } from 'lucide-react-native';
import { Photo } from '@/components/Photo';
import { Session } from '@/types';
import { getSessionInstructor } from '@/lib/utils/sessionCover';
import { motion, palette, radius, spacing, type } from '@/constants/theme';

type FeatureCardProps = {
  session: Session;
  imageSource: ImageSource;
  onPlay: (session: Session) => void;
};

export function FeatureCard({ session, imageSource, onPlay }: FeatureCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const instructor = getSessionInstructor(session);
  const minutes = Math.round(session.duration_seconds / 60);
  const meta = [instructor, `${minutes} min`].filter(Boolean).join(' · ');

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: motion.pressScale, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => onPlay(session)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`feature-session-${session.id}`}
      >
        <View style={styles.card}>
          <Photo source={imageSource} variant="card" />
          <View style={styles.overlay}>
            <Text style={type.titleSerif} numberOfLines={2}>{session.title}</Text>
            <View style={styles.footer}>
              <Text style={styles.meta}>{meta}</Text>
              <View style={styles.playButton}>
                <Play size={18} color={palette.background} fill={palette.background} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 224,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  overlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  meta: {
    flex: 1,
    fontSize: 13,
    color: palette.accent,
    fontWeight: '500',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
