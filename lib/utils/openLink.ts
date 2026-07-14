import * as Linking from 'expo-linking';
import { openInAppBrowser } from '@/lib/utils/inAppBrowser';

type NativeAppLink = {
  matches: (url: URL) => boolean;
  schemes: string[];
  toNativeUrl: (url: URL) => string;
};

const NATIVE_APP_LINKS: NativeAppLink[] = [
  {
    matches: (url) => /(^|\.)instagram\.com$/i.test(url.hostname),
    schemes: ['instagram'],
    toNativeUrl: (url) => `instagram://${url.host}${url.pathname}${url.search}`,
  },
  {
    matches: (url) => /(^|\.)tiktok\.com$/i.test(url.hostname),
    schemes: ['tiktok', 'snssdk1233'],
    toNativeUrl: (url) => `snssdk1233://${url.host}${url.pathname}${url.search}`,
  },
  {
    matches: (url) =>
      /(^|\.)facebook\.com$/i.test(url.hostname) || /(^|\.)fb\.watch$/i.test(url.hostname),
    schemes: ['fb'],
    toNativeUrl: (url) =>
      `fb://facewebmodal/f?href=${encodeURIComponent(url.toString())}`,
  },
  {
    matches: (url) =>
      /(^|\.)twitter\.com$/i.test(url.hostname) || /(^|\.)x\.com$/i.test(url.hostname),
    schemes: ['twitter', 'x-twitter'],
    toNativeUrl: (url) => `twitter://${url.host}${url.pathname}${url.search}`,
  },
  {
    matches: (url) =>
      /(^|\.)youtube\.com$/i.test(url.hostname) || url.hostname === 'youtu.be',
    schemes: ['youtube', 'vnd.youtube'],
    toNativeUrl: (url) => `vnd.youtube://${url.host}${url.pathname}${url.search}`,
  },
  {
    matches: (url) => /(^|\.)linkedin\.com$/i.test(url.hostname),
    schemes: ['linkedin'],
    toNativeUrl: (url) => `linkedin://${url.host}${url.pathname}${url.search}`,
  },
  {
    matches: (url) => /(^|\.)reddit\.com$/i.test(url.hostname),
    schemes: ['reddit'],
    toNativeUrl: (url) => `reddit://${url.host}${url.pathname}${url.search}`,
  },
  {
    matches: (url) => /(^|\.)pinterest\.com$/i.test(url.hostname),
    schemes: ['pinterest'],
    toNativeUrl: (url) => `pinterest://${url.host}${url.pathname}${url.search}`,
  },
];

function normalizeHttpUrl(url: string): string | null {
  const trimmed = url.trim().replace(/[.,;:!?)]+$/, '');
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

async function canOpenAnyScheme(schemes: string[]): Promise<boolean> {
  for (const scheme of schemes) {
    try {
      if (await Linking.canOpenURL(`${scheme}://`)) {
        return true;
      }
    } catch {
      // try next scheme
    }
  }
  return false;
}

async function tryOpenNativeApp(url: URL): Promise<boolean> {
  const handler = NATIVE_APP_LINKS.find((entry) => entry.matches(url));
  if (!handler) return false;

  const hasApp = await canOpenAnyScheme(handler.schemes);
  if (!hasApp) return false;

  const nativeUrl = handler.toNativeUrl(url);
  await Linking.openURL(nativeUrl);
  return true;
}

export async function openLink(url: string): Promise<void> {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return;

  try {
    const parsed = new URL(normalized);
    const openedNatively = await tryOpenNativeApp(parsed);
    if (openedNatively) return;
  } catch (error) {
    console.warn('[openLink] Native app open failed, falling back to in-app browser:', error);
  }

  await openInAppBrowser(normalized);
}
