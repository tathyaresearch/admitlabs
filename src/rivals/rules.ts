// Who can change their rivals, and when (spec section 10): Free picks once, Paid changes once
// each calendar month (India time), Client any time. The first setup never counts. The
// database enforces the same rules in save_rivals(); this says what the page should offer.

import { refreshResetsOn, sameIstMonth } from '../domain/schedule.ts';
import type { Tier } from '../domain/types.ts';

export type RivalChangeState =
  /** No rivals yet: pick 3 to 5 on any plan. */
  | { kind: 'first_setup' }
  /** Free: the rivals stay as picked. */
  | { kind: 'locked' }
  /** Client: any time. */
  | { kind: 'anytime' }
  /** Paid: this month's change is still free to use. */
  | { kind: 'available' }
  /** Paid: changed this month; the next change opens on the 1st. */
  | { kind: 'used'; changedOn: Date; nextOn: Date };

export function rivalChangeState(tier: Tier, hasRivals: boolean, lastChange: Date | null, now: Date): RivalChangeState {
  if (!hasRivals) return { kind: 'first_setup' };
  if (tier === 'free') return { kind: 'locked' };
  if (tier === 'client') return { kind: 'anytime' };
  if (lastChange && sameIstMonth(lastChange, now)) return { kind: 'used', changedOn: lastChange, nextOn: refreshResetsOn(now) };
  return { kind: 'available' };
}

export function canChangeRivals(state: RivalChangeState): boolean {
  return state.kind === 'first_setup' || state.kind === 'anytime' || state.kind === 'available';
}
