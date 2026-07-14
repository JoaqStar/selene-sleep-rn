export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; url: string };

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]\s]/gi;

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/[.,;:!?)]+$/, '');
  if (!trimmed) return null;

  const withProtocol = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseTextLinks(text: string): TextSegment[] {
  if (!text) return [{ type: 'text', value: '' }];

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }

    const url = normalizeUrl(raw);
    if (url) {
      segments.push({ type: 'link', value: raw, url });
    } else {
      segments.push({ type: 'text', value: raw });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}
