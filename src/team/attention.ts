// Why an institution needs the team's attention (B8), most urgent first: a Paid plan ending soon
// (from its first renewal reminder: 7 days before the end on Monthly, 30 days on 3 months),
// a Client with no team Audit this month, a score that dropped, no rivals picked, a prospect who
// has not signed up a week after their Audit was shared, and a Client whose Brain is not Ready
// yet (spec section 26). The database orders the list by the
// first of these (the team_institutions view, with the same rules); this says each one in
// words. Pure.

import { TEAM_RULES } from '../config/team.ts';
import { daysBetween, istParts } from '../domain/dates.ts';
import { formatMonth } from '../domain/format.ts';
import { DEFAULT_PAID_MONTHS, renewalReminderDays, type PaidMonths } from '../domain/tiers.ts';
import type { Tier } from '../domain/types.ts';

export type AttentionKey = 'paid_ending' | 'client_no_team_audit' | 'score_down' | 'no_rivals' | 'follow_up' | 'client_onboarding';

/** Most urgent first. */
export const ATTENTION_KEYS: readonly AttentionKey[] = ['paid_ending', 'client_no_team_audit', 'score_down', 'no_rivals', 'follow_up', 'client_onboarding'];

export interface AttentionInput {
  claimed: boolean;
  tier: Tier | null;
  planEndsAt: string | null;
  /** A Paid plan's period, 1 or 3 months. */
  planMonths: PaidMonths | null;
  /** The latest Audit's change in the overall score. */
  scoreChange: number | null;
  rivals: number;
  /** When the team Audit was last shared with a link that still works. */
  sharedAt: string | null;
  /** A Client's latest Audit run by the team. */
  teamRefreshedAt: string | null;
  /** A Client's Brain: onboarding, ready, or null before it starts. */
  brainStatus?: 'onboarding' | 'ready' | null;
}

export interface AttentionReason {
  key: AttentionKey;
  text: string;
}

const days = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The first moment of `now`'s month in India. */
function monthStart(now: Date): number {
  const { year, month } = istParts(now);
  return Date.parse(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`);
}

export function attentionReasons(row: AttentionInput, now: Date): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const ends = row.planEndsAt ? new Date(row.planEndsAt) : null;
  if (row.tier === 'paid' && ends && ends.getTime() > now.getTime() && ends.getTime() <= now.getTime() + renewalReminderDays(row.planMonths ?? DEFAULT_PAID_MONTHS) * 86_400_000) {
    const left = Math.max(0, daysBetween(now, ends));
    reasons.push({ key: 'paid_ending', text: left === 0 ? 'Paid ends today' : left === 1 ? 'Paid ends tomorrow' : `Paid ends in ${days(left, 'day', 'days')}` });
  }
  if (row.tier === 'client' && (!row.teamRefreshedAt || Date.parse(row.teamRefreshedAt) < monthStart(now))) {
    const { year, month } = istParts(now);
    reasons.push({ key: 'client_no_team_audit', text: `No team Audit in ${formatMonth(`${year}-${String(month).padStart(2, '0')}`).split(' ')[0]} yet` });
  }
  if (row.claimed && row.scoreChange !== null && row.scoreChange <= -TEAM_RULES.attentionScoreDrop) {
    reasons.push({ key: 'score_down', text: `Score down ${Math.abs(row.scoreChange)}` });
  }
  if (row.claimed && row.rivals === 0) reasons.push({ key: 'no_rivals', text: 'No rivals picked' });
  if (!row.claimed && row.sharedAt) {
    const since = daysBetween(new Date(row.sharedAt), now);
    if (since >= TEAM_RULES.followUpAfterDays) reasons.push({ key: 'follow_up', text: `Shared ${days(since, 'day', 'days')} ago, not signed up` });
  }
  if (row.tier === 'client' && row.brainStatus !== 'ready') {
    reasons.push({ key: 'client_onboarding', text: row.brainStatus === 'onboarding' ? 'Onboarding not finished' : 'Client Brain not started' });
  }
  return reasons;
}
