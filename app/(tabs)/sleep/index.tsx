import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CloudMoon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { usePlayerStore } from '@/stores/playerStore';
import { useSessions } from '@/lib/hooks/useSessionsQuery';
import { Session } from '@/types';
import SessionCard from '@/components/SessionCard';

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setCurrentSession } = usePlayerStore();
  const { data, isLoading, error, refetch, isRefetching } = useSessions();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const sleepSessions = (data ?? []).filter(s => s.mood_tag === "can't sleep");

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleSessionPress = useCallback((session: Session) => {
    setCurrentSession(session);
    router.push('/player');
  }, [setCurrentSession, router]);

  const hasLoadError = Boolean(error);

  if (isLoading) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, '#0E1228', Colors.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, '#0E1228', Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <CloudMoon size={28} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Evening Wind-Down</Text>
          <Text style={styles.subtitle}>Prepare your body and mind for deep, restorative sleep</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.divider} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {hasLoadError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Couldn&apos;t load sessions. Check your connection.</Text>
              <Pressable
                onPress={() => refetch()}
                style={({ pressed }) => [
                  styles.errorRetryButton,
                  (pressed || isRefetching) && styles.errorRetryButtonPressed,
                ]}
              >
                <Text style={styles.errorRetryText}>
                  {isRefetching ? 'Retrying...' : 'Retry'}
                </Text>
              </Pressable>
            </View>
          )}
          {sleepSessions.map((session) => (
            <SessionCard key={session.id} session={session} onPress={handleSessionPress} />
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
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 24,
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
