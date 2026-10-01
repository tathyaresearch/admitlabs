// What the product page shows: one fictional institution, Eastgate University, in the month of the
// sample report (August 2026), so every preview on the page agrees with the PDF it offers. Worked
// out from the sample world in memory with the real scoring engine (src/sample/world.ts). No
// database. Built once per server; the page is prerendered, so in practice once per build.

import { historyByMonth, overviewView, type AuditView } from '../audit/view.ts';
import { regionPlace } from '../demand/regions.ts';
import { demandView, type DemandView } from '../demand/view.ts';
import { istDate, monthKey } from '../domain/dates.ts';
import type { InstitutionType } from '../domain/types.ts';
import { buildReport, type ReportData } from '../report/data.ts';
import { monthEnd } from '../report/schedule.ts';
import { ladder, type LadderRow } from '../rivals/compare.ts';
import { rivalsVerdict } from '../rivals/verdict.ts';
import { SAMPLE_RIVALS } from '../sample/index.ts';
import { SAMPLE_REPORT, sampleReportInput } from '../sample/report.ts';
import { sampleMoves, type SampleMoveRow } from '../sample/world.ts';

export interface Showcase {
  institution: { id: string; name: string; type: InstitutionType; city: string };
  audit: AuditView;
  /** For the picture of Home: when the Audit ran, and the overall score by month. */
  home: { checkedAt: string; trend: Array<{ month: string; score: number }> };
  rivals: {
    rows: LadderRow[];
    verdict: string;
    /** The month's moves, newest first, as the Rivals page lists them. */
    moves: Array<SampleMoveRow & { id: string }>;
    names: ReadonlyMap<string, string>;
  };
  demand: { view: DemandView; place: string; today: Date };
  /** The sample report, for the page previews of it. */
  report: ReportData;
}

async function build(): Promise<Showcase> {
  const input = await sampleReportInput();
  const { institution, audit } = input;
  const scored = input.rivals.flatMap((rival) => (rival.audit ? [{ name: rival.name, scores: rival.audit.scores }] : []));
  const rivalSlugs = SAMPLE_RIVALS.filter(([tracker]) => tracker === SAMPLE_REPORT.slug).map(([, rival]) => rival);
  const moves = sampleMoves(rivalSlugs, istDate(`${input.month}-01`), new Date(monthEnd(input.month).getTime() - 1));

  return {
    institution: { id: institution.id, name: institution.name, type: institution.type, city: institution.city },
    audit: overviewView(audit, { institutionType: institution.type, programNames: input.programNames }),
    home: { checkedAt: audit.runAt, trend: historyByMonth(input.history, (runAt) => monthKey(new Date(runAt))) },
    rivals: {
      rows: ladder(
        { id: institution.id, name: institution.name, overall: audit.scores.overall, change: audit.changes.overall },
        input.rivals.map((rival) => ({ id: rival.id, name: rival.name, overall: rival.audit?.scores.overall ?? null, change: rival.audit?.changes.overall ?? null })),
      ),
      verdict: rivalsVerdict(audit.scores, scored),
      moves: moves.map((move, index) => ({ ...move, id: `move-${index}` })),
      names: new Map(input.rivals.map((rival) => [rival.id, rival.name])),
    },
    demand: {
      view: demandView(input.demand.rows, { singleProgram: false, skills: institution.type === 'skilling' }),
      place: regionPlace(input.demand.region),
      today: input.demand.pulledAt ? new Date(input.demand.pulledAt) : input.madeAt,
    },
    report: buildReport(input),
  };
}

let showcase: Promise<Showcase> | null = null;

export function loadShowcase(): Promise<Showcase> {
  showcase ??= build().catch((error: unknown) => {
    showcase = null;
    throw error;
  });
  return showcase;
}
