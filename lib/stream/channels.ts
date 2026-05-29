export const COMMUNITY_CHANNEL = {
  id: 'community',
  name: 'Community',
  description: 'A shared feed for support, questions, and recommendations.',
};

// Legacy channels are kept as constants for migration tooling or fallback reads.
export const LEGACY_COMMUNITY_CHANNELS = [
  { id: 'sleep', name: 'Sleep', description: 'Sleep issues, waking at night, 3am moments' },
  { id: 'symptoms', name: 'Symptoms', description: 'Hot flashes, mood, brain fog and everything else' },
  { id: 'treatments', name: 'Treatments', description: 'HRT, supplements, lifestyle approaches' },
  { id: 'recommendations', name: 'Recommendations', description: 'Podcasts, books, products, resources' },
];
