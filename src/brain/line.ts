// The Brain in one line (spec section 26), for a Client's monthly summary (email, Reports, the PDF)
// and Home's "Your AdmitLabs team" card: how complete it is while onboarding, then whether any
// facts need checking, and by when if admissions open soon. Pure.

import { formatDate, plural } from '../domain/format.ts';
import type { Brain } from './model.ts';
import { brainProgress } from './progress.ts';
import { needsChecking, seasonAhead } from './stale.ts';

export interface BrainState {
  status: Brain['status'];
  percent: number;
  stale: number;
  /** 'YYYY-MM-DD' when admissions open within the weeks before them. */
  season: string | null;
}

export function brainState(brain: Brain, now: Date): BrainState {
  return { status: brain.status, percent: brainProgress(brain).percent, stale: needsChecking(brain, now).length, season: seasonAhead(brain, now) };
}

/** "Your Brain is Ready. Check 2 facts before admissions open on 1 Dec 2026." */
export function brainLine(state: BrainState): string {
  if (state.status === 'onboarding') return `Your Brain is being set up with your AdmitLabs team: ${state.percent}% complete.`;
  if (state.stale === 0) return 'Your Brain is Ready and up to date.';
  if (state.season) return `Your Brain is Ready. Check ${plural(state.stale, 'fact', 'facts')} before admissions open on ${formatDate(`${state.season}T06:30:00Z`)}.`;
  return `Your Brain is Ready. ${plural(state.stale, 'fact needs', 'facts need')} checking.`;
}

/** The same, short, for Home's "Your AdmitLabs team" card: "2 facts to check before admissions open on 1 Dec 2026." */
export function brainCardLine(state: BrainState): string {
  if (state.status === 'onboarding') return `Being set up, ${state.percent}% complete.`;
  if (state.stale === 0) return 'Ready and up to date.';
  const facts = plural(state.stale, 'fact', 'facts');
  return state.season ? `${facts} to check before admissions open on ${formatDate(`${state.season}T06:30:00Z`)}.` : `${facts} to check.`;
}
