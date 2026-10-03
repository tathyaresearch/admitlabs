// Fixes the sample owners marked done (Home's "Mark as done"). The seed adds them before the
// Audits run, so each own Audit after a mark checks it through the live path:
//   Northbank College marked its enquiry buttons and its BBA fees done in August. Its September
//   free Audit found the first (Weak to Okay) but not the second.
//   Eastgate University marked its placement results done after its September Audit; its next
//   Audit checks them.

import type { CheckKey } from '../domain/types.ts';

export interface SampleMark {
  slug: string;
  check: CheckKey;
  /** India date. */
  markedOn: string;
}

export const SAMPLE_MARKS: readonly SampleMark[] = [
  { slug: 'northbank-college', check: 'easy_enquiry', markedOn: '2026-08-20' },
  { slug: 'northbank-college', check: 'fees_shown', markedOn: '2026-08-26' },
  { slug: 'eastgate-university', check: 'placement_proof', markedOn: '2026-09-22' },
];

/**
 * People who have used Drishti for months and closed Start here long ago. Everyone else sees it
 * on Home after their first Audit (Northbank's and Silverline's owners, in the sample).
 */
export const SAMPLE_GUIDE_CLOSED: readonly string[] = ['owner@eastgate-university.example', 'member@eastgate-university.example', 'owner@brightpath-skills.example'];
