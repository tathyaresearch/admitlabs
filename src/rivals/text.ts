// Words for the Rivals screens and alerts. Plain language, short sentences, no dashes.

import { formatDate, joinNames } from '../domain/format.ts';
import type { RivalMoveKind } from '../domain/types.ts';
import type { Lead, Standing } from './compare.ts';
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

/** Who leads on a check, from your side. */
export const LEAD_WORDS: Readonly<Record<Lead, string>> = {
  them: 'They lead',
  you: 'You lead',
  level: 'Level',
  unknown: 'Not compared',
};

/** Why a rival is suggested: "Same city. Shared programs: BBA and B.Com." */
export function suggestionReason(sameCity: boolean, sharedPrograms: readonly string[], state: string): string {
  const where = sameCity ? 'Same city.' : `Same state, ${state}.`;
  const shared = sharedPrograms.length === 1 ? `Shared program: ${sharedPrograms[0]}.` : `Shared programs: ${joinNames(sharedPrograms)}.`;
  return `${where} ${shared}`;
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
