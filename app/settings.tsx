import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TextInput, Pressable, Linking, Platform, AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';

type NotificationPreferences = {
  likes_enabled: boolean;
  comments_enabled: boolean;
  new_content_enabled: boolean;
};

const defaultPrefs: NotificationPreferences = {
  likes_enabled: true,
  comments_enabled: true,
  new_content_enabled: true,
};

export default function SettingsScreen() {
  const { session, signOut } = useAuthStore();
  const { userName, completeOnboarding } = useOnboardingStore();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(userName);
  const [originalName, setOriginalName] = useState(userName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState<boolean | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSaveName = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === (originalName || '').trim()) return;
    try {
      setIsSavingName(true);
      await completeOnboarding(trimmed);
      setOriginalName(trimmed);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } finally {
      setIsSavingName(false);
    }
  }, [name, originalName, completeOnboarding]);

  const handleCancelName = useCallback(() => {
    setName(originalName || '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [originalName]);

  const handleSignOut = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
    router.replace('/sign-in');
  }, [signOut, router]);

  const handleOpenSystemSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openSettings().catch((error) => {
      console.error('[Settings] Failed to open system settings', error);
    });
  }, []);

  const loadPreferences = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase || !session?.user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('likes_enabled, comments_enabled, new_content_enabled')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Settings] notification_preferences table missing (expected during setup)');
          return;
        }
        console.error('[Settings] Failed to load notification preferences', error);
      } else if (data) {
        setPrefs({
          likes_enabled: data.likes_enabled ?? true,
          comments_enabled: data.comments_enabled ?? true,
          new_content_enabled: data.new_content_enabled ?? true,
        });
      }
    } catch (err) {
      console.error('[Settings] Unexpected error loading notification preferences', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    // Keep local name state in sync if store value changes (e.g. from onboarding)
    setName(userName);
    setOriginalName(userName);
  }, [userName]);

  const refreshSystemNotificationPermissions = useCallback(async () => {
    console.log('[DebugPushSettingsPermission] Refreshing system notification permissions');
    try {
      const settings = await Notifications.getPermissionsAsync();
      console.log('[DebugPushSettingsPermission] Permissions response:', settings);
      const granted =
        settings.granted ||
        settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      setSystemNotificationsEnabled(granted);
      console.log('[DebugPushSettingsPermission] Computed granted =', granted);
    } catch (error) {
      console.error('[Settings] Failed to read system notification permissions', error);
      setSystemNotificationsEnabled(null);
    }
  }, []);

  useEffect(() => {
    // Initial read of OS-level notification permission for the banner and switch enabled state.
    console.log('[DebugPushSettingsPermission] Running initial permission check');
    refreshSystemNotificationPermissions();
  }, [refreshSystemNotificationPermissions]);

  useFocusEffect(
    useCallback(() => {
      // When returning to this screen (e.g. from system Settings), refresh permission state
      // so the banner and disabled switches update immediately.
      console.log('[DebugPushSettingsPermission] Screen focused, refreshing permissions');
      refreshSystemNotificationPermissions();
    }, [refreshSystemNotificationPermissions]),
  );

  useEffect(() => {
    // Also listen for app foreground transitions, since coming back from the OS Settings app
    // may not always trigger a navigation focus event (especially on Android).
    const handleAppStateChange = (nextState: AppStateStatus) => {
      console.log('[DebugPushSettingsPermission] AppState changed to', nextState);
      if (nextState === 'active') {
        console.log('[DebugPushSettingsPermission] App became active, refreshing permissions');
        refreshSystemNotificationPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [refreshSystemNotificationPermissions]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));

    if (!hasSupabaseConfig || !supabase || !session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: session.user.id,
            likes_enabled: key === 'likes_enabled' ? value : prefs.likes_enabled,
            comments_enabled: key === 'comments_enabled' ? value : prefs.comments_enabled,
            new_content_enabled:
              key === 'new_content_enabled' ? value : prefs.new_content_enabled,
          },
          {
            onConflict: 'user_id',
          },
        );

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Settings] notification_preferences table missing (expected during setup)');
          return;
        }
        console.error('[Settings] Failed to update notification preferences', error);
      }
    } catch (err) {
      console.error('[Settings] Unexpected error updating notification preferences', err);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
      style={styles.container}
    >
      <View style={styles.inner}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              testID="settings-back-button"
            >
              <ChevronLeft size={20} color={Colors.text} />
            </Pressable>
            <Text style={styles.heading}>Settings</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.section}>
            <Text style={styles.subheading}>Your name</Text>
            <Text style={styles.subtitle}>
              This is how Selene will greet you on the Home screen.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />
            <View style={styles.nameActionsRow}>
              <Pressable
                onPress={handleCancelName}
                disabled={name.trim() === (originalName || '').trim()}
                style={({ pressed }) => [
                  styles.nameSecondaryButton,
                  (pressed && name.trim() !== (originalName || '').trim()) &&
                    styles.nameSecondaryButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.nameSecondaryText,
                    name.trim() === (originalName || '').trim() && styles.nameDisabledText,
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveName}
                disabled={
                  isSavingName ||
                  !name.trim() ||
                  name.trim() === (originalName || '').trim()
                }
                style={({ pressed }) => [
                  styles.namePrimaryButton,
                  (pressed &&
                    !isSavingName &&
                    name.trim() &&
                    name.trim() !== (originalName || '').trim()) &&
                    styles.namePrimaryButtonPressed,
                ]}
              >
                <Text style={styles.namePrimaryText}>
                  {isSavingName ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.subheading}>Notifications</Text>
          <Text style={styles.subtitle}>
            Control when Selene can send you push notifications.
          </Text>

          {!hasSupabaseConfig && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                Notifications are not fully configured yet. Supabase credentials are missing.
              </Text>
            </View>
          )}

          {systemNotificationsEnabled === false && (
            <View style={styles.bannerWarning}>
              <Text style={styles.bannerWarningText}>
                Push notifications are turned off in your device settings. Turn them on in the
                Settings app for Selene for these toggles to take effect.
              </Text>
              <Pressable
                onPress={handleOpenSystemSettings}
                style={({ pressed }) => [
                  styles.bannerButton,
                  pressed && styles.bannerButtonPressed,
                ]}
              >
                <Text style={styles.bannerButtonText}>
                  {Platform.OS === 'ios' ? 'Open iOS Settings' : 'Open Android Settings'}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.labelColumn}>
                <Text style={styles.label}>Likes on my posts</Text>
                <Text style={styles.labelSub}>
                  Get notified when someone likes something you shared in the community.
                </Text>
              </View>
              <Switch
                value={prefs.likes_enabled}
                onValueChange={(value) => updatePreference('likes_enabled', value)}
                trackColor={{ true: Colors.accentDim, false: Colors.borderLight }}
                thumbColor={prefs.likes_enabled ? Colors.accent : Colors.surface}
                ios_backgroundColor={Colors.borderLight}
                disabled={isLoading || systemNotificationsEnabled === false}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.labelColumn}>
                <Text style={styles.label}>Comments and replies</Text>
                <Text style={styles.labelSub}>
                  Be alerted when someone comments on or replies to your posts.
                </Text>
              </View>
              <Switch
                value={prefs.comments_enabled}
                onValueChange={(value) => updatePreference('comments_enabled', value)}
                trackColor={{ true: Colors.accentDim, false: Colors.borderLight }}
                thumbColor={prefs.comments_enabled ? Colors.accent : Colors.surface}
                ios_backgroundColor={Colors.borderLight}
                disabled={isLoading || systemNotificationsEnabled === false}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.labelColumn}>
                <Text style={styles.label}>New sessions & articles</Text>
                <Text style={styles.labelSub}>
                  Hear about new sleep sessions, stories, and learn content as it arrives.
                </Text>
              </View>
              <Switch
                value={prefs.new_content_enabled}
                onValueChange={(value) => updatePreference('new_content_enabled', value)}
                trackColor={{ true: Colors.accentDim, false: Colors.borderLight }}
                thumbColor={prefs.new_content_enabled ? Colors.accent : Colors.surface}
                ios_backgroundColor={Colors.borderLight}
                disabled={isLoading || systemNotificationsEnabled === false}
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.logoutContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  banner: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bannerText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bannerWarning: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#402020',
    borderWidth: 1,
    borderColor: '#FFB3B3',
    gap: 8,
  },
  bannerWarningText: {
    fontSize: 13,
    color: '#FFE5E5',
  },
  bannerButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFE5E5',
  },
  bannerButtonPressed: {
    opacity: 0.85,
  },
  bannerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C1A1A',
  },
  section: {
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    padding: 16,
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  labelColumn: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  labelSub: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  nameActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  nameSecondaryButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  nameSecondaryButtonPressed: {
    opacity: 0.7,
  },
  nameSecondaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nameDisabledText: {
    opacity: 0.4,
  },
  namePrimaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.accent,
  },
  namePrimaryButtonPressed: {
    opacity: 0.85,
  },
  namePrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#05030F',
  },
  logoutContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  logoutButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

