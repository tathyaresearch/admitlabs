// Sample share links (spec section 13). The team shared Cedar's Audit the day after running it,
// so a live shared Audit can be opened right after `npm run db:reset`, without signing in.

import { createHash } from 'node:crypto';

export const SAMPLE_SHARES: ReadonlyArray<{ slug: string; createdAt: string }> = [{ slug: 'cedar-skill-institute', createdAt: '2026-09-19' }];

/** A stable token for a sample link, so its address survives a reset. Real links get random tokens. */
export function sampleToken(slug: string): string {
  return createHash('sha256').update(`drishti-sample-v1:share:${slug}`).digest('hex').slice(0, 32);
}
