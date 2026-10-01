// The sample monthly report the product page offers: Eastgate University's August 2026 report,
// made on 1 September, from the sample world in memory (see ./world.ts), exactly as the report
// job would make it from the seeded database. Marked "Sample report. Fictional data." on the cover
// and every page. Rendering the PDF is left to the caller, so this stays light to import.

import { istDate, istParts } from '../domain/dates.ts';
import { buildReport, type ReportData, type ReportInput } from '../report/data.ts';
import { monthEnd, reportDayOf } from '../report/schedule.ts';
import { mondayOf } from '../rivals/schedule.ts';
import { EMPTY_INSTITUTION_DETAILS } from '../domain/details.ts';
import { SAMPLE_INSTITUTION_DETAILS, SAMPLE_PROGRAM_DETAILS } from './details.ts';
import { programId } from './ids.ts';
import { sampleInstitution, SAMPLE_WEEKLY_CHECKS_FROM } from './index.ts';
import { historyOf, sampleAuditChain, sampleDemand, sampleMoves, sampleRivalLessons, sampleRivals, scoresOf, storedAudit } from './world.ts';

export const SAMPLE_REPORT = { slug: 'eastgate-university', month: '2026-08' } as const;

const DAY_MS = 86_400_000;

/** The last weekly rival check (Mondays, 9 am India time) before `cut`. */
function lastWeeklyCheck(cut: Date): string | null {
  let check = istDate(mondayOf(new Date(cut.getTime() - 1)), 9);
  if (check.getTime() >= cut.getTime()) check = new Date(check.getTime() - 7 * DAY_MS);
  return check.getTime() >= istDate(SAMPLE_WEEKLY_CHECKS_FROM, 9).getTime() ? check.toISOString() : null;
}

export async function sampleReportInput(): Promise<ReportInput> {
  const { slug, month } = SAMPLE_REPORT;
  const sample = sampleInstitution(slug);
  const cut = monthEnd(month);
  // The month's last day, India time: everything known by the end of the month.
  const until = `${month}-${String(istParts(new Date(cut.getTime() - 1)).day).padStart(2, '0')}`;

  const [own, rivals, lessons, demand] = await Promise.all([
    sampleAuditChain(slug, 'own', until),
    sampleRivals(slug, until),
    sampleRivalLessons(slug, until),
    sampleDemand(slug, month),
  ]);
  const latest = own[own.length - 1];
  if (!latest) throw new Error(`No sample Audit of ${slug} by ${until}.`);

  return {
    institution: { id: latest.institution.id, name: sample.name, type: sample.type, city: sample.city, state: sample.state, website: sample.website },
    tier: 'paid',
    month,
    madeAt: reportDayOf(month),
    audit: storedAudit(latest.record, { id: latest.id, previousAuditId: own[own.length - 2]?.id ?? null }),
    programNames: latest.names,
    history: historyOf(own),
    rivals: rivals.map((rival) => ({
      id: rival.id,
      name: rival.name,
      audit: rival.audit
        ? {
            runAt: rival.audit.record.run_at,
            scores: scoresOf(rival.audit.record),
            changes: {
              overall: rival.audit.record.overall_change,
              discovered: rival.audit.record.discovered_change,
              trusted: rival.audit.record.trusted_change,
              chosen: rival.audit.record.chosen_change,
            },
          }
        : null,
    })),
    moves: sampleMoves(
      rivals.map((rival) => rival.slug),
      istDate(`${month}-01`),
      new Date(cut.getTime() - 1),
    ).map((move) => ({ rivalId: move.rivalId, kind: move.kind, description: move.description, detectedAt: move.detectedAt })),
    lessons,
    lastRivalCheck: lastWeeklyCheck(cut),
    demand,
    sample: true,
    // What Eastgate added about itself in Settings, as in the seeded database.
    added: {
      institution: SAMPLE_INSTITUTION_DETAILS[slug] ?? EMPTY_INSTITUTION_DETAILS,
      programs: new Map(SAMPLE_PROGRAM_DETAILS.filter((entry) => entry.slug === slug).map((entry) => [programId(slug, entry.programKey), entry.details])),
    },
  };
}

/** What the sample report prints. */
export async function sampleReportData(): Promise<ReportData> {
  return buildReport(await sampleReportInput());
}
