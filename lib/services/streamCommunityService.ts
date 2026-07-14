const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export async function joinCommunityChannel(accessToken: string): Promise<void> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or publishable key not configured');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/stream-join-community`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[StreamCommunity] join failed:', response.status, errorText);
    throw new Error(`Failed to join community channel: ${response.status}`);
  }
}
