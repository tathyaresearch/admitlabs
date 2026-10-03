// Check by check across all your rivals (B5): every check, you and each rival with the result,
// and who leads. Built from each rival's comparison with you (compare.ts), so who leads here
// always agrees with that rival's own page: a rival leads a check when its comparison says it
// leads you. Pure.

import { CHECKS } from '../domain/checks.ts';
import { joinNames } from '../domain/format.ts';
import type { CheckKey, Pillar } from '../domain/types.ts';
import { summarize, type CheckComparison, type CheckScore, type SideSummary } from './compare.ts';

const EPSILON = 0.005;

export interface AcrossSide {
  id: string;
  name: string;
  you: boolean;
}

export interface AcrossCell {
  summary: SideSummary;
  /** What was found for this side, program by program. */
  parts: CheckScore[];
}

/** 'rival': a rival leads you here. 'level': no rival is ahead, and at least one is level with you. */
export type AcrossLead = 'rival' | 'you' | 'level' | 'unknown';

export interface AcrossRow {
  key: CheckKey;
  pillar: Pillar;
  /** For a program check: your programs compared with any rival, by name. Empty for an institution check. */
  programs: string[];
  /** Your result, then each rival's, by side id. Null when that side was not compared. */
  cells: Record<string, AcrossCell | null>;
  lead: AcrossLead;
  /** The rivals ahead of you by the most (lead 'rival'), or level with you (lead 'level'), by side id. */
  leaders: string[];
}

export interface RivalComparisons {
  side: AcrossSide;
  comparisons: readonly CheckComparison[];
}

function share(summary: SideSummary): number {
  return summary.kind === 'none' ? -1 : summary.share;
}

/** Every check in the spec's order, you and each rival side by side. */
export function checksAcross(you: AcrossSide, rivals: readonly RivalComparisons[]): AcrossRow[] {
  return CHECKS.map((check) => {
    const items = rivals.map((rival) => ({ rival, item: rival.comparisons.find((entry) => entry.key === check.key) ?? null }));

    // Yours covers every program of yours compared with any rival.
    const mine = new Map<string, CheckScore>();
    for (const { item } of items) for (const part of item?.yourParts ?? []) mine.set(part.checkId, part);
    const yours = [...mine.values()];
    const cells: Record<string, AcrossCell | null> = { [you.id]: yours.length ? { summary: summarize(yours), parts: yours } : null };
    for (const { rival, item } of items) cells[rival.side.id] = item ? { summary: item.them, parts: item.theirParts } : null;

    const known = items.filter(({ item }) => item && item.lead !== 'unknown');
    const ahead = known.filter(({ item }) => item?.lead === 'them');
    let lead: AcrossLead = 'unknown';
    let leaders: string[] = [];
    if (ahead.length) {
      // The rivals furthest ahead lead; two that are level at the top both lead.
      const best = Math.max(...ahead.map(({ item }) => share(item?.them ?? { kind: 'none' })));
      lead = 'rival';
      leaders = ahead.filter(({ item }) => Math.abs(share(item?.them ?? { kind: 'none' }) - best) < EPSILON).map(({ rival }) => rival.side.id);
    } else if (known.length) {
      const level = known.filter(({ item }) => item?.lead === 'level');
      lead = level.length ? 'level' : 'you';
      leaders = level.map(({ rival }) => rival.side.id);
    }

    const programs = [...new Set(yours.flatMap((part) => (part.programName ? [part.programName] : [])))].sort();
    return { key: check.key, pillar: check.pillar, programs, cells, lead, leaders };
  });
}

/** Who leads, in a few words: "Silverline College", "You lead", "You, level with Highfield University", "All level". */
export function leadText(row: Pick<AcrossRow, 'lead' | 'leaders'>, sides: readonly AcrossSide[]): string {
  const names = row.leaders.map((id) => sides.find((side) => side.id === id)?.name ?? 'A rival');
  const rivals = sides.filter((side) => !side.you).length;
  switch (row.lead) {
    case 'rival':
      return joinNames(names);
    case 'you':
      return 'You lead';
    case 'level':
      if (names.length === rivals && rivals > 1) return 'All level';
      return `You, level with ${names.length === 1 ? names[0] : `${names.length} rivals`}`;
    default:
      return 'Not compared yet';
  }
}

/** The same in a sentence, for the panel: "Silverline College leads here." */
export function leadSentence(row: Pick<AcrossRow, 'lead' | 'leaders'>, sides: readonly AcrossSide[]): string {
  const names = row.leaders.map((id) => sides.find((side) => side.id === id)?.name ?? 'A rival');
  switch (row.lead) {
    case 'rival':
      return `${joinNames(names)} ${names.length > 1 ? 'lead' : 'leads'} here.`;
    case 'you':
      return sides.filter((side) => !side.you).length > 1 ? 'You lead every rival here.' : 'You lead here.';
    case 'level':
      return `You are level with ${joinNames(names)} here.`;
    default:
      return 'Not compared yet. It shows once both sides have been checked.';
  }
}
