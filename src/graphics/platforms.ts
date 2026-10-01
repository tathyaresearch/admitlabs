// The platforms Drishti names as sources, each with its mark: the real one-colour logo for
// Instagram, X and YouTube, a neutral line icon for everyone else (their logos need permission).
// Recognises a platform from a source link, real or sample (.example). Pure.

import type { IconRef } from './icons.ts';

export const PLATFORMS = [
  'google',
  'google_maps',
  'instagram',
  'youtube',
  'facebook',
  'linkedin',
  'x',
  'reddit',
  'quora',
  'chatgpt',
  'gemini',
  'perplexity',
  'ai_assistants',
  'search_trends',
  'page_speed',
  'official_data',
  'website',
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_NAMES: Readonly<Record<Platform, string>> = {
  google: 'Google',
  google_maps: 'Google Maps',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X',
  reddit: 'Reddit',
  quora: 'Quora',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  ai_assistants: 'AI assistants',
  search_trends: 'Search trends',
  page_speed: 'Page speed test',
  official_data: 'Official data',
  website: 'Website',
};

const line = (name: Extract<IconRef, { kind: 'line' }>['name']): IconRef => ({ kind: 'line', name });

export const PLATFORM_ICONS: Readonly<Record<Platform, IconRef>> = {
  google: line('search'),
  google_maps: line('mapPin'),
  instagram: { kind: 'brand', brand: 'instagram' },
  youtube: { kind: 'brand', brand: 'youtube' },
  facebook: line('team'),
  linkedin: line('briefcase'),
  x: { kind: 'brand', brand: 'x' },
  reddit: line('forum'),
  quora: line('forum'),
  chatgpt: line('assistant'),
  gemini: line('assistant'),
  perplexity: line('assistant'),
  ai_assistants: line('assistant'),
  search_trends: line('demand'),
  page_speed: line('stopwatch'),
  official_data: line('seal'),
  website: line('globe'),
};

/** Demand's platform keys (src/demand/text.ts) as platforms. */
export const DEMAND_PLATFORMS: Readonly<Record<string, Platform>> = {
  reddit: 'reddit',
  x: 'x',
  quora: 'quora',
  youtube: 'youtube',
  instagram: 'instagram',
  trends: 'search_trends',
};

/**
 * The platform a source link points at. Sample links use a .example host named after the
 * platform (instagram.example); real links use the platform's own host. Anything else is a
 * website. Null for a link that cannot be read.
 */
export function platformFromUrl(url: string): Platform | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const path = parsed.pathname.toLowerCase();
  const first = host.split('.')[0] ?? '';
  if (host.endsWith('.example')) {
    const byName: Readonly<Record<string, Platform>> = {
      search: 'google',
      maps: 'google_maps',
      instagram: 'instagram',
      youtube: 'youtube',
      facebook: 'facebook',
      linkedin: 'linkedin',
      x: 'x',
      reddit: 'reddit',
      quora: 'quora',
      'ai-answers': 'ai_assistants',
      trends: 'search_trends',
      pagespeed: 'page_speed',
      'official-data': 'official_data',
    };
    return byName[first] ?? 'website';
  }
  if (host === 'instagram.com') return 'instagram';
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') return 'youtube';
  if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.com') return 'facebook';
  if (host === 'linkedin.com') return 'linkedin';
  if (host === 'x.com' || host === 'twitter.com') return 'x';
  if (host === 'reddit.com' || host === 'old.reddit.com') return 'reddit';
  if (host === 'quora.com' || host.endsWith('.quora.com')) return 'quora';
  if (host === 'chatgpt.com' || host === 'chat.openai.com') return 'chatgpt';
  if (host === 'gemini.google.com') return 'gemini';
  if (host === 'perplexity.ai') return 'perplexity';
  if (host === 'trends.google.com') return 'search_trends';
  if (host === 'pagespeed.web.dev') return 'page_speed';
  if (host === 'maps.google.com' || ((host === 'google.com' || host.startsWith('google.')) && path.startsWith('/maps')) || host === 'maps.app.goo.gl') return 'google_maps';
  if (host === 'google.com' || host.startsWith('google.')) return 'google';
  return 'website';
}
