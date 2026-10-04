// Test support only: what shared_audit() sends for a live link, built from a sample institution's
// Audit through the live path. Used by the share and Audit PDF tests; the app never imports it.

import { findingsOf, recordFor, stored } from '../audit/testing.ts';
import type { StoredFinding } from '../audit/places.ts';
import type { StoredAudit } from '../audit/view.ts';
import { istDate } from '../domain/dates.ts';
import type { InstitutionRef } from '../providers/types.ts';
import { parseSharedLink, type SharedAudit } from './share.ts';

type Place = Pick<InstitutionRef, 'name' | 'type' | 'city' | 'state' | 'website'>;

const RIVERBEND: Place = { name: 'Riverbend College', type: 'college', city: 'Jorhat', state: 'Assam', website: 'https://riverbend-college.example' };

/** What shared_audit() sends for a live link: every check and finding, how to fix only for the top 3 fixes. */
export function sharedPayload(audit: StoredAudit, names: ReadonlyMap<string, string>, institution: Place = RIVERBEND, findings: readonly StoredFinding[] = []) {
  const top = (rank: number | null) => (rank ?? 99) <= 3;
  return {
    status: 'live',
    sharedAt: istDate('2026-09-19', 11).toISOString(),
    expiresAt: istDate('2026-12-18', 11).toISOString(),
    institution: { name: institution.name, type: institution.type, city: institution.city, state: institution.state, website: institution.website },
    audit: { id: audit.id, runAt: audit.runAt, programCount: audit.programCount, ...audit.scores },
    programs: audit.programs.map((program) => ({ id: program.programId, name: names.get(program.programId), ...program.scores })),
    checks: audit.checks.map((check) => ({
      id: check.id,
      programId: check.programId,
      pillar: check.pillar,
      key: check.key,
      result: check.result,
      // Postgres sends numeric points as text.
      pointsAwarded: String(check.pointsAwarded),
      pointsMax: check.pointsMax,
      strengthRank: check.strengthRank,
      fixRank: check.fixRank,
      checkedAt: check.checkedAt,
      finding: check.detail?.finding,
      sourceUrl: check.detail?.sourceUrl,
      fixTitle: check.detail?.fixTitle ?? null,
      whyItMatters: top(check.fixRank) ? check.detail?.whyItMatters : null,
      howToFix: top(check.fixRank) ? check.detail?.howToFix : null,
      fixSteps: top(check.fixRank) ? check.detail?.fixSteps : null,
      readyFix: top(check.fixRank) ? (check.detail?.readyFix ?? null) : null,
      difficulty: top(check.fixRank) ? check.detail?.difficulty : null,
    })),
    findings: findings.map((finding) => ({
      id: finding.id,
      place: finding.place,
      kind: finding.kind,
      findingKey: finding.findingKey,
      line: finding.line,
      sourceName: finding.sourceName,
      sourceUrl: finding.sourceUrl,
      checkedAt: finding.checkedAt,
      repeats: finding.repeats,
      listing: finding.listing,
      fixTitle: finding.fix?.title ?? null,
      effort: finding.fix?.effort ?? null,
      impact: finding.fix?.impact ?? null,
      fixRank: finding.fixRank,
      fixWhy: top(finding.fixRank) ? (finding.fix?.why ?? null) : null,
      fixSteps: top(finding.fixRank) ? (finding.fix?.steps ?? null) : null,
      readyFix: top(finding.fixRank) ? (finding.fix?.readyFix ?? null) : null,
    })),
  };
}

/** A sample institution's team Audit, as a live link shows it. */
export async function sampleShared(slug = 'riverbend-college', day = '2026-09-18'): Promise<SharedAudit> {
  const { record, names, institution } = await recordFor(slug, day);
  const shared = parseSharedLink(sharedPayload(stored(record), names, institution, findingsOf(record)));
  if (shared?.status !== 'live') throw new Error(`Expected a live shared Audit for ${slug}.`);
  return shared;
}
