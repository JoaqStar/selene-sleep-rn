import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSessions } from '@/lib/hooks/useSessionsQuery';
import { Session } from '@/types';
import SessionCard from '@/components/SessionCard';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userName } = useOnboardingStore();
  const { setCurrentSession } = usePlayerStore();
  const { data, isLoading } = useSessions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const tonightSessions = data ?? [];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSessionPress = useCallback((session: Session) => {
    setCurrentSession(session);
    router.push('/player');
  }, [setCurrentSession, router]);

  const handleThreeAmPress = useCallback(() => {
    router.push('/(tabs)/(home)/three-am');
  }, [router]);

  const renderCompactSession = useCallback(({ item }: { item: Session }) => (
    <SessionCard session={item} onPress={handleSessionPress} compact />
  ), [handleSessionPress]);

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.moonRow}>
            <Moon size={20} color={Colors.accent} />
          </View>
          <Text style={styles.greeting}>{getGreeting()}, {userName || 'Friend'}</Text>
          <Text style={styles.headerSubtitle}>What would you like tonight?</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Pressable onPress={handleThreeAmPress} testID="three-am-mode-button">
            <LinearGradient
              colors={['#1A1040', '#251845', '#1A1040']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.threeAmCard}
            >
              <View style={styles.threeAmIcon}>
                <AlertCircle size={22} color={Colors.accent} />
              </View>
              <View style={styles.threeAmContent}>
                <Text style={styles.threeAmTitle}>3am Mode</Text>
                <Text style={styles.threeAmSubtitle}>Can't sleep? We've got you.</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Tonight's Sessions</Text>
          <Text style={styles.sectionSubtitle}>Drift off with these guided meditations</Text>
        </Animated.View>

        {tonightSessions.map((session) => (
          <Animated.View key={session.id} style={{ opacity: fadeAnim }}>
            <SessionCard session={session} onPress={handleSessionPress} />
          </Animated.View>
        ))}

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Quick Listen</Text>
          <FlatList
            data={tonightSessions}
            renderItem={renderCompactSession}
            keyExtractor={(item) => `compact-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalList}
          />
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 28,
  },
  moonRow: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '300' as const,
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  threeAmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.15)',
  },
  threeAmIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(201, 169, 110, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  threeAmContent: {
    flex: 1,
  },
  threeAmTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.accent,
    marginBottom: 2,
  },
  threeAmSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  horizontalList: {
    marginTop: 4,
    marginBottom: 20,
  },
});
