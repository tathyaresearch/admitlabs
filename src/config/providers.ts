// Data providers (spec section 17). One setting per provider switches it between mock and
// real. Real providers are not connected in this build: no network calls, no keys.

import type { CheckKey } from '../domain/types.ts';

export const PROVIDER_KEYS = [
  'search',
  'places',
  'pagespeed',
  'site_crawler',
  'instagram',
  'youtube',
  'socials',
  'ai_answers',
  'official_data',
  'reddit',
  'x',
  'quora',
  'trends',
  'analysis',
  'manual',
] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

/** Providers that return signals. `analysis` writes text from other data instead. */
export type SignalProviderKey = Exclude<ProviderKey, 'analysis'>;

export type ProviderMode = 'mock' | 'real';

/** The single setting per provider. Override one with DRISHTI_PROVIDER_<KEY>=mock|real. */
export const PROVIDER_MODES: Readonly<Record<ProviderKey, ProviderMode>> = {
  search: 'mock',
  places: 'mock',
  pagespeed: 'mock',
  site_crawler: 'mock',
  instagram: 'mock',
  youtube: 'mock',
  socials: 'mock',
  ai_answers: 'mock',
  official_data: 'mock',
  reddit: 'mock',
  x: 'mock',
  quora: 'mock',
  trends: 'mock',
  analysis: 'mock',
  manual: 'mock',
};

export type ProviderFeed =
  | CheckKey
  | 'rival_move'
  | 'rival_content'
  | 'rival_ad'
  | 'demand_item'
  | 'why_it_worked'
  | 'how_to_fix'
  | 'demand_grouping'
  | 'content_ideas'
  | 'things_to_do';

/** What each provider feeds, and what it will connect to later (spec section 17). */
export const PROVIDER_FEEDS: Readonly<Record<ProviderKey, { feeds: readonly ProviderFeed[]; realSource: string }>> = {
  search: { feeds: ['google_search'], realSource: 'Search data provider (DataForSEO or SerpApi)' },
  places: { feeds: ['google_profile', 'review_rating'], realSource: 'Google Places API' },
  pagespeed: { feeds: ['mobile_friendly', 'page_speed'], realSource: 'Google PageSpeed Insights API' },
  site_crawler: {
    feeds: ['fees_shown', 'program_page', 'easy_enquiry', 'admission_steps', 'placement_proof', 'faculty_leaders', 'approvals', 'rival_move'],
    realSource: 'Website crawl, then Claude reads the pages',
  },
  instagram: {
    feeds: ['instagram_activity', 'students_in_content', 'rival_content', 'demand_item'],
    realSource: 'Instagram Graph API (official access only)',
  },
  youtube: { feeds: ['youtube', 'rival_content', 'demand_item'], realSource: 'YouTube Data API' },
  socials: { feeds: ['other_socials'], realSource: 'Facebook, LinkedIn official access' },
  ai_answers: { feeds: ['ai_answers'], realSource: "Asking AI assistants the student's question" },
  official_data: { feeds: ['approvals'], realSource: "Official documents (NIRF and others), using Tathya's PDF extraction approach" },
  reddit: { feeds: ['demand_item'], realSource: 'Reddit official API, checked for terms of use' },
  x: { feeds: ['demand_item'], realSource: 'X official API, checked for terms of use' },
  quora: { feeds: ['demand_item'], realSource: 'Quora official access, checked for terms of use' },
  trends: { feeds: ['demand_item'], realSource: 'Search trends official API, checked for terms of use' },
  analysis: {
    feeds: ['why_it_worked', 'how_to_fix', 'demand_grouping', 'content_ideas', 'things_to_do'],
    realSource: 'Claude API',
  },
  manual: { feeds: ['rival_ad'], realSource: 'Team entry screen' },
};

export function providerMode(key: ProviderKey, env: Readonly<Record<string, string | undefined>> = process.env): ProviderMode {
  const override = env[`DRISHTI_PROVIDER_${key.toUpperCase()}`];
  if (override === 'mock' || override === 'real') return override;
  return PROVIDER_MODES[key];
}
