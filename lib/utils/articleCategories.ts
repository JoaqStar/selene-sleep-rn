export const ARTICLE_CATEGORIES = [
  { slug: 'understanding-your-body', label: 'Understanding your body' },
  { slug: 'sleep-science', label: 'Sleep science' },
  { slug: 'symptom-support', label: 'Symptom support' },
  { slug: 'womens-health-news', label: "Women's health news" },
] as const;

export const ARTICLE_CATEGORY_FILTERS = [
  { label: 'All', value: null },
  ...ARTICLE_CATEGORIES.map((category) => ({
    label: category.label,
    value: category.slug,
  })),
] as const;

const LABEL_BY_SLUG = new Map(
  ARTICLE_CATEGORIES.map((category) => [category.slug, category.label]),
);

/** Display label for a stored category slug (or legacy plain-text value). */
export function getArticleCategoryLabel(category: string | null | undefined): string {
  const trimmed = category?.trim() ?? '';
  if (!trimmed) return '';

  const known = LABEL_BY_SLUG.get(trimmed);
  if (known) return known;

  // Legacy plain-text categories or unknown slugs
  if (!trimmed.includes('-')) {
    return trimmed;
  }

  return trimmed
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
