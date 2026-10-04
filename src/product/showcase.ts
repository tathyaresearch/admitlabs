// What the product page shows: one fictional institution in the month of the sample report
// (August 2026), so every preview on the page agrees with the PDF it offers. Worked out from the
// sample world in memory with the real scoring engine (src/sample/world.ts), then shown under the
// website's names: the sample world's Eastgate University, Guwahati, is Larkmoor University,
// Bangalore, here (./larkmoor.ts). No database. Built once per server; the page is prerendered, so
// in practice once per build.

import { overviewView, scoresByMonth, type AuditView, type ScoreSet } from '../audit/view.ts';
import { DEMAND_RULES } from '../config/demand.ts';
import { regionPlace } from '../demand/regions.ts';
import { demandView, type DemandRow, type DemandView } from '../demand/view.ts';
import { istDate, monthKey } from '../domain/dates.ts';
import type { InstitutionType } from '../domain/types.ts';
import { buildReport, type ReportData } from '../report/data.ts';
import { monthEnd } from '../report/schedule.ts';
import { ladder, type LadderRow } from '../rivals/compare.ts';
import { pillarSpread, type PillarSpread } from '../rivals/trend.ts';
import { rivalsVerdict } from '../rivals/verdict.ts';
import { DEMAND_MONTHS } from '../sample/demand.ts';
import { SAMPLE_RIVALS } from '../sample/index.ts';
import { SAMPLE_REPORT, sampleReportInput } from '../sample/report.ts';
import { sampleDemand, sampleMoves, type SampleMoveRow } from '../sample/world.ts';
import { asLarkmoor } from './larkmoor.ts';

export interface Showcase {
  institution: { id: string; name: string; type: InstitutionType; city: string };
  audit: AuditView;
  /** For the picture of Home: when the Audit ran, and the scores by month. */
  home: { checkedAt: string; trend: Array<{ month: string; scores: ScoreSet }> };
  rivals: {
    rows: LadderRow[];
    /** You and every rival on each pillar, as the Rivals page draws them. */
    spread: PillarSpread[];
    verdict: string;
    /** The month's moves, newest first, as the Rivals page lists them. */
    moves: Array<SampleMoveRow & { id: string }>;
    names: ReadonlyMap<string, string>;
  };
  demand: {
    view: DemandView;
    place: string;
    today: Date;
    /** The fastest rise's searches in each month's pull, oldest first, as the Demand page draws them. */
    topHistory: Array<{ month: string; count: number }>;
  };
  /** The sample report, for the page previews of it and the PDF the page offers. */
  report: ReportData;
}

/** A topic's count in each month's pull up to `month`, found the way the dashboard finds it (src/demand/read.ts). */
async function sampleTopicHistory(topic: Pick<DemandRow, 'programKey' | 'kind' | 'text'>, month: string, current: readonly DemandRow[]): Promise<Array<{ month: string; count: number }>> {
  const months = DEMAND_MONTHS.filter((each) => each <= month).slice(-DEMAND_RULES.historyMonths);
  const pulls = await Promise.all(months.map(async (each) => ({ month: each, rows: each === month ? current : (await sampleDemand(SAMPLE_REPORT.slug, each)).rows })));
  return pulls.flatMap((pull) => {
    const row = pull.rows.find((entry) => entry.programKey === topic.programKey && entry.kind === topic.kind && entry.text === topic.text);
    return row && row.count !== null ? [{ month: pull.month, count: row.count }] : [];
  });
}

async function build(): Promise<Showcase> {
  const input = await sampleReportInput();
  const { institution, audit } = input;
  const demand = demandView(input.demand.rows, { singleProgram: false, skills: institution.type === 'skilling' });
  const scored = input.rivals.flatMap((rival) => (rival.audit ? [{ name: rival.name, scores: rival.audit.scores }] : []));
  const rivalSlugs = SAMPLE_RIVALS.filter(([tracker]) => tracker === SAMPLE_REPORT.slug).map(([, rival]) => rival);
  const moves = sampleMoves(rivalSlugs, istDate(`${input.month}-01`), new Date(monthEnd(input.month).getTime() - 1));

  return asLarkmoor<Showcase>({
    institution: { id: institution.id, name: institution.name, type: institution.type, city: institution.city },
    audit: overviewView(audit, { institutionType: institution.type, programNames: input.programNames }),
    home: { checkedAt: audit.runAt, trend: scoresByMonth(input.history, (runAt) => monthKey(new Date(runAt))) },
    rivals: {
      rows: ladder(
        { id: institution.id, name: institution.name, overall: audit.scores.overall, change: audit.changes.overall },
        input.rivals.map((rival) => ({ id: rival.id, name: rival.name, overall: rival.audit?.scores.overall ?? null, change: rival.audit?.changes.overall ?? null })),
      ),
      spread: pillarSpread(
        { id: institution.id, name: institution.name, scores: audit.scores },
        input.rivals.map((rival) => ({ id: rival.id, name: rival.name, scores: rival.audit?.scores ?? null })),
      ),
      verdict: rivalsVerdict(audit.scores, scored),
      moves: moves.map((move, index) => ({ ...move, id: `move-${index}` })),
      names: new Map(input.rivals.map((rival) => [rival.id, rival.name])),
    },
    demand: {
      view: demand,
      place: regionPlace(input.demand.region),
      today: input.demand.pulledAt ? new Date(input.demand.pulledAt) : input.madeAt,
      topHistory: demand.topTrend ? await sampleTopicHistory(demand.topTrend, input.month, input.demand.rows) : [],
    },
    report: buildReport(input),
  });
}

let showcase: Promise<Showcase> | null = null;

export function loadShowcase(): Promise<Showcase> {
  showcase ??= build().catch((error: unknown) => {
    showcase = null;
    throw error;
  });
  return showcase;
}
