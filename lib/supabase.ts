import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase env vars missing — EXPO_PUBLIC_SUPABASE_URL:',
    supabaseUrl ? 'SET' : 'MISSING',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:',
    supabasePublishableKey ? 'SET' : 'MISSING',
  );
}

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);
