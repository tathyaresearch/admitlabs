// The 17 Audit checks (spec section 7.2). Program checks are scored per program;
// institution checks are scored once and shared by every program. Each sits in one place
// (Website, Google, Social media) and feeds one of the three words.

import { CHECK_KEYS, PILLARS, type CheckKey, type CheckResult, type InstitutionType, type Pillar, type Place } from './types.ts';

export type CheckLevel = 'program' | 'institution';

/** Checks scored separately for each program. */
export const PROGRAM_CHECK_KEYS = ['google_search', 'ai_answers', 'placement_proof', 'fees_shown', 'program_page', 'admission_steps'] as const;
export type ProgramCheckKey = (typeof PROGRAM_CHECK_KEYS)[number];

/** Checks scored once and shared by every program. */
export type InstitutionCheckKey = Exclude<CheckKey, ProgramCheckKey>;
export const INSTITUTION_CHECK_KEYS = CHECK_KEYS.filter(
  (key): key is InstitutionCheckKey => !(PROGRAM_CHECK_KEYS as readonly CheckKey[]).includes(key),
);

export function isProgramCheck(key: CheckKey): key is ProgramCheckKey {
  return (PROGRAM_CHECK_KEYS as readonly CheckKey[]).includes(key);
}

export interface CheckDefinition {
  key: CheckKey;
  pillar: Pillar;
  /** Where it sits in the Audit. */
  place: Place;
  level: CheckLevel;
  /** Short name for lists, tables and meters. */
  name: string;
  /** What the check looks at, in the spec's words. */
  looksAt: string;
}

export const CHECKS: readonly CheckDefinition[] = [
  { key: 'google_search', pillar: 'discovered', place: 'google', level: 'program', name: 'Search results', looksAt: 'Shows up on Google for "[program] in [city]", searched from the city' },
  { key: 'instagram_activity', pillar: 'discovered', place: 'social', level: 'institution', name: 'Instagram', looksAt: 'Instagram posting and reels' },
  { key: 'google_profile', pillar: 'discovered', place: 'google', level: 'institution', name: 'Google profile', looksAt: 'Google profile exists, number of reviews' },
  { key: 'youtube', pillar: 'discovered', place: 'social', level: 'institution', name: 'YouTube', looksAt: 'YouTube activity' },
  { key: 'ai_answers', pillar: 'discovered', place: 'google', level: 'program', name: 'AI answers', looksAt: 'Named when a student asks ChatGPT, Gemini and Perplexity "best [program] in [city]"' },
  { key: 'other_socials', pillar: 'discovered', place: 'social', level: 'institution', name: 'Facebook', looksAt: 'Facebook activity' },
  { key: 'placement_proof', pillar: 'trusted', place: 'website', level: 'program', name: 'Placements', looksAt: 'Placement or results proof' },
  { key: 'review_rating', pillar: 'trusted', place: 'google', level: 'institution', name: 'Reviews and rating', looksAt: 'Google review rating and replies' },
  { key: 'approvals', pillar: 'trusted', place: 'website', level: 'institution', name: 'Approvals', looksAt: 'Approvals and official data shown' },
  { key: 'faculty_leaders', pillar: 'trusted', place: 'website', level: 'institution', name: 'Faculty and leaders', looksAt: 'Faculty and leaders visible' },
  { key: 'students_in_content', pillar: 'trusted', place: 'social', level: 'institution', name: 'Students in your posts', looksAt: 'Real students and alumni in content' },
  { key: 'fees_shown', pillar: 'chosen', place: 'website', level: 'program', name: 'Fees', looksAt: 'Fees shown clearly' },
  { key: 'program_page', pillar: 'chosen', place: 'website', level: 'program', name: 'Program pages', looksAt: 'Program has its own page' },
  { key: 'easy_enquiry', pillar: 'chosen', place: 'website', level: 'institution', name: 'Enquiry', looksAt: 'Enquiry form and WhatsApp' },
  { key: 'admission_steps', pillar: 'chosen', place: 'website', level: 'program', name: 'Admission steps', looksAt: 'Admission steps clear' },
  { key: 'mobile_friendly', pillar: 'chosen', place: 'website', level: 'institution', name: 'Mobile', looksAt: 'Website works on phone' },
  { key: 'page_speed', pillar: 'chosen', place: 'website', level: 'institution', name: 'Speed', looksAt: 'Website loads fast' },
];

/** The order checks are listed in inside their place: what a student meets first, first. */
export const PLACE_CHECK_ORDER: readonly CheckKey[] = [
  'program_page',
  'fees_shown',
  'placement_proof',
  'admission_steps',
  'easy_enquiry',
  'mobile_friendly',
  'page_speed',
  'approvals',
  'faculty_leaders',
  'google_search',
  'google_profile',
  'review_rating',
  'ai_answers',
  'instagram_activity',
  'youtube',
  'other_socials',
  'students_in_content',
];

const BY_KEY = new Map<CheckKey, CheckDefinition>(CHECKS.map((check) => [check.key, check]));

export function getCheck(key: CheckKey): CheckDefinition {
  const check = BY_KEY.get(key);
  if (!check) throw new Error(`Unknown check: ${key}`);
  return check;
}

export function checksForPillar(pillar: Pillar): CheckDefinition[] {
  return CHECKS.filter((check) => check.pillar === pillar);
}

export function checksForLevel(level: CheckLevel): CheckDefinition[] {
  return CHECKS.filter((check) => check.level === level);
}

/** The checks in a place, in the order the place lists them. What people say and Other places have none. */
export function checksForPlace(place: Place): CheckDefinition[] {
  return PLACE_CHECK_ORDER.map(getCheck).filter((check) => check.place === place);
}

/** Sorts checks the way their places list them: Website, Google, Social media, then each place's order. */
export function comparePlaceOrder(a: CheckKey, b: CheckKey): number {
  return PLACE_CHECK_ORDER.indexOf(a) - PLACE_CHECK_ORDER.indexOf(b);
}

const PILLAR_ORDER = new Map<Pillar, number>(PILLARS.map((pillar, index) => [pillar, index]));
const CHECK_ORDER = new Map<CheckKey, number>(CHECKS.map((check, index) => [check.key, index]));

/** Sorts checks the way the spec lists them: Discovered, Trusted, Chosen, then table order. */
export function compareChecks(a: CheckKey, b: CheckKey): number {
  const pillar = (PILLAR_ORDER.get(getCheck(a).pillar) ?? 0) - (PILLAR_ORDER.get(getCheck(b).pillar) ?? 0);
  return pillar !== 0 ? pillar : (CHECK_ORDER.get(a) ?? 0) - (CHECK_ORDER.get(b) ?? 0);
}

/**
 * For skilling institutes the approvals check means skilling recognition instead of
 * NIRF, NAAC, AICTE or UGC (spec section 7.3). The search check names the city it searches
 * from, when it is known: "Search from Guwahati".
 */
export function checkName(key: CheckKey, type: InstitutionType, city?: string | null): string {
  if (key === 'approvals' && type === 'skilling') return 'Skilling recognition';
  if (key === 'google_search' && city) return `Search from ${city}`;
  return getCheck(key).name;
}

/**
 * What to do about a check, as a short action. Program checks name the programs it is about, when
 * given; `many` says there is more than one, for the few actions whose words change with it.
 */
const CHECK_ACTIONS: Readonly<Record<CheckKey, (programs: string | null, many: boolean) => string>> = {
  google_search: (programs) => `Get found when students search for ${programs ?? 'your programs'}`,
  instagram_activity: () => 'Post on Instagram every week',
  google_profile: () => 'Build up your Google profile and reviews',
  youtube: () => 'Post a short YouTube video each month',
  ai_answers: (programs) => `Get named when students ask AI about ${programs ?? 'your programs'}`,
  other_socials: () => 'Post on Facebook every month',
  placement_proof: (programs) => `Publish your ${programs ? `${programs} ` : ''}placement results`,
  review_rating: () => 'Reply to every Google review',
  approvals: () => 'Show your approvals on your website',
  faculty_leaders: () => 'Introduce your faculty and leaders',
  students_in_content: () => 'Put real students in your posts',
  fees_shown: (programs) => `Show your full ${programs ? `${programs} ` : ''}fees`,
  program_page: (programs, many) => (programs ? `Give ${programs} ${many ? 'each ' : ''}a page of its own` : 'Give each program a page of its own'),
  easy_enquiry: () => 'Make it one tap to enquire',
  admission_steps: (programs) => `Spell out the ${programs ? `${programs} ` : ''}admission steps`,
  mobile_friendly: () => 'Make your website easy to use on a phone',
  page_speed: () => 'Make your website load faster',
};

/** When nothing was found at all, the first step is a different one: there is no review to reply to yet. */
const FIRST_STEP_ACTIONS: Partial<Readonly<Record<CheckKey, string>>> = {
  instagram_activity: 'Start an Instagram account',
  google_profile: 'Set up your Google profile',
  youtube: 'Start a YouTube channel',
  other_socials: 'Start a Facebook page',
  review_rating: 'Get your first Google reviews',
};

/**
 * "Show your full BBA and MBA fees", or "Show your full fees" when no program is named. When the
 * check found nothing at all (`result` Missing), the title says the first step instead.
 */
export function checkAction(key: CheckKey, programs: readonly string[], type: InstitutionType, result?: CheckResult): string {
  if (key === 'approvals' && type === 'skilling') return 'Show your skilling recognition on your website';
  const first = result === 'missing' ? FIRST_STEP_ACTIONS[key] : undefined;
  if (first) return first;
  const names = programs.length <= 1 ? (programs[0] ?? null) : `${programs.slice(0, -1).join(', ')} and ${programs[programs.length - 1]}`;
  return CHECK_ACTIONS[key](names, programs.length > 1);
}

export function checkLooksAt(key: CheckKey, type: InstitutionType): string {
  if (key === 'approvals') {
    return type === 'skilling'
      ? 'Skilling recognition shown'
      : 'Official data and approvals such as NIRF, NAAC, AICTE, UGC shown';
  }
  return getCheck(key).looksAt;
}
