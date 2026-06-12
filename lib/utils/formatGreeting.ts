export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getContextualEyebrow(): string {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase();
  return `${day} · ${time}`;
}
