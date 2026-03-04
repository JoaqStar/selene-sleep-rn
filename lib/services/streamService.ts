const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export async function getStreamToken(accessToken: string): Promise<string> {
  const url = `${supabaseUrl}/functions/v1/stream-token`;
  console.log('[StreamService] Fetching stream token from:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[StreamService] Token fetch failed:', response.status, errorText);
    throw new Error(`Failed to get stream token: ${response.status}`);
  }

  const data = await response.json();
  console.log('[StreamService] Token received successfully');
  return data.token;
}
