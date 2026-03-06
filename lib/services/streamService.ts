const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export async function getStreamToken(userId: string): Promise<string> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or publishable key not configured');
  }

  const url = `${supabaseUrl}/functions/v1/stream-token`;
  console.log('[StreamService] Fetching stream token from:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[StreamService] Token fetch failed:', response.status, errorText);
    throw new Error(`Failed to get stream token: ${response.status}`);
  }

  const data = await response.json();
  console.log('[StreamService] Token received successfully');
  return (data as any).token;
}
