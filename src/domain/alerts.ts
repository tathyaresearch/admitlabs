// What arrives in Notifications, and when (A8): said when the list is empty, and as a short guide
// while it is still short. Free hears about its next free Audit; Paid and Client also get their
// rivals' moves, big jumps in what students search for, and the monthly summary and report. Pure.

import { formatDate } from './format.ts';
import type { Tier } from './types.ts';

export interface AlertsAheadInput {
  tier: Tier;
  /** The next Audit and the plan it runs on, when known. */
  nextAudit: { on: Date; tier: Tier } | null;
  hasRivals: boolean;
  city: string;
  /** The next Demand update. */
  nextUpdate: Date;
  /** The next monthly summary and report: null when the plan ends before it is made. */
  nextReport: Date | null;
}

export function alertsAhead(input: AlertsAheadInput): string[] {
  const audit = input.nextAudit
    ? `Your next ${input.nextAudit.tier === 'free' ? 'free ' : ''}Audit, on ${formatDate(input.nextAudit.on)}, and what moved in it.`
    : 'Your next Audit, and what moved in it.';
  if (input.tier === 'free') return [audit, "Paid adds your rivals' moves, big jumps in what students search for, and a monthly summary and report."];
  return [
    audit,
    input.hasRivals ? "Your rivals' moves, from the weekly check every Monday." : "Your rivals' moves, once you pick your rivals.",
    `Big jumps in what students in ${input.city} search for, after each update. The next is on ${formatDate(input.nextUpdate)}.`,
    ...(input.nextReport ? [`Your monthly summary and report, on ${formatDate(input.nextReport)}.`] : []),
  ];
}
