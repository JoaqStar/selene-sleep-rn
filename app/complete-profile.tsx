import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { UsernameField } from '@/components/UsernameField';
import { useUsernameAvailability } from '@/lib/hooks/useUsernameAvailability';

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const { userName, completeOnboarding, usernameDbReady } = useOnboardingStore();

  const rawMetadata = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const remoteName =
    (typeof rawMetadata.full_name === 'string' && rawMetadata.full_name) ||
    (typeof rawMetadata.name === 'string' && rawMetadata.name) ||
    '';

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(userName || remoteName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { status, message, canSubmit } = useUsernameAvailability(username, {
    excludeCurrentUser: true,
  });
  const needsDisplayName = !userName.trim() && !remoteName.trim();

  const canContinue = usernameDbReady && canSubmit && !isSubmitting;

  const handleContinue = useCallback(async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    const finalDisplay =
      displayName.trim() || remoteName.trim() || userName.trim() || 'Friend';
    const result = await completeOnboarding(finalDisplay, username);
    setIsSubmitting(false);

    if (!result.ok) {
      Alert.alert('Username unavailable', result.error);
      return;
    }

    router.replace('/(tabs)/(home)');
  }, [canSubmit, displayName, remoteName, userName, username, completeOnboarding, router]);

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>
            Pick a public username for Community. It must be unique across Selene.
          </Text>

          {!usernameDbReady ? (
            <View style={styles.migrationBanner}>
              <Text style={styles.migrationTitle}>Supabase setup required</Text>
              <Text style={styles.migrationText}>
                Run the username migration in your Supabase project (SQL Editor → paste and run
                the file supabase/migrations/20250529120000_unique_username.sql), then reload the
                app.
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <UsernameField
              value={username}
              onChangeText={setUsername}
              status={status}
              message={message}
              testID="complete-profile-username-input"
              autoFocus
            />

            {needsDisplayName ? (
              <View style={styles.displaySection}>
                <Text style={styles.displayLabel}>Your name (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First name for Home"
                  placeholderTextColor={Colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            testID="complete-profile-continue"
          >
            <Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Continue'}</Text>
            <ArrowRight size={18} color={Colors.background} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    gap: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 28,
    marginTop: 8,
  },
  displaySection: {
    gap: 8,
  },
  displayLabel: {
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  button: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
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
    fontWeight: '600',
    color: Colors.background,
  },
  migrationBanner: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(201, 169, 110, 0.12)',
    borderWidth: 1,
    borderColor: Colors.accentDim,
    gap: 6,
  },
  migrationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
    textAlign: 'center',
  },
  migrationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
