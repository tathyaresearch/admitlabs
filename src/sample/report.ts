// The sample monthly report the product page offers: Eastgate University's August 2026 report,
// made on 1 September, from the sample world in memory (see ./world.ts), exactly as the report
// job would make it from the seeded database: the latest approved Audit with its findings, each
// rival's Audit, the month's one line, moves and lessons, the city's Demand (the state filling
// in) and the month's Make these 3. Marked "Sample report. Fictional data." on the cover and
// every page. Rendering the PDF is left to the caller, so this stays light to import.

import { hasTooLittle } from '../demand/items.ts';
import { pickThree } from '../demand/picks.ts';
import { pullDayOf } from '../demand/schedule.ts';
import { demandSignals, programSources, type DemandSignals, type RegionRows } from '../demand/signals.ts';
import type { DemandRow } from '../demand/view.ts';
import { istDate, istParts } from '../domain/dates.ts';
import { EMPTY_INSTITUTION_DETAILS } from '../domain/details.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';
import { mockAnalysis } from '../providers/mock/index.ts';
import { buildReport, type ReportData, type ReportInput } from '../report/data.ts';
import { monthEnd, reportDayOf } from '../report/schedule.ts';
import type { MonthPick } from '../report/things.ts';
import { compareChecks } from '../rivals/compare.ts';
import { lineFacts } from '../rivals/line.ts';
import { mondayOf } from '../rivals/schedule.ts';
import { SAMPLE_INSTITUTION_DETAILS, SAMPLE_PROGRAM_DETAILS } from './details.ts';
import { programId } from './ids.ts';
import { sampleInstitution, SAMPLE_WEEKLY_CHECKS_FROM } from './index.ts';
import {
  checkScoresOf,
  historyOf,
  sampleAuditChain,
  sampleDemand,
  sampleMoves,
  sampleRivalLessons,
  sampleRivals,
  scoresOf,
  storedAudit,
  storedFindingsOf,
  type SampleAudit,
  type SampleRival,
} from './world.ts';

export const SAMPLE_REPORT = { slug: 'eastgate-university', month: '2026-08' } as const;

const DAY_MS = 86_400_000;

/** The last weekly rival check (Mondays, 9 am India time) before `cut`. */
function lastWeeklyCheck(cut: Date): string | null {
  let check = istDate(mondayOf(new Date(cut.getTime() - 1)), 9);
  if (check.getTime() >= cut.getTime()) check = new Date(check.getTime() - 7 * DAY_MS);
  return check.getTime() >= istDate(SAMPLE_WEEKLY_CHECKS_FROM, 9).getTime() ? check.toISOString() : null;
}

/** The month's Demand as the Demand page reads it: each program's city pull, or its state's where the city has too little. */
export async function sampleDemandSignals(slug: string, month: string): Promise<DemandSignals> {
  const sample = sampleInstitution(slug);
  const [city, state] = await Promise.all([sampleDemand(slug, month, 'city'), sampleDemand(slug, month, 'state')]);
  const covered = sample.programs.map((program) => ({ id: programId(slug, program.programKey), name: program.name, programKey: program.programKey }));
  const regionRows = (pull: { region: { region: string; scope: string }; rows: DemandRow[]; pulledAt: string }): RegionRows => ({
    region: pull.region.region,
    rows: pull.rows,
    pulls: new Map(
      covered.map((program) => [
        program.programKey,
        {
          month,
          pulledAt: pull.pulledAt,
          tooLittle: pull.region.scope === 'city' && hasTooLittle(pull.rows.filter((row) => row.programKey === program.programKey && row.kind !== 'idea')),
        },
      ]),
    ),
  });
  return demandSignals(
    programSources(covered, regionRows(city), regionRows(state)),
    sample.programs.map((program) => program.name),
  );
}

/** The month's Make these 3, picked with the month's update from what the latest Audit before it answers. */
export function sampleMonthPicks(slug: string, month: string, signals: DemandSignals, audit: SampleAudit | undefined): MonthPick[] {
  const answers = new Map<string, Map<CheckKey, CheckResult>>();
  for (const check of audit?.record.checks ?? []) {
    if (!check.program_id) continue;
    const entry = answers.get(check.program_id) ?? new Map<CheckKey, CheckResult>();
    entry.set(check.check_key, check.result);
    answers.set(check.program_id, entry);
  }
  return pickThree({ ideas: signals.ideas, answers: audit ? answers : null, freeProgramId: null, before: new Set(), institutionName: sampleInstitution(slug).name }).map((pick) => ({
    month,
    rank: pick.rank,
    idea: pick.idea,
  }));
}

/** The month's one line about rivals, as the rival job writes it. */
async function sampleLine(slug: string, own: SampleAudit, rivals: readonly SampleRival[]): Promise<string | null> {
  const sample = sampleInstitution(slug);
  const yours = checkScoresOf(own);
  const facts = lineFacts(
    rivals.flatMap((rival) => (rival.audit ? [{ id: rival.id, name: rival.name, overall: rival.audit.record.overall, comparisons: compareChecks(yours, checkScoresOf(rival.audit)) }] : [])),
  );
  if (!facts) return null;
  return mockAnalysis.rivalLine({ institutionType: sample.type, city: sample.city, allLocal: rivals.every((rival) => sampleInstitution(rival.slug).city === sample.city), facts });
}

export async function sampleReportInput(): Promise<ReportInput> {
  const { slug, month } = SAMPLE_REPORT;
  const sample = sampleInstitution(slug);
  const cut = monthEnd(month);
  // The month's last day, India time: everything known by the end of the month.
  const until = `${month}-${String(istParts(new Date(cut.getTime() - 1)).day).padStart(2, '0')}`;

  const [own, rivals, lessons, signals] = await Promise.all([sampleAuditChain(slug, 'own', until), sampleRivals(slug, until), sampleRivalLessons(slug, until), sampleDemandSignals(slug, month)]);
  const latest = own[own.length - 1];
  if (!latest) throw new Error(`No sample Audit of ${slug} by ${until}.`);
  const histories = await Promise.all(rivals.map((rival) => sampleAuditChain(rival.slug, 'rival', until)));
  // The picks were made on the pull day, from the latest Audit before it.
  const pickedAt = pullDayOf(month).getTime();
  const answeredBy = [...own].reverse().find((audit) => new Date(audit.record.run_at).getTime() <= pickedAt);

  return {
    institution: { id: latest.institution.id, name: sample.name, type: sample.type, city: sample.city, state: sample.state, website: sample.website },
    tier: 'paid',
    month,
    madeAt: reportDayOf(month),
    audit: storedAudit(latest.record, { id: latest.id, previousAuditId: own[own.length - 2]?.id ?? null }),
    findings: storedFindingsOf(latest.record),
    programNames: latest.names,
    history: historyOf(own),
    yourChecks: checkScoresOf(latest),
    rivals: rivals.map((rival, index) => ({
      id: rival.id,
      name: rival.name,
      nearby: sampleInstitution(rival.slug).city !== sample.city,
      audit: rival.audit ? { runAt: rival.audit.record.run_at, scores: scoresOf(rival.audit.record), checks: checkScoresOf(rival.audit), findings: storedFindingsOf(rival.audit.record) } : null,
      history: (histories[index] ?? []).map((audit) => ({ runAt: audit.record.run_at, overall: audit.record.overall })),
    })),
    line: await sampleLine(slug, latest, rivals),
    moves: sampleMoves(
      rivals.map((rival) => rival.slug),
      istDate(`${month}-01`),
      new Date(cut.getTime() - 1),
    ).map((move) => ({ rivalId: move.rivalId, kind: move.kind, description: move.description, detectedAt: move.detectedAt })),
    lessons,
    lastRivalCheck: lastWeeklyCheck(cut),
    picks: sampleMonthPicks(slug, month, signals, answeredBy),
    demand: { place: sample.city, signals },
    leads: null,
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
