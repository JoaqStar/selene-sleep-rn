export const COMMUNITY_TAGS = [
  'Sleep',
  'Symptoms',
  'Treatments',
  'Recommendations',
  'General',
] as const;

export const COMMUNITY_FILTER_TAGS = ['All', ...COMMUNITY_TAGS] as const;

export const COMMUNITY_AUTO_TAG_OPTION = 'Auto' as const;

export type CommunityTag = (typeof COMMUNITY_TAGS)[number];
export type CommunityTagFilter = (typeof COMMUNITY_FILTER_TAGS)[number];
export type ComposerTagSelection = CommunityTag | typeof COMMUNITY_AUTO_TAG_OPTION;

const TAG_LOOKUP: Record<string, CommunityTag> = {
  sleep: 'Sleep',
  symptoms: 'Symptoms',
  treatments: 'Treatments',
  recommendations: 'Recommendations',
  general: 'General',
};

export function isCommunityTag(value: unknown): value is CommunityTag {
  return typeof value === 'string' && COMMUNITY_TAGS.includes(value as CommunityTag);
}

export function normalizeCommunityTag(value: string): CommunityTag | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return TAG_LOOKUP[trimmed.toLowerCase()] ?? null;
}

export function filterCommunityTags(query: string): CommunityTag[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [...COMMUNITY_TAGS];
  return COMMUNITY_TAGS.filter((tag) => tag.toLowerCase().includes(normalizedQuery));
}
