import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, Mail, ArrowRight, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const moonAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const sentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const handleSendLink = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const redirectUrl = __DEV__ ? undefined : 'selenesleepapp://';
      console.log('[SignIn] Redirect URL:', redirectUrl);
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: trimmed, options: { emailRedirectTo: redirectUrl } });
      if (otpError) {
        console.error('[SignIn] OTP error:', otpError);
        setError(otpError.message);
      } else {
        console.log('[SignIn] Magic link sent to:', trimmed);
        setIsSent(true);
        setIsPolling(true);
        Animated.timing(sentFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error('[SignIn] Unexpected error:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [email, sentFade, router]);

  useEffect(() => {
    if (!isPolling) return;
    console.log('[SignIn] Listening for auth state changes...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SignIn] Auth event:', event, 'session:', session ? 'found' : 'none');
      if (session) {
        setIsPolling(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    });
    return () => subscription.unsubscribe();
  }, [isPolling, router]);

  const handleVerifyToken = useCallback(async () => {
    const input = verifyToken.trim();
    if (!input) return;

    setIsVerifying(true);
    setError('');

    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (/^\d{6}$/.test(input)) {
        console.log('[SignIn] Verifying 6-digit OTP code...');
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: input,
          type: 'email',
        });

        if (verifyError) {
          console.error('[SignIn] OTP verify error:', verifyError);
          setError(verifyError.message);
        } else if (data.session) {
          console.log('[SignIn] OTP verified! Session established.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)');
        } else {
          setError('Verification succeeded but no session was returned.');
        }
      } else {
        let tokenHash = input;
        if (input.includes('token=')) {
          const url = new URL(input);
          tokenHash = url.searchParams.get('token') ?? input;
        }

        console.log('[SignIn] Verifying token_hash...');
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });

        if (verifyError) {
          console.error('[SignIn] Verify error:', verifyError);
          setError(verifyError.message);
        } else if (data.session) {
          console.log('[SignIn] Verified! Session established.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)');
        } else {
          setError('Verification succeeded but no session was returned.');
        }
      }
    } catch (e: any) {
      console.error('[SignIn] Verify error:', e);
      setError(e.message ?? 'Failed to verify. Check the link and try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [verifyToken, router]);

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
        style={[styles.inner, { paddingTop: insets.top + 60 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.moonContainer, { transform: [{ translateY: moonTranslateY }] }]}>
          <View style={styles.moonGlow}>
            <Moon size={48} color={Colors.accent} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {!isSent ? (
            <>
              <Text style={styles.title}>Welcome to Selene</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a magic link to sign in — no password needed.
              </Text>

              <View style={styles.inputWrapper}>
                <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={handleSendLink}
                  editable={!isSending}
                  testID="sign-in-email-input"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </>
          ) : (
            <Animated.View style={{ opacity: sentFade }}>
              <View style={styles.sentIconContainer}>
                <CheckCircle size={48} color={Colors.success} />
              </View>
              <Text style={styles.title}>Check your inbox</Text>
              <Text style={styles.subtitle}>
                We sent a sign-in email to{'\n'}
                <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
                {'\n\n'}Tap the Log In link in the email, or enter the 6-digit code below.
              </Text>

              <View style={styles.pasteContainer}>
                <Text style={styles.pasteLabel}>
                  Enter the 6-digit code from your email:
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="000000"
                    placeholderTextColor={Colors.textMuted}
                    value={verifyToken}
                    onChangeText={(text) => setVerifyToken(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isVerifying}
                    testID="sign-in-token-input"
                  />
                </View>
                <Pressable
                  onPress={handleVerifyToken}
                  disabled={isVerifying || !verifyToken.trim()}
                  style={[styles.verifyButton, (!verifyToken.trim() || isVerifying) && { opacity: 0.5 }]}
                  testID="sign-in-verify-button"
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  )}
                </Pressable>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                onPress={() => {
                  setIsSent(false);
                  setIsPolling(false);
                  setEmail('');
                  setError('');
                }}
                testID="sign-in-try-again-button"
              >
                <Text style={styles.tryAgainText}>Use a different email</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        {!isSent && (
          <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 32, opacity: fadeAnim }]}>
            <Pressable
              onPress={handleSendLink}
              disabled={isSending}
              onPressIn={() => {
                Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
              }}
              onPressOut={() => {
                Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
              }}
              testID="sign-in-submit-button"
            >
              <Animated.View style={[styles.button, { transform: [{ scale: buttonScale }], opacity: isSending ? 0.7 : 1 }]}>
                {isSending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Send magic link</Text>
                    <ArrowRight size={18} color={Colors.background} />
                  </>
                )}
              </Animated.View>
            </Pressable>
          </Animated.View>
        )}
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
  footer: {
    alignItems: 'center',
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
  title: {
    fontSize: 28,
    fontWeight: '400' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    marginBottom: 36,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 17,
    color: Colors.text,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  sentIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emailHighlight: {
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  pollingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    marginBottom: 16,
  },
  pollingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  pasteContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  pasteLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 12,
  },
  verifyButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  codeInput: {
    textAlign: 'center' as const,
    fontSize: 24,
    letterSpacing: 12,
    fontWeight: '600' as const,
  },
  tryAgainText: {
    color: Colors.accent,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500' as const,
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
