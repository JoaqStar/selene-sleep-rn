import { ArticleSource } from '@/types';

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeSource(raw: unknown): ArticleSource | null {
  if (!raw || typeof raw !== 'object') return null;

  const entry = raw as Record<string, unknown>;
  const url = typeof entry.url === 'string' ? entry.url.trim() : '';
  if (!url || !isValidUrl(url)) return null;

  return {
    title: typeof entry.title === 'string' ? entry.title.trim() : '',
    publication: typeof entry.publication === 'string' ? entry.publication.trim() : '',
    date: typeof entry.date === 'string' ? entry.date.trim() : '',
    url,
  };
}

export function parseArticleSources(sources: unknown): ArticleSource[] {
  if (sources == null) return [];

  if (typeof sources === 'string') {
    const trimmed = sources.trim();
    if (!trimmed) return [];
    try {
      return parseArticleSources(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (Array.isArray(sources)) {
    return sources
      .map(normalizeSource)
      .filter((source): source is ArticleSource => source !== null);
  }

  return [];
}

export function formatSourceMeta(source: ArticleSource): string | null {
  const parts = [source.publication, source.date].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}
