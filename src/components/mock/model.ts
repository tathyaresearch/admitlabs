// Version 2 mock (Step 2, development only): the words and shapes the mock screens share.
// Browser safe. Removed with the mock page at the end of Step 3.

import type { IconName } from '@/components/ui/Icon';
import type { CheckKey, CheckResult, Difficulty, Pillar } from '@/domain/types';

export type PlaceKey = 'website' | 'google' | 'social' | 'people' | 'other';

export interface PlaceInfo {
  key: PlaceKey;
  name: string;
  covers: string;
  icon: IconName;
  scored: boolean;
}

export const PLACES: readonly PlaceInfo[] = [
  { key: 'website', name: 'Website', covers: 'Program pages, fees, placements, admission steps, enquiry, mobile and speed', icon: 'webPage', scored: true },
  { key: 'google', name: 'Google', covers: 'Search from your city, your Google profile, reviews and rating, AI answers', icon: 'searchResults', scored: true },
  { key: 'social', name: 'Social media', covers: 'Instagram, YouTube and Facebook: how active, and what works', icon: 'share', scored: true },
  { key: 'people', name: 'What people say', covers: 'Reddit, Quora and forums: good, bad and unanswered', icon: 'forum', scored: false },
  { key: 'other', name: 'Other places', covers: 'News, college listing sites and directories', icon: 'globe', scored: false },
];

export function placeInfo(key: PlaceKey): PlaceInfo {
  return PLACES.find((place) => place.key === key) as PlaceInfo;
}

/** Where each of the 17 checks sits. */
export const CHECK_PLACE: Readonly<Record<CheckKey, PlaceKey>> = {
  program_page: 'website',
  fees_shown: 'website',
  placement_proof: 'website',
  admission_steps: 'website',
  easy_enquiry: 'website',
  mobile_friendly: 'website',
  page_speed: 'website',
  approvals: 'website',
  faculty_leaders: 'website',
  google_search: 'google',
  google_profile: 'google',
  review_rating: 'google',
  ai_answers: 'google',
  instagram_activity: 'social',
  youtube: 'social',
  other_socials: 'social',
  students_in_content: 'social',
};

/** The order checks are listed in, inside their place. */
export const CHECK_ORDER: readonly CheckKey[] = [
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

/** The names on screen in version 2. */
export function checkNameV2(key: CheckKey, city: string, skilling = false): string {
  switch (key) {
    case 'program_page':
      return 'Program pages';
    case 'fees_shown':
      return 'Fees';
    case 'placement_proof':
      return skilling ? 'Results and placements' : 'Placements';
    case 'admission_steps':
      return 'Admission steps';
    case 'easy_enquiry':
      return 'Enquiry';
    case 'mobile_friendly':
      return 'Mobile';
    case 'page_speed':
      return 'Speed';
    case 'approvals':
      return skilling ? 'Skilling recognition' : 'Approvals';
    case 'faculty_leaders':
      return 'Faculty and leaders';
    case 'google_search':
      return `Search from ${city}`;
    case 'google_profile':
      return 'Google profile';
    case 'review_rating':
      return 'Reviews and rating';
    case 'ai_answers':
      return 'AI answers';
    case 'instagram_activity':
      return 'Instagram';
    case 'youtube':
      return 'YouTube';
    case 'other_socials':
      return 'Facebook';
    case 'students_in_content':
      return 'Students in your posts';
  }
}

/** How a check reads inside a sentence about a rival: "ahead on Instagram and Google reviews". */
export const CHECK_IN_A_LINE: Readonly<Record<CheckKey, string>> = {
  program_page: 'program pages',
  fees_shown: 'fees on their website',
  placement_proof: 'placement proof',
  admission_steps: 'admission steps',
  easy_enquiry: 'how easy it is to enquire',
  mobile_friendly: 'their website on a phone',
  page_speed: 'website speed',
  approvals: 'showing their approvals',
  faculty_leaders: 'showing their faculty',
  google_search: 'Google search',
  google_profile: 'their Google profile',
  review_rating: 'Google reviews',
  ai_answers: 'AI answers',
  instagram_activity: 'Instagram',
  youtube: 'YouTube',
  other_socials: 'Facebook',
  students_in_content: 'students in their posts',
};

export type Word = 'Strong' | 'Okay' | 'Weak';

export const WORDS: ReadonlyArray<{ pillar: Pillar; name: string; question: string; icon: IconName }> = [
  { pillar: 'discovered', name: 'Visibility', question: 'Can students find you?', icon: 'compass' },
  { pillar: 'trusted', name: 'Trust', question: 'Do they believe you?', icon: 'shield' },
  { pillar: 'chosen', name: 'Chosen', question: 'Is it easy to pick you?', icon: 'target' },
];

export function wordFor(score: number): Word {
  return score >= 70 ? 'Strong' : score >= 40 ? 'Okay' : 'Weak';
}

export type Impact = 'High' | 'Medium' | 'Low';

/** From the points a fix could add to its part, out of 100. */
export function impactFor(partPoints: number): Impact {
  return partPoints >= 12 ? 'High' : partPoints >= 6 ? 'Medium' : 'Low';
}

export const IMPACT_ORDER: Readonly<Record<Impact, number>> = { High: 0, Medium: 1, Low: 2 };

export interface Proof {
  url: string;
  /** ISO time it was checked. */
  date: string;
  /** One short line of what Drishti saw. */
  line: string;
  /** The program, for a program check. */
  program?: string | null;
  /** Set when the AdmitLabs team changed it in a review. */
  byTeam?: boolean;
}

export type FindingKind = 'good' | 'bad' | 'unanswered' | 'listing' | 'news' | 'directory';

export const FINDING_LABELS: Readonly<Record<FindingKind, string>> = {
  good: 'Good',
  bad: 'Complaint',
  unanswered: 'Unanswered',
  listing: 'Listing',
  news: 'News',
  directory: 'Directory',
};

/** One line in What we found: a check with its result, or a finding. */
export interface FoundRow {
  id: string;
  name: string;
  key?: CheckKey;
  result?: CheckResult;
  /** Share of the check's points earned, 0 to 1. */
  share?: number;
  /** The weakest program, when a program check's programs differ. */
  weakestProgram?: string | null;
  kind?: FindingKind;
  /** Where a finding was found: "Quora", "Reddit", "collegeguide.example". */
  source?: string;
  proof: Proof;
}

export type ReadyFix =
  | { kind: 'text'; title: string; text: string }
  | { kind: 'table'; title: string; head: readonly string[]; rows: ReadonlyArray<readonly string[]>; note?: string }
  | { kind: 'outline'; title: string; items: ReadonlyArray<{ heading: string; line: string }> };

export interface Fix {
  id: string;
  title: string;
  place: PlaceKey;
  /** The check or finding it is about, as a small label. */
  label: string;
  checkKey?: CheckKey;
  impact: Impact;
  effort: Difficulty;
  programs: readonly string[];
  found: readonly Proof[];
  why: string;
  steps: readonly string[];
  ready: ReadyFix;
  /** When the owner asked AdmitLabs to fix it, if they did. */
  askedOn?: string | null;
  markedOn?: string | null;
}

export interface Good {
  id: string;
  title: string;
  line: string;
}

export interface Thin {
  title: string;
  why: string;
  helps: readonly string[];
  next: string;
}

export interface Place {
  info: PlaceInfo;
  found: readonly FoundRow[];
  good: readonly Good[];
  fixes: readonly Fix[];
  thin: Thin | null;
}

export interface WordState {
  pillar: Pillar;
  name: string;
  question: string;
  icon: IconName;
  word: Word;
  score: number;
  /** The weakest check behind it. */
  fixFirst: { name: string; result: CheckResult } | null;
  /** "Up from Okay in August", or null. */
  moved: string | null;
}

export interface MockAudit {
  slug: string;
  name: string;
  city: string;
  type: 'college' | 'university' | 'skilling';
  tier: 'free' | 'paid' | 'client';
  checkedAt: string;
  previousAt: string | null;
  programs: readonly string[];
  words: readonly WordState[];
  verdict: string;
  score: number;
  topFixes: readonly Fix[];
  places: readonly Place[];
  /** Checks that moved since the last Audit. */
  moved: ReadonlyArray<{ name: string; before: CheckResult; after: CheckResult; place: PlaceKey }>;
}
