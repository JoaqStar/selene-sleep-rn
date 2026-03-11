import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
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
  const { session } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs);
  const [isLoading, setIsLoading] = useState(false);

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
        // In early setup, the table may not exist yet.
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Notifications</Text>
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
              thumbColor={prefs.likes_enabled ? Colors.accent : Colors.surface}
              trackColor={{ true: Colors.accentDim, false: Colors.borderLight }}
              disabled={isLoading}
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
              thumbColor={prefs.comments_enabled ? Colors.accent : Colors.surface}
              trackColor={{ true: Colors.accentDim, false: Colors.borderLight }}
              disabled={isLoading}
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
              thumbColor={prefs.new_content_enabled ? Colors.accent : Colors.surface}
              trackColor={{ true: Colors.accentDim, false: Colors.borderLight }}
              disabled={isLoading}
            />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
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
  section: {
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    padding: 16,
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.border,
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
});

