// Words for the Rivals screens and alerts. Plain language, short sentences, no dashes.

import { checkName } from '../domain/checks.ts';
import { formatDate, joinNames } from '../domain/format.ts';
import { INSTITUTION_TYPE_LABELS, RESULT_LABELS, type CheckKey, type InstitutionType, type RivalMoveKind } from '../domain/types.ts';
import type { SideSummary, Standing } from './compare.ts';
import type { ReviewTrend } from './timing.ts';

export const MOVE_KIND_LABELS: Readonly<Record<RivalMoveKind, string>> = {
  new_program: 'New program',
  fee_change: 'Fee change',
  new_page: 'New page',
  admission_dates: 'Admission dates',
  started_ads: 'Started ads',
  reviews_jump: 'Big jump in reviews',
};

/** From your side: "Ahead of you" means the rival is ahead. */
export const STANDING_LABELS: Readonly<Record<Standing, string>> = {
  ahead: 'Ahead of you',
  behind: 'Behind you',
  level: 'Level with you',
  unscored: 'Checking now',
};

/** Who a suggested rival is, and why: "Skilling institute, Guwahati. Also offers Digital Marketing and Hotel Management." */
export function suggestionReason(type: InstitutionType, city: string, sharedPrograms: readonly string[]): string {
  return `${INSTITUTION_TYPE_LABELS[type]}, ${city}. Also offers ${joinNames(sharedPrograms)}.`;
}

/** A check inside a sentence about a rival: "This month, Silverline College is ahead on Instagram and Google reviews." */
const CHECK_PHRASES: Readonly<Record<CheckKey, string>> = {
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

/** A check's name in a table of you and your rivals, where "your" would point at the wrong side. */
export function rivalCheckName(key: CheckKey, type: InstitutionType, city?: string | null): string {
  return key === 'students_in_content' ? 'Students in posts' : checkName(key, type, city);
}

export function checkPhrase(key: CheckKey, type: InstitutionType): string {
  if (key === 'approvals' && type === 'skilling') return 'showing their skilling recognition';
  return CHECK_PHRASES[key];
}

/** Lower case the first letter unless the first word is an acronym (BBA, MBA). */
function lowerFirst(text: string): string {
  const [first = '', second = ''] = text;
  return second && second === second.toLowerCase() ? `${first.toLowerCase()}${text.slice(1)}` : text;
}

/** A "started ads" move, from an ad the team entered: “Started ads: “Scholarships up to 40%.”” */
export function adMoveText(promise: string): string {
  return `Started ads: “${promise.trim()}”`;
}

/** The alert for a new move: "Silverline College announced 2027 admission dates. Forms open on 5 January 2027." */
export function moveNotice(rivalName: string, description: string): string {
  return `${rivalName} ${lowerFirst(description.trim())}`;
}

/** Under a rival's Google rating: which way it is going. "Getting better, up from 4.3." */
export function reviewTrendNote(trend: ReviewTrend): string {
  const { latest, previous } = trend;
  if (!latest || latest.rating === null) return 'Drishti looks at their Google profile at every monthly check.';
  const before = previous?.rating?.toFixed(1);
  switch (trend.direction) {
    case 'better':
      return `Getting better, up from ${before}.`;
    case 'worse':
      return `Getting worse, down from ${before}.`;
    case 'steady':
      return 'Steady, the same as last month.';
    default:
      return "The trend shows after next month's check.";
  }
}

/** "Started 20 Sep 2026" or "Not seen yet". */
export function admissionPushText(detectedAt: string | null): string {
  return detectedAt ? `Started ${formatDate(detectedAt)}` : 'Not seen yet';
}

/** A side's result on a check in words: "Strong", "Weak (weakest: BCA)", "Not checked". */
export function sideWords(side: SideSummary): string {
  if (side.kind === 'single') return RESULT_LABELS[side.result];
  if (side.kind === 'varies') return `${RESULT_LABELS[side.weakest.result]}${side.weakest.programName ? ` (weakest: ${side.weakest.programName})` : ''}`;
  return 'Not checked';
}
