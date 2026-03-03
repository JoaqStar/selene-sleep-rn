import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

console.log(
  '[Supabase] Init — URL:',
  supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
  'KEY:',
  supabasePublishableKey ? supabasePublishableKey.substring(0, 10) + '...' : 'MISSING',
);

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    '[Supabase] ENV VARS MISSING — EXPO_PUBLIC_SUPABASE_URL:',
    supabaseUrl ? 'SET' : 'MISSING',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:',
    supabasePublishableKey ? 'SET' : 'MISSING',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
