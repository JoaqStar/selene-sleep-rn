import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, Redirect } from 'expo-router';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, Platform, ActivityIndicator, ScrollView, Keyboard } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, Mail, ArrowRight, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { GoogleLogo } from '@/components/OAuthProviderIcons';
import {
  syncAppleProfileFromCredential,
  syncOAuthProfileFromUser,
} from '@/lib/services/appleProfileService';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

WebBrowser.maybeCompleteAuthSession();

// Turn a Supabase OAuth redirect (implicit tokens or PKCE code) into a session.
async function completeSessionFromRedirectUrl(url: string): Promise<boolean> {
  if (!supabase) return false;
  const parsed = new URL(url);
  const hashParams = new URLSearchParams(
    parsed.hash?.startsWith('#') ? parsed.hash.slice(1) : parsed.hash ?? '',
  );
  const accessToken = hashParams.get('access_token') ?? parsed.searchParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? parsed.searchParams.get('refresh_token');
  const code = parsed.searchParams.get('code') ?? hashParams.get('code');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }
  return false;
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [hasFocusedEmail, setHasFocusedEmail] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const hasUsername = useOnboardingStore((state) => state.hasUsername);

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

  // iOS: fully native Sign in with Apple — no webview. Apple returns an identity
  // token that we exchange for a Supabase session via signInWithIdToken.
  const handleNativeAppleSignIn = useCallback(async () => {
    if (!supabase) {
      setError('Sign-in is not configured. Missing Supabase credentials.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const rawNonce = [...Crypto.getRandomBytes(16)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      // Hex-encoded SHA-256 matches Supabase GoTrue's nonce comparison.
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        setError('Apple did not return an identity token. Please try again.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (signInError) {
        console.error('[Apple] signInWithIdToken error:', signInError);
        setError(signInError.message);
        return;
      }

      await syncAppleProfileFromCredential(credential);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      console.error('[Apple] Native sign-in error:', e);
      setError(e?.message ?? 'Something went wrong. Please try again.');
    }
  }, []);

  // Google (all platforms) and Apple-on-Android: open the provider in an in-app
  // Safari View Controller / Custom Tab rather than kicking out to the browser.
  const handleWebOAuthSignIn = useCallback(
    async (provider: 'google' | 'apple') => {
      if (!supabase) {
        setError('Sign-in is not configured. Missing Supabase credentials.');
        return;
      }

      try {
        const redirectTo =
          process.env.EXPO_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL ??
          'selenesleepapp://';

        console.log('[OAuth] Starting sign-in with provider:', provider, 'redirectTo:', redirectTo);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          console.error('[OAuth] Error:', error);
          setError(error.message);
          return;
        }

        if (!data?.url) {
          console.warn('[OAuth] No URL returned from signInWithOAuth');
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const ok = await completeSessionFromRedirectUrl(result.url);
          if (!ok) {
            setError('Could not complete sign-in. Please try again.');
          } else {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (!authError && authData.user) {
              await syncOAuthProfileFromUser(authData.user);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      } catch (e: any) {
        console.error('[OAuth] Unexpected error:', e);
        setError(e.message ?? 'Something went wrong. Please try again.');
      }
    },
    [],
  );

  const handleSendLink = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!supabase) {
      setError('Sign-in is not configured. Missing Supabase credentials.');
      return;
    }

    try {
      const redirectUrl = 'https://selene-sleep-app.s3.us-east-1.amazonaws.com/selene-confirmed.html';
      console.log('[SignIn] Redirect URL:', redirectUrl);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectUrl },
      });
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
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SignIn] Auth event:', event, 'session:', session ? 'found' : 'none');
      if (session) {
        setIsPolling(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
    return () => subscription.unsubscribe();
  }, [isPolling, router]);

  const handleVerifyToken = useCallback(async () => {
    const input = verifyToken.trim();
    if (!input) return;

    setIsVerifying(true);
    setError('');

    if (!supabase) {
      setError('Sign-in is not configured. Missing Supabase credentials.');
      return;
    }

    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (/^\d{6,8}$/.test(input)) {
        console.log('[SignIn] Verifying OTP code...');
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

  const showMagicLinkFlow = hasFocusedEmail || email.trim().length > 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (session && !hasUsername) {
    return <Redirect href="/complete-profile" />;
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          showMagicLinkFlow ? styles.scrollContentCompact : styles.scrollContentExpanded,
          {
            paddingTop: insets.top + 60,
            paddingBottom:
              keyboardHeight > 0
                ? Platform.OS === 'android'
                  ? keyboardHeight + 32
                  : 32
                : Math.max(insets.bottom, 16) + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.moonContainer, { transform: [{ translateY: moonTranslateY }] }]}>
          <View style={styles.moonGlow}>
            <Moon size={48} color={Colors.accent} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            !showMagicLinkFlow && styles.contentCentered,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
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
                    if (text.trim()) {
                      setHasFocusedEmail(true);
                    }
                  }}
                  onFocus={() => {
                    setHasFocusedEmail(true);
                  }}
                  onBlur={() => {
                    if (!email.trim()) {
                      setHasFocusedEmail(false);
                    }
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

              {showMagicLinkFlow ? (
                <View style={styles.magicLinkContainer}>
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
                </View>
              ) : (
                <View style={styles.oauthContainer}>
                  <Text style={styles.oauthLabel}>Or continue with</Text>
                  <View style={styles.oauthButtonsRow}>
                    <Pressable
                      onPress={() => handleWebOAuthSignIn('google')}
                      style={({ pressed }) => [
                        styles.oauthButton,
                        styles.oauthGoogleButton,
                        pressed && styles.oauthButtonPressed,
                      ]}
                      testID="sign-in-google-button"
                    >
                      <View style={styles.oauthButtonContent}>
                        <GoogleLogo size={18} />
                        <Text style={styles.oauthButtonText}>Continue with Google</Text>
                      </View>
                    </Pressable>
                    {Platform.OS === 'ios' ? (
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                        cornerRadius={14}
                        style={styles.appleNativeButton}
                        onPress={handleNativeAppleSignIn}
                        testID="sign-in-apple-button"
                      />
                    ) : (
                      <Pressable
                        onPress={() => handleWebOAuthSignIn('apple')}
                        style={({ pressed }) => [
                          styles.oauthButton,
                          styles.oauthAppleButton,
                          pressed && styles.oauthButtonPressed,
                        ]}
                        testID="sign-in-apple-button"
                      >
                        <View style={styles.oauthButtonContent}>
                          <Text style={styles.oauthButtonText}>Continue with Apple</Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
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
                {'\n\n'}Tap the Log In link in the email, or enter the code below.
              </Text>

              <View style={styles.pasteContainer}>
                <Text style={styles.pasteLabel}>
                  Enter the code from your email:
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="00000000"
                    placeholderTextColor={Colors.textMuted}
                    value={verifyToken}
                    onChangeText={(text) => setVerifyToken(text.replace(/[^0-9]/g, '').slice(0, 8))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={8}
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
  scrollContent: {
    paddingHorizontal: 32,
  },
  scrollContentExpanded: {
    flexGrow: 1,
  },
  scrollContentCompact: {
    flexGrow: 0,
  },
  magicLinkContainer: {
    marginTop: 24,
    alignItems: 'stretch',
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
    width: '100%',
  },
  contentCentered: {
    flexGrow: 1,
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
  oauthContainer: {
    marginTop: 24,
  },
  oauthLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  oauthButtonsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  oauthButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  oauthButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appleNativeButton: {
    height: 50,
    width: '100%',
  },
  oauthGoogleButton: {
    backgroundColor: Colors.surface,
  },
  oauthAppleButton: {
    backgroundColor: Colors.cardBackground,
  },
  oauthButtonText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  oauthButtonPressed: {
    opacity: 0.85,
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
    width: '100%',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.background,
    letterSpacing: 0.5,
  },
});
