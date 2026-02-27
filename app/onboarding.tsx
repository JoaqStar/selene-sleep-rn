import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboardingStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const moonAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(moonAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(moonAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const animateToNextStep = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setStep(1);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    });
    slideAnim.setValue(20);
  }, [fadeAnim, slideAnim]);

  const handleContinue = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 0) {
      animateToNextStep();
    } else {
      const trimmedName = name.trim() || 'Friend';
      await completeOnboarding(trimmedName);
      router.replace('/(tabs)/(home)');
    }
  }, [step, name, animateToNextStep, completeOnboarding, router]);

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
        style={[styles.inner, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.moonContainer, { transform: [{ translateY: moonTranslateY }] }]}>
          <View style={styles.moonGlow}>
            <Moon size={48} color={Colors.accent} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {step === 0 ? (
            <>
              <Text style={styles.brand}>Selene</Text>
              <Text style={styles.tagline}>Sleep support{'\n'}for the nights that changed</Text>
              <Text style={styles.subtitle}>
                Guided meditations, breathing exercises, and body scans designed specifically for perimenopause sleep.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.question}>What should we call you?</Text>
              <Text style={styles.questionSubtitle}>Just your first name is perfect.</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                testID="onboarding-name-input"
              />
            </>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Pressable
            onPress={handleContinue}
            onPressIn={() => {
              Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
            }}
            onPressOut={() => {
              Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
            }}
            testID="onboarding-continue-button"
          >
            <Animated.View style={[styles.button, { transform: [{ scale: buttonScale }] }]}>
              <Text style={styles.buttonText}>{step === 0 ? 'Begin' : 'Enter Selene'}</Text>
              <ArrowRight size={18} color={Colors.background} />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
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
  brand: {
    fontSize: 52,
    fontWeight: '300' as const,
    color: Colors.text,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '400' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  question: {
    fontSize: 28,
    fontWeight: '400' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  questionSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
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
  buttonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.background,
    letterSpacing: 0.5,
  },
});
