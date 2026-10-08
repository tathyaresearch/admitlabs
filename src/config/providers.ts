// Data providers (spec section 17). One setting per provider switches it between mock and
// real. Real providers are not connected in this build: no network calls, no keys. The one
// exception is the email sender's mock, which hands messages to the local test inbox that local
// Supabase runs (Mailpit), never to the internet.

import type { CheckKey } from '../domain/types.ts';

export const PROVIDER_KEYS = [
  'website',
  'pagespeed',
  'places',
  'search',
  'youtube',
  'instagram',
  'facebook',
  'reddit',
  'trends',
  'keywords',
  'ai_answers',
  'ai',
  'email',
  'lead_import',
  'manual',
] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

/** Providers that return signals. The AI reader and writer, the email sender and the lead ads importer have their own small interfaces. */
export type SignalProviderKey = Exclude<ProviderKey, 'ai' | 'email' | 'lead_import'>;

export type ProviderMode = 'mock' | 'real';

/** The single setting per provider. Override one with DRISHTI_PROVIDER_<KEY>=mock|real. */
export const PROVIDER_MODES: Readonly<Record<ProviderKey, ProviderMode>> = {
  website: 'mock',
  pagespeed: 'mock',
  places: 'mock',
  search: 'mock',
  youtube: 'mock',
  instagram: 'mock',
  facebook: 'mock',
  reddit: 'mock',
  trends: 'mock',
  keywords: 'mock',
  ai_answers: 'mock',
  ai: 'mock',
  email: 'mock',
  lead_import: 'mock',
  manual: 'mock',
};

export type ProviderFeed =
  | CheckKey
  | 'finding'
  | 'rival_move'
  | 'rival_content'
  | 'rival_ad'
  | 'demand_item'
  | 'search_volume'
  | 'why_it_worked'
  | 'how_to_fix'
  | 'ready_fix'
  | 'finding_fix'
  | 'content_ideas'
  | 'rival_line'
  | 'things_to_do'
  | 'monthly_summary'
  | 'audit_ready_email'
  | 'lead_alert'
  | 'team_lead'
  | 'blueprint_text';

/** The slot each provider fills, what it feeds, and what it will connect to later (spec section 17). */
export const PROVIDER_FEEDS: Readonly<Record<ProviderKey, { slot: string; feeds: readonly ProviderFeed[]; realSource: string }>> = {
  website: {
    slot: 'Website reader',
    feeds: ['fees_shown', 'program_page', 'easy_enquiry', 'admission_steps', 'placement_proof', 'faculty_leaders', 'approvals', 'rival_move'],
    realSource: "Reading the institution's public pages, with the AI reader",
  },
  pagespeed: { slot: 'Google PageSpeed', feeds: ['mobile_friendly', 'page_speed'], realSource: 'Google PageSpeed Insights API' },
  places: { slot: 'Google Places', feeds: ['google_profile', 'review_rating', 'rival_move'], realSource: 'Google Places API' },
  search: {
    slot: 'Search tool, city specific',
    feeds: ['google_search', 'finding', 'approvals', 'demand_item'],
    realSource: 'A search data provider with location (DataForSEO or SerpApi)',
  },
  youtube: { slot: 'YouTube', feeds: ['youtube', 'rival_content', 'demand_item'], realSource: 'YouTube Data API' },
  instagram: { slot: 'Instagram', feeds: ['instagram_activity', 'students_in_content', 'rival_content', 'demand_item'], realSource: 'VidIQ' },
  facebook: { slot: 'Facebook, light', feeds: ['other_socials'], realSource: 'Facebook official access' },
  reddit: { slot: 'Reddit', feeds: ['finding', 'demand_item'], realSource: "Reddit API (commercial use needs Reddit's agreement)" },
  trends: { slot: 'Google Trends', feeds: ['demand_item'], realSource: 'Google Trends, through a data provider' },
  keywords: { slot: 'Keyword tool', feeds: ['search_volume'], realSource: 'A keyword data provider' },
  ai_answers: { slot: 'AI answers', feeds: ['ai_answers'], realSource: "Asking ChatGPT, Gemini and Perplexity the student's question" },
  ai: {
    slot: 'AI reader and writer',
    feeds: ['why_it_worked', 'how_to_fix', 'ready_fix', 'finding_fix', 'content_ideas', 'rival_line', 'things_to_do', 'monthly_summary', 'blueprint_text'],
    realSource: 'Claude API',
  },
  email: { slot: 'Email sender', feeds: ['lead_alert', 'monthly_summary', 'audit_ready_email'], realSource: 'An email service (WhatsApp later, as a second channel)' },
  lead_import: { slot: 'Lead ads import', feeds: ['team_lead'], realSource: 'Meta lead ads (lead forms on Facebook and Instagram ads), into Enquiries' },
  manual: { slot: 'Team entry', feeds: ['rival_ad', 'rival_move'], realSource: 'Team entry screen' },
};

export function providerMode(key: ProviderKey, env: Readonly<Record<string, string | undefined>> = process.env): ProviderMode {
  const override = env[`DRISHTI_PROVIDER_${key.toUpperCase()}`];
  if (override === 'mock' || override === 'real') return override;
  return PROVIDER_MODES[key];
}
