import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CloudMoon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { usePlayerStore } from '@/stores/playerStore';
import { SLEEP_SESSIONS } from '@/mocks/sessions';
import { Session } from '@/types';
import SessionCard from '@/components/SessionCard';

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setCurrentSession } = usePlayerStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleSessionPress = useCallback((session: Session) => {
    setCurrentSession(session);
    router.push('/player');
  }, [setCurrentSession, router]);

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
          {SLEEP_SESSIONS.map((session) => (
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
});
