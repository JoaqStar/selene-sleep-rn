import { COMMUNITY_TAGS, CommunityTag, normalizeCommunityTag } from '@/lib/community/tags';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODELS = [
  // Allow testing newest candidates first.
  'claude-haiku-4-5-20251001',
  // Newer explicit snapshot
  'claude-3-5-haiku-20241022',
  // Some accounts expose the "latest" alias
  'claude-3-5-haiku-latest',
  // Broad compatibility fallback
  'claude-3-haiku-20240307',
] as const;

type AnthropicContentChunk = {
  type: string;
  text?: string;
};

type AnthropicMessagesResponse = {
  content?: AnthropicContentChunk[];
};

type AnthropicModel = {
  id?: string;
};

type AnthropicModelsResponse = {
  data?: AnthropicModel[];
};

type CommunityTaggingOptions = {
  availableTags: string[];
  popularTagCounts?: Record<string, number>;
  maxTags?: number;
};

export async function classifyCommunityPostTags(
  postText: string,
  options: CommunityTaggingOptions,
): Promise<string[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_ANTHROPIC_API_KEY');
  }

  const cleanedAvailableTags = dedupeCaseInsensitive(options.availableTags);
  if (cleanedAvailableTags.length === 0) {
    throw new Error('No available tags supplied for classification');
  }
  const maxTags = Math.max(1, Math.min(options.maxTags ?? 3, 5));

  const overrideModel = (process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? '').trim();
  const discoveredModels = await listHaikuModels(apiKey);
  const modelsToTry = dedupeModels([
    ...(overrideModel ? [overrideModel] : []),
    ...ANTHROPIC_MODELS,
    ...discoveredModels,
  ]);

  if (modelsToTry.length === 0) {
    throw new Error('No Anthropic models available to try for tagging');
  }

  let response: Response | null = null;
  let lastErrorBody = '';
  let lastModel = '';
  const triedModels: string[] = [];
  const prompt = buildTaggingPrompt(postText, cleanedAvailableTags, options.popularTagCounts, maxTags);

  for (const model of modelsToTry) {
    lastModel = model;
    triedModels.push(model);
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 64,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (response.ok) {
      break;
    }

    lastErrorBody = await response.text();
    const isModelNotFound = response.status === 404 && lastErrorBody.includes('not_found_error');
    if (!isModelNotFound) {
      throw new Error(`Anthropic classify failed (${response.status}): ${lastErrorBody}`);
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      `Anthropic classify failed after trying models (${triedModels.join(', ')}) (last: ${lastModel}): ${lastErrorBody}`,
    );
  }

  const data = (await response.json()) as AnthropicMessagesResponse;
  const text = (data.content ?? [])
    .filter((chunk) => chunk.type === 'text' && typeof chunk.text === 'string')
    .map((chunk) => chunk.text ?? '')
    .join(' ')
    .trim();

  const resolved = parseModelTagOutput(text, cleanedAvailableTags);
  if (resolved.length === 0) {
    throw new Error(`Invalid classifier response: "${text}"`);
  }
  return resolved.slice(0, maxTags);
}

export async function classifyCommunityPostTag(postText: string): Promise<CommunityTag> {
  const tags = await classifyCommunityPostTags(postText, {
    availableTags: [...COMMUNITY_TAGS],
    maxTags: 1,
  });
  const normalized = normalizeCommunityTag(tags[0]);
  if (!normalized) {
    return 'General';
  }
  return normalized;
}

async function listHaikuModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(ANTHROPIC_MODELS_URL, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as AnthropicModelsResponse;
    return (data.data ?? [])
      .map((model) => (model.id ?? '').trim())
      .filter((id) => id.length > 0 && id.toLowerCase().includes('haiku'));
  } catch {
    return [];
  }
}

function dedupeModels(models: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const model of models) {
    const trimmed = model.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    deduped.push(trimmed);
  }
  return deduped;
}

function buildTaggingPrompt(
  postText: string,
  availableTags: string[],
  popularTagCounts: Record<string, number> | undefined,
  maxTags: number,
): string {
  const popularityMap = new Map<string, number>();
  for (const tag of availableTags) {
    const count = popularTagCounts?.[tag] ?? popularTagCounts?.[tag.toLowerCase()] ?? 0;
    popularityMap.set(tag, Number.isFinite(count) ? Number(count) : 0);
  }

  const allowedList = availableTags
    .map((tag) => `${tag} (count: ${popularityMap.get(tag) ?? 0})`)
    .join('\n- ');

  return [
    'You are a tag classifier for a menopause wellness community.',
    `Return between 1 and ${maxTags} tags from the allowed list only.`,
    'When two tags are synonymous or near-duplicates, prefer the one with higher count.',
    'Return only a comma-separated list of tags, nothing else.',
    '',
    `Allowed tags:\n- ${allowedList}`,
    '',
    `Post:\n${postText}`,
  ].join('\n');
}

function parseModelTagOutput(rawOutput: string, allowedTags: string[]): string[] {
  const normalizedAllowed = new Map<string, string>();
  for (const tag of allowedTags) {
    normalizedAllowed.set(tag.toLowerCase(), tag);
  }

  const candidates = rawOutput
    .split(/[,;\n]/)
    .map((value) => value.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((value) => value.length > 0);

  const resolved: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const match = normalizedAllowed.get(candidate.toLowerCase());
    if (!match) continue;
    const key = match.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(match);
  }

  return resolved;
}

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(trimmed);
  }
  return deduped;
}
