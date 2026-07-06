import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import {
  getDefaultUsernameSuggestion,
  getNameFromUserMetadata,
  isOAuthSocialUser,
} from '@/lib/services/appleProfileService';

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const { completeOnboarding, usernameDbReady } = useOnboardingStore();

  const isSocialUser = session?.user ? isOAuthSocialUser(session.user) : false;
  const displayName = session?.user ? getNameFromUserMetadata(session.user) : '';
  const accountEmail = session?.user?.email ?? '';

  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { status, message, canSubmit } = useUsernameAvailability(username, {
    excludeCurrentUser: true,
    excludeUserId: session?.user?.id ?? null,
  });

  useEffect(() => {
    if (!session?.user || username.trim()) return;
    const suggestion = getDefaultUsernameSuggestion(session.user);
    if (suggestion) {
      setUsername(suggestion);
    }
  }, [session?.user, username]);

  const canContinue = usernameDbReady && canSubmit && !isSubmitting;

  const handleContinue = useCallback(async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    const result = await completeOnboarding(username);
    setIsSubmitting(false);

    if (!result.ok) {
      Alert.alert('Username unavailable', result.error);
      return;
    }

    router.replace('/(tabs)/(home)');
  }, [canSubmit, username, completeOnboarding, router]);

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
          <Text style={styles.title}>Choose your username</Text>
          <Text style={styles.subtitle}>
            {isSocialUser
              ? 'This is how you appear in Community and on your Home greeting. You can change the suggestion below.'
              : 'This is how you appear in Community and on your Home greeting. It must be unique.'}
          </Text>

          {isSocialUser && (displayName || accountEmail) ? (
            <View style={styles.accountCard}>
              {displayName ? (
                <Text style={styles.accountName}>{displayName}</Text>
              ) : null}
              {accountEmail ? (
                <Text style={styles.accountEmail}>{accountEmail}</Text>
              ) : null}
            </View>
          ) : null}

          {!usernameDbReady ? (
            <View style={styles.migrationBanner}>
              <Text style={styles.migrationTitle}>Supabase setup required</Text>
              <Text style={styles.migrationText}>
                Run the username migrations in Supabase SQL editor, then reload the app.
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
  accountCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  accountEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginTop: 8,
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
