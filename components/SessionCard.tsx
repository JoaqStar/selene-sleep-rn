import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Play, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Session } from '@/types';

interface SessionCardProps {
  session: Session;
  onPress: (session: Session) => void;
  compact?: boolean;
}

export default React.memo(function SessionCard({ session, onPress, compact = false }: SessionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    onPress(session);
  }, [onPress, session]);

  if (compact) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID={`session-card-${session.id}`}
        >
          <LinearGradient
            colors={[Colors.cardBackground, Colors.cardBackgroundLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactCard}
          >
            <View style={styles.compactContent}>
              <Text style={styles.compactTitle} numberOfLines={2}>{session.title}</Text>
              {session.instructor ? <Text style={styles.instructor}>{session.instructor}</Text> : null}
              <View style={styles.metaRow}>
                <Clock size={12} color={Colors.textMuted} />
                <Text style={styles.duration}>{Math.round(session.duration_seconds / 60)} min</Text>
              </View>
            </View>
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
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`session-card-${session.id}`}
      >
        <LinearGradient
          colors={[Colors.cardBackground, Colors.cardBackgroundLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
              {session.instructor ? <Text style={styles.instructor}>{session.instructor}</Text> : null}
              {session.description ? (
                <Text style={styles.description} numberOfLines={2}>{session.description}</Text>
              ) : null}
            </View>
            <View style={styles.rightSection}>
              <View style={styles.metaRow}>
                <Clock size={13} color={Colors.textMuted} />
                <Text style={styles.duration}>{Math.round(session.duration_seconds / 60)} min</Text>
              </View>
              <View style={styles.playButton}>
                <Play size={18} color={Colors.accent} fill={Colors.accent} />
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  instructor: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  playButtonSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute' as const,
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
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 20,
  },
});
