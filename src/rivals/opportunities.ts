// What the Rivals "3 things to do" are built on (spec 8.4): the biggest gaps where rivals lead
// you, the best rival post of the month, and recent moves. Pure: this picks and orders them;
// the analysis provider writes the words. Learn, never copy.

import { compareChecks as byCheckOrder } from '../domain/checks.ts';
import type { CheckKey, CheckResult, ContentPlatform, Pillar, RivalMoveKind } from '../domain/types.ts';
import type { CheckComparison } from './compare.ts';

export interface RivalRef {
  id: string;
  name: string;
}

export interface GapOpportunity {
  type: 'gap';
  key: CheckKey;
  pillar: Pillar;
  /** Your programs where it applies, for program checks. */
  programs: string[];
  /** Rivals that lead you on this check, biggest lead first. */
  rivals: RivalRef[];
  /** Points on your scale you could add by matching the leading rival. */
  gap: number;
  yourResult: CheckResult | null;
}

export interface ContentOpportunity {
  type: 'content';
  rival: RivalRef;
  platform: ContentPlatform;
  title: string;
  views: number;
  whyItWorked: string | null;
}

export interface MoveOpportunity {
  type: 'move';
  rival: RivalRef;
  kind: RivalMoveKind;
  description: string;
  detectedAt: string;
}

export type Opportunity = GapOpportunity | ContentOpportunity | MoveOpportunity;

export interface OpportunityInput {
  rivals: ReadonlyArray<RivalRef & { comparisons: readonly CheckComparison[] }>;
  posts: ReadonlyArray<Omit<ContentOpportunity, 'type'>>;
  moves: ReadonlyArray<Omit<MoveOpportunity, 'type'>>;
}

const MOVE_PRIORITY: Readonly<Record<RivalMoveKind, number>> = { admission_dates: 0, fee_change: 1, new_program: 2, started_ads: 3, reviews_jump: 4, new_page: 5 };

/** Checks where at least one rival leads you, the biggest gap first. */
export function gapOpportunities(rivals: OpportunityInput['rivals']): GapOpportunity[] {
  const byKey = new Map<CheckKey, { item: CheckComparison; leads: Array<{ rival: RivalRef; gap: number }> }>();
  for (const rival of rivals) {
    for (const item of rival.comparisons) {
      if (item.lead !== 'them') continue;
      const entry = byKey.get(item.key) ?? { item, leads: [] };
      entry.leads.push({ rival: { id: rival.id, name: rival.name }, gap: item.gap });
      byKey.set(item.key, entry);
    }
  }
  return [...byKey.values()]
    .map(({ item, leads }): GapOpportunity => {
      const sorted = [...leads].sort((a, b) => b.gap - a.gap || a.rival.name.localeCompare(b.rival.name));
      return {
        type: 'gap',
        key: item.key,
        pillar: item.pillar,
        programs: item.programs,
        rivals: sorted.map((lead) => lead.rival),
        gap: sorted[0]?.gap ?? 0,
        yourResult: item.you.kind === 'single' ? item.you.result : null,
      };
    })
    .sort((a, b) => b.gap - a.gap || b.rivals.length - a.rivals.length || byCheckOrder(a.key, b.key));
}

/**
 * Up to three, in a fixed recipe so the list stays varied: the biggest gap, the best post to
 * learn from, then the next gap (or a move worth acting on). Anything missing is filled from
 * what is left, in the same order.
 */
export function rivalOpportunities(input: OpportunityInput, limit = 3): Opportunity[] {
  const gaps = gapOpportunities(input.rivals);
  const posts: ContentOpportunity[] = [...input.posts]
    .sort((a, b) => b.views - a.views || a.title.localeCompare(b.title))
    .map((post) => ({ type: 'content', ...post }));
  const moves: MoveOpportunity[] = [...input.moves]
    .sort((a, b) => MOVE_PRIORITY[a.kind] - MOVE_PRIORITY[b.kind] || b.detectedAt.localeCompare(a.detectedAt))
    .map((move) => ({ type: 'move', ...move }));

  const recipe: Array<Opportunity | undefined> = [gaps[0], posts[0], gaps[1] ?? moves[0]];
  const picked = recipe.filter((item): item is Opportunity => item !== undefined);
  for (const item of [...gaps, ...posts, ...moves]) {
    if (picked.length >= limit) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.slice(0, limit);
}
