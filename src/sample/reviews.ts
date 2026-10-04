// Review before sending in the sample world (spec 20): one Audit the team approved after fixing a
// result. Northbank's September free Audit read its approvals as Okay; the certificates are linked
// on its About page, so the team made it Strong, said why, and wrote what was seen. Approved the
// next morning. The waiting ones are in SAMPLE_RUNS (Eastgate's refresh, Loomcraft's first Audit).

import type { CheckKey, CheckResult } from '../domain/types.ts';

export type SampleReviewChange =
  | { kind: 'result'; check: CheckKey; programKey: string | null; result: CheckResult; reason: string }
  | { kind: 'line'; check: CheckKey; programKey: string | null; field: 'finding'; value: string };

export interface SampleReview {
  slug: string;
  /** The Audit's day (India), as in SAMPLE_RUNS. */
  day: string;
  changes: readonly SampleReviewChange[];
  /** India date and hour the team approved it. */
  approvedOn: string;
  hour: number;
}

export const SAMPLE_REVIEWS: readonly SampleReview[] = [
  {
    slug: 'northbank-college',
    day: '2026-09-10',
    changes: [
      { kind: 'result', check: 'approvals', programKey: null, result: 'strong', reason: 'UGC, NAAC and AICTE are each linked to their certificates on the About page. The reader missed the links.' },
      { kind: 'line', check: 'approvals', programKey: null, field: 'finding', value: 'Shows UGC, NAAC and AICTE, each linked to its certificate on the About page.' },
    ],
    approvedOn: '2026-09-11',
    hour: 10,
  },
];
