import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Brain, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { usePlayerStore } from '@/stores/playerStore';
import { THREE_AM_CATEGORIES, getThreeAmSessions } from '@/mocks/sessions';
import { Session } from '@/types';
import SessionCard from '@/components/SessionCard';
import { ScreenHeader } from '@/components/ScreenHeader';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Hot & restless': <Flame size={18} color={Colors.accent} />,
  'Racing mind': <Brain size={18} color={Colors.accent} />,
  'Lean into this hour': <Heart size={18} color={Colors.accent} />,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Hot & restless': 'Cooling techniques for night sweats and overheating',
  'Racing mind': 'Calm a mind that won\'t switch off',
  'Lean into this hour': 'Embrace the quiet of the night',
};

export default function ThreeAmScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>(THREE_AM_CATEGORIES[0]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setCurrentSession } = usePlayerStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setSelectedCategory(cat);
  }, []);

  const handleSessionPress = useCallback((session: Session) => {
    setCurrentSession(session);
    router.push('/player');
  }, [setCurrentSession, router]);

  const sessions = getThreeAmSessions(selectedCategory);

  return (
    <LinearGradient
      colors={[Colors.gradientStart, '#1A0E30', Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="3am Mode" backLabel="Home" />
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heroText}>It's okay to be awake.</Text>
          <Text style={styles.heroSubtext}>What's happening right now?</Text>

          <View style={styles.categories}>
            {THREE_AM_CATEGORIES.map((cat) => {
              const isSelected = cat === selectedCategory;
              return (
                <Pressable
                  key={cat}
                  onPress={() => handleCategoryChange(cat)}
                  testID={`category-${cat}`}
                >
                  <LinearGradient
                    colors={isSelected
                      ? ['rgba(201, 169, 110, 0.2)', 'rgba(201, 169, 110, 0.08)']
                      : [Colors.cardBackground, Colors.cardBackgroundLight]
                    }
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                  >
                    <View style={styles.categoryIcon}>
                      {CATEGORY_ICONS[cat]}
                    </View>
                    <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                      {cat}
                    </Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.descriptionText}>
            {CATEGORY_DESCRIPTIONS[selectedCategory]}
          </Text>

          <View style={styles.sessionsContainer}>
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} onPress={handleSessionPress} />
            ))}
          </View>
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
  heroText: {
    fontSize: 26,
    fontWeight: '300' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroSubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  categories: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 100,
  },
  categoryCardSelected: {
    borderColor: 'rgba(201, 169, 110, 0.3)',
  },
  categoryIcon: {
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: Colors.accent,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic' as const,
  },
  sessionsContainer: {
    gap: 0,
  },
});
