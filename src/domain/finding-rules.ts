// Findings (spec 7.2 and 7.7): what Drishti found about an institution in What people say (Reddit,
// Quora, forums) and Other places (news, listing sites, directories). Never a person: one short
// line in Drishti's words, the link and the date. Pure: these rules decide whether a finding has
// something to do and, when it does, its impact and how big a job it is. The writer (the AI
// provider) words the fix; these rules say how much it matters, the same way every time.

import type { Difficulty, FindingKind, FindingPlace, Impact } from './types.ts';

/** What is wrong with a listing or directory entry, or null when it is right. */
export type ListingProblem = 'old_details' | 'missing_courses' | 'missing';

export interface FindingFacts {
  place: FindingPlace;
  kind: FindingKind;
  /** How many times the same point came up: a complaint three students make in one thread is 3. */
  repeats: number;
  /** For a listing or directory entry: what is wrong with it. */
  listing: ListingProblem | null;
}

/** A complaint made this many times or more is High impact [ADJUSTABLE]. */
export const REPEATED_COMPLAINT = 3;

/** Whether a finding asks for something to be done: an open question, a complaint, a listing to correct. */
export function findingHasFix(finding: Pick<FindingFacts, 'kind' | 'listing'>): boolean {
  if (finding.kind === 'unanswered' || finding.kind === 'bad') return true;
  if (finding.kind === 'listing' || finding.kind === 'directory') return finding.listing !== null;
  return false;
}

/**
 * The impact of a finding's fix (spec 7.7): a question about you that nobody answered is Medium;
 * the same complaint 3 times or more is High, once or twice Medium; a listing with old details or
 * missing courses is Medium; a missing listing is Low. Null when there is nothing to do.
 */
export function findingImpact(finding: FindingFacts): Impact | null {
  if (!findingHasFix(finding)) return null;
  switch (finding.kind) {
    case 'unanswered':
      return 'medium';
    case 'bad':
      return finding.repeats >= REPEATED_COMPLAINT ? 'high' : 'medium';
    default:
      return finding.listing === 'missing' ? 'low' : 'medium';
  }
}

/** How big a job a finding's fix is: replying or correcting a listing is quick. */
export function findingEffort(finding: FindingFacts): Difficulty | null {
  return findingHasFix(finding) ? 'easy' : null;
}

/** Findings that count as good news in What's good: praise, a news story, a listing that is right. */
export function findingIsGood(finding: Pick<FindingFacts, 'kind' | 'listing'>): boolean {
  if (finding.kind === 'good' || finding.kind === 'news') return true;
  return (finding.kind === 'listing' || finding.kind === 'directory') && finding.listing === null;
}

/** With fewer findings than this in the last 3 months, What people say reads "Not much said about you yet" [ADJUSTABLE]. */
export const THIN_FINDINGS = 3;
