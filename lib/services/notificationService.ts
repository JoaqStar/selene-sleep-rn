import { supabase, hasSupabaseConfig } from '@/lib/supabase';

export type PlatformType = 'ios' | 'android' | 'web' | 'unknown';

export async function registerPushTokenForUser(params: {
  userId: string;
  expoPushToken: string;
  platform: PlatformType;
}) {
  if (!hasSupabaseConfig || !supabase) {
    console.log('[Notifications] Supabase not configured, skipping token registration');
    return;
  }

  const { userId, expoPushToken, platform } = params;

  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          platform,
        },
        {
          onConflict: 'user_id,expo_push_token',
        },
      );

    if (error) {
      console.error('[Notifications] Failed to upsert push token', error);
    } else {
      console.log('[Notifications] Registered push token for user', userId);
    }
  } catch (error) {
    console.error('[Notifications] Unexpected error registering push token', error);
  }
}

