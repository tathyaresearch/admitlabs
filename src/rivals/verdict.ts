// "Where you stand" in one sentence, in the Audit's pattern: a strength first, then the next
// step. Never a failing: a rival ahead of you is something to learn from.

import { joinNames } from '../domain/format.ts';
import { PILLARS, type Pillar } from '../domain/types.ts';
import type { ScoreSet, Standing } from './compare.ts';

export const PILLAR_PHRASE: Readonly<Record<Pillar, string>> = {
  discovered: 'being found',
  trusted: 'being trusted',
  chosen: 'being chosen',
};

export interface ScoredRival {
  name: string;
  scores: ScoreSet;
}

function countWord(count: number): string {
  return ['no', 'one', 'both', 'all three', 'all four', 'all five'][count] ?? `all ${count}`;
}

/** The pillar where `them` leads `you` by the most, if any. Ties go to the spec's order. */
function biggestGap(you: ScoreSet, them: ScoreSet): { pillar: Pillar; gap: number } | null {
  let best: { pillar: Pillar; gap: number } | null = null;
  for (const pillar of PILLARS) {
    const gap = them[pillar] - you[pillar];
    if (gap > 0 && (best === null || gap > best.gap)) best = { pillar, gap };
  }
  return best;
}

/**
 * Paid and Client: you against every rival, overall and pillar by pillar.
 * "You're ahead of Highfield University. Next step: catching Silverline College on being found."
 */
export function rivalsVerdict(you: ScoreSet, rivals: readonly ScoredRival[]): string {
  if (rivals.length === 0) return '';
  const behindYou = rivals.filter((rival) => rival.scores.overall < you.overall);
  const aheadOfYou = rivals.filter((rival) => rival.scores.overall > you.overall);
  const level = rivals.filter((rival) => rival.scores.overall === you.overall);

  let strength: string;
  if (behindYou.length === rivals.length) {
    strength = rivals.length === 1 ? `You're ahead of ${rivals[0]?.name}.` : `You're ahead of ${countWord(rivals.length)} of your rivals.`;
  } else if (behindYou.length > 0) {
    strength = `You're ahead of ${joinNames(behindYou.map((rival) => rival.name))}.`;
  } else if (level.length > 0) {
    strength = `You're level with ${joinNames(level.map((rival) => rival.name))}.`;
  } else {
    // Behind every rival overall: lead with the pillar where you beat one of them by the most.
    let best: { name: string; pillar: Pillar; gap: number } | null = null;
    for (const rival of rivals) {
      const lead = biggestGap(rival.scores, you);
      if (lead && (best === null || lead.gap > best.gap)) best = { name: rival.name, ...lead };
    }
    strength = best ? `You lead ${best.name} on ${PILLAR_PHRASE[best.pillar]}.` : 'Each rival shows you something that works.';
  }

  let next: string;
  if (aheadOfYou.length > 0) {
    // The rival just above you, and the pillar where it leads you most.
    const target = [...aheadOfYou].sort((a, b) => a.scores.overall - b.scores.overall || a.name.localeCompare(b.name))[0] as ScoredRival;
    const gap = biggestGap(you, target.scores);
    next = gap ? `Next step: catching ${target.name} on ${PILLAR_PHRASE[gap.pillar]}.` : `Next step: catching ${target.name}.`;
  } else {
    let best: { name: string; pillar: Pillar; gap: number } | null = null;
    for (const rival of rivals) {
      const gap = biggestGap(you, rival.scores);
      if (gap && (best === null || gap.gap > best.gap)) best = { name: rival.name, ...gap };
    }
    next = best ? `Next step: catching ${best.name} on ${PILLAR_PHRASE[best.pillar]}.` : 'Next step: keeping your lead.';
  }
  return `${strength} ${next}`;
}

/**
 * Free: ahead or behind only, so no scores, pillars or order.
 * "You're ahead of Highfield University. Next step: catching Silverline College and Eastgate University."
 */
export function freeRivalsVerdict(rivals: ReadonlyArray<{ name: string; standing: Standing }>): string {
  const scored = rivals.filter((rival) => rival.standing !== 'unscored');
  if (scored.length === 0) return '';
  const names = (standing: Standing) =>
    scored
      .filter((rival) => rival.standing === standing)
      .map((rival) => rival.name)
      .sort((a, b) => a.localeCompare(b));
  const behindYou = names('behind');
  const aheadOfYou = names('ahead');
  const level = names('level');

  const strength =
    behindYou.length === scored.length && scored.length > 1
      ? `You're ahead of ${countWord(scored.length)} of your rivals.`
      : behindYou.length > 0
        ? `You're ahead of ${joinNames(behindYou)}.`
        : level.length > 0
          ? `You're level with ${joinNames(level)}.`
          : 'Each rival shows you something that works.';
  // Every rival ahead (3 to 5 of them): no list of names, just the next step.
  const next =
    aheadOfYou.length === 0
      ? 'Next step: keeping your lead.'
      : aheadOfYou.length === scored.length && scored.length > 1
        ? 'Next step: catching up.'
        : `Next step: catching ${joinNames(aheadOfYou)}.`;
  return `${strength} ${next}`;
}

/**
 * One rival's page: you against them.
 * "You lead on being found. Next step: catching them on being chosen."
 */
export function rivalVerdict(you: ScoreSet, them: ScoreSet): string {
  const youLead = PILLARS.filter((pillar) => you[pillar] > them[pillar]);
  const strength =
    you.overall > them.overall
      ? "You're ahead overall."
      : youLead.length > 0
        ? `You lead on ${joinNames(youLead.map((pillar) => PILLAR_PHRASE[pillar]))}.`
        : you.overall === them.overall
          ? "You're level overall."
          : "They're ahead on all three for now, so there is plenty to learn.";
  const gap = biggestGap(you, them);
  const next = gap ? `Next step: catching them on ${PILLAR_PHRASE[gap.pillar]}.` : 'Next step: keeping your lead.';
  return `${strength} ${next}`;
}
