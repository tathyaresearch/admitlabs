// Test support only: a sample institution's Audit through the live path (mock providers, then the
// scoring engine; see src/sample/world.ts), read back the way a viewer would. Used by the Audit,
// report and team tests; the app never imports it.

import { sampleAudit, storedAudit, storedFindingsOf } from '../sample/world.ts';
import type { StoredFinding } from './places.ts';
import type { AuditRecord } from './record.ts';
import type { StoredAudit } from './view.ts';

/** A Paid Audit of a sample institution on a day, every program unless `programKeys` names some. */
export async function recordFor(slug: string, day: string, programKeys?: readonly string[]) {
  return sampleAudit(slug, day, { programKeys });
}

/** The record as a viewer reads it back. `freeDetails` hides details outside the top 3, as the database does for Free. */
export function stored(record: AuditRecord, options: { freeDetails?: boolean; previousAuditId?: string | null } = {}): StoredAudit {
  return storedAudit(record, options);
}

/** The record's findings as a viewer reads them back. `freeTop` keeps those among the top 3 fixes only, as the database does for Free. */
export function findingsOf(record: AuditRecord, options: { freeTop?: boolean } = {}): StoredFinding[] {
  return storedFindingsOf(record, options);
}
