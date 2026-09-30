// Run schedules by tier (spec section 11). Monthly runs fall on the same day of the
// month as the signup or plan start date. In this build every run uses mock providers.

import type { Tier } from '../domain/types.ts';

interface TierSchedule {
  /** Months between Audits. */
  auditEveryMonths: number;
  /** Extra manual refresh on top of the schedule. */
  manualRefresh: 'none' | 'once_a_month' | 'anytime_by_team';
  /** Days between rival move checks, or null when not tracked. */
  rivalMovesEveryDays: number | null;
  rivalMoveAlerts: boolean;
  demandEveryMonths: number;
  demandSpikeAlerts: boolean;
}

export const SCHEDULES: Readonly<Record<Tier, TierSchedule>> = {
  free: {
    auditEveryMonths: 3,
    manualRefresh: 'none',
    rivalMovesEveryDays: null,
    rivalMoveAlerts: false,
    demandEveryMonths: 1,
    demandSpikeAlerts: false,
  },
  paid: {
    auditEveryMonths: 1,
    manualRefresh: 'once_a_month',
    rivalMovesEveryDays: 7,
    rivalMoveAlerts: true,
    demandEveryMonths: 1,
    demandSpikeAlerts: true,
  },
  client: {
    auditEveryMonths: 1,
    manualRefresh: 'anytime_by_team',
    rivalMovesEveryDays: 7,
    rivalMoveAlerts: true,
    demandEveryMonths: 1,
    demandSpikeAlerts: true,
  },
};
