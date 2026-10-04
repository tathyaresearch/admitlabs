// Fixes the sample owners marked done (Home's "Mark as done"). The seed adds them before the
// Audits run, so each own Audit after a mark checks it through the live path:
//   Northbank College marked its enquiry buttons and its BBA fees done in August. Its September
//   free Audit found the first (Weak to Okay) but not the second.
//   Eastgate University marked its placement results done after its September Audit; its next
//   Audit checks them once the team approves it (it waits in To review).
//   Eastgate also marked an unanswered Quora question about MBA hostels done in August. It was
//   answered, and its September Audit no longer found it: the finding mark is confirmed.

import type { CheckKey } from '../domain/types.ts';

export type SampleMark = { slug: string; /** India date. */ markedOn: string } & ({ check: CheckKey; finding?: never } | { finding: string; check?: never });

export const SAMPLE_MARKS: readonly SampleMark[] = [
  { slug: 'northbank-college', check: 'easy_enquiry', markedOn: '2026-08-20' },
  { slug: 'northbank-college', check: 'fees_shown', markedOn: '2026-08-26' },
  { slug: 'eastgate-university', check: 'placement_proof', markedOn: '2026-09-22' },
  { slug: 'eastgate-university', finding: 'eastgate-quora-mba-hostel', markedOn: '2026-08-18' },
];

/**
 * Make these 3 the sample owners marked as made, by month and rank as picked (spec section 20):
 * Eastgate made 2 of August's 3. The third is still rising in September, so its Demand page says so.
 */
export const SAMPLE_MADE: ReadonlyArray<{ slug: string; month: string; rank: number; markedOn: string }> = [
  { slug: 'eastgate-university', month: '2026-08', rank: 1, markedOn: '2026-09-04' },
  { slug: 'eastgate-university', month: '2026-08', rank: 3, markedOn: '2026-09-17' },
];

/**
 * People who have used Drishti for months and closed Start here long ago. Everyone else sees it
 * on Home after their first Audit (Northbank's and Silverline's owners, in the sample).
 */
export const SAMPLE_GUIDE_CLOSED: readonly string[] = ['owner@eastgate-university.example', 'member@eastgate-university.example', 'owner@brightpath-skills.example'];
