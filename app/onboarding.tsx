import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { UsernameField } from '@/components/UsernameField';
import { useUsernameAvailability } from '@/lib/hooks/useUsernameAvailability';

export default function OnboardingScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, hasUsername, username: storedUsername } = useOnboardingStore();
  const needsUsernameStep = !hasUsername;
  const { status, message, canSubmit } = useUsernameAvailability(username, {
    excludeCurrentUser: hasUsername,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const moonAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [storedUsername]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(moonAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(moonAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ]),
      ),
    ]).start();
  }, []);

  const usernameReady = needsUsernameStep ? canSubmit : username.trim().length > 0;
  const canContinue = usernameReady && !isSubmitting;

  const handleContinue = useCallback(async () => {
    if (!usernameReady) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    const trimmedDisplay = displayName.trim() || 'Friend';
    const finalUsername = needsUsernameStep ? username : storedUsername || username;
    const result = await completeOnboarding(trimmedDisplay, finalUsername);
    setIsSubmitting(false);

    if (!result.ok) {
      Alert.alert('Username unavailable', result.error);
      return;
    }

    router.replace('/(tabs)/(home)');
  }, [usernameReady, displayName, username, storedUsername, needsUsernameStep, completeOnboarding, router]);

  const moonTranslateY = moonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.moonContainer, { transform: [{ translateY: moonTranslateY }] }]}>
            <View style={styles.moonGlow}>
              <Moon size={48} color={Colors.accent} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.section}>
              {needsUsernameStep ? (
                <UsernameField
                  value={username}
                  onChangeText={setUsername}
                  status={status}
                  message={message}
                  testID="onboarding-username-input"
                  autoFocus
                />
              ) : null}

              <View style={styles.displaySection}>
                <Text style={styles.question}>What should we call you?</Text>
                <Text style={styles.questionSubtitle}>Shown on Home — not your public handle.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your first name"
                  placeholderTextColor={Colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  returnKeyType="done"
                  autoCapitalize="words"
                  testID="onboarding-name-input"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              onPressIn={() => {
                if (!canContinue) return;
                Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
              }}
              onPressOut={() => {
                Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
              }}
              testID="onboarding-continue-button"
            >
              <Animated.View
                style={[
                  styles.button,
                  { transform: [{ scale: buttonScale }] },
                  !canContinue && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Enter Selene'}</Text>
                <ArrowRight size={18} color={Colors.background} />
              </Animated.View>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  moonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  moonGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(201, 169, 110, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  section: {
    gap: 32,
    marginTop: 24,
  },
  displaySection: {
    gap: 8,
  },
  question: {
    fontSize: 22,
    fontWeight: '400' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  questionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.background,
    letterSpacing: 0.5,
  },
});
