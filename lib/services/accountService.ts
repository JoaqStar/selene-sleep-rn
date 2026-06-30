import { supabase } from '@/lib/supabase';

export async function requestAccountDeletion(reason?: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    throw new Error('No active session');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/request-deletion`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.user.email, reason }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to submit deletion request');
  }

  return response.json();
}
