// "Let AdmitLabs fix this" in the sample world (spec 20): one open request and one the team has
// handled. Each lands in the team's Enquiries with the college and which fix.

import { checkFixKey } from '../domain/fix-key.ts';

export interface SampleFixRequest {
  slug: string;
  fixKey: string;
  /** The fix's name, as the college saw it. */
  fixTitle: string;
  /** India date the owner asked. */
  askedOn: string;
  /** India date the team marked it handled, or null while it is open. */
  handledOn: string | null;
}

export const SAMPLE_FIX_REQUESTS: readonly SampleFixRequest[] = [
  { slug: 'eastgate-university', fixKey: checkFixKey('easy_enquiry'), fixTitle: 'Make it one tap to enquire', askedOn: '2026-09-24', handledOn: null },
  { slug: 'northbank-college', fixKey: checkFixKey('fees_shown'), fixTitle: 'Show your full BBA fees', askedOn: '2026-09-12', handledOn: '2026-09-14' },
];
