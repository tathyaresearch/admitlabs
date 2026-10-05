// What the product page shows: one fictional institution in the month of the sample report
// (August 2026), so every picture on the page agrees with the PDF it offers. Worked out from the
// sample world in memory with the real scoring engine (src/sample/world.ts), the way the dashboard
// works it out for Paid: the Audit by place with the three words, Home's 3 things, the rivals in
// its city place by place with the month's one line, and Demand with Make these 3. Then shown under
// the website's names: the sample world's Eastgate University, Guwahati, is Larkmoor University,
// Bangalore, here (./larkmoor.ts). No database. Built once per server; the page is prerendered, so
// in practice once per build.

import { auditPlaces, type AuditPlacesView } from '../audit/places.ts';
import { auditVerdict } from '../audit/verdict.ts';
import { DEMAND_RULES } from '../config/demand.ts';
import { nextPullOn } from '../demand/schedule.ts';
import type { DemandSignals, TrendRow } from '../demand/signals.ts';
import { PLATFORM_LABELS, platformOf } from '../demand/text.ts';
import { istDate } from '../domain/dates.ts';
import type { InstitutionType, Place } from '../domain/types.ts';
import type { Highlight } from '../lib/demand/load.ts';
import type { RivalMove } from '../lib/home/load.ts';
import { buildReport, reportSides, type ReportData } from '../report/data.ts';
import { monthEnd } from '../report/schedule.ts';
import { threeThings, type MonthPick, type Thing } from '../report/things.ts';
import { openingPlace, rivalPlaces, type RivalPlacesView } from '../rivals/places.ts';
import { DEMAND_MONTHS } from '../sample/demand.ts';
import { SAMPLE_RIVALS } from '../sample/index.ts';
import { SAMPLE_REPORT, sampleReportInput } from '../sample/report.ts';
import { sampleDemand, sampleMoves } from '../sample/world.ts';
import { asLarkmoor } from './larkmoor.ts';

export interface MonthCount {
  month: string;
  count: number;
}

export interface Showcase {
  institution: { id: string; name: string; type: InstitutionType; city: string };
  /** When the Audit ran. */
  checkedAt: string;
  /** The one line from the three words, as Home starts. */
  answer: string;
  /** The Audit by place: the three words, Fix these first, the five places. */
  audit: AuditPlacesView;
  /** Home's Do these 3 things this month: a fix, a lesson from rivals and one of Make these 3. */
  things: Thing[];
  rivals: {
    /** The month's one line. */
    line: string | null;
    /** The ranking and place by place, you among your rivals. */
    view: RivalPlacesView;
    /** The place the Rivals page opens on: where the one ahead leads you most. */
    opened: Place;
    /** The latest move of the month, as Home names it. */
    latest: RivalMove | null;
  };
  demand: {
    place: string;
    signals: DemandSignals;
    /** The month's Make these 3, in their order. */
    picks: MonthPick[];
    /** Home's demand highlight: the fastest rise for the programs, and its searches by month. */
    highlight: Highlight | null;
    history: MonthCount[];
    /** When Demand updates next, as Home says it. */
    nextUpdate: string;
  };
  /** The sample report, for the page's pictures of it and the PDF the page offers. */
  report: ReportData;
}

export interface AskedMost {
  key: string;
  text: string;
  count: number;
  /** Where it was asked: "Quora". */
  site: string;
  program: string;
}

/** The questions students ask most, across the programs, each once and most first, with the site each was asked on. Only counted ones. */
export function topQuestions(signals: DemandSignals, limit: number): AskedMost[] {
  const all = signals.asks
    .flatMap((program) => [...program.topics.flatMap((topic) => topic.questions), ...program.other].map((question) => ({ question, program: program.programName })))
    .filter(({ question }) => question.count !== null)
    .sort((a, b) => (b.question.count ?? 0) - (a.question.count ?? 0) || a.question.text.localeCompare(b.question.text));
  const unique = all.filter(({ question }, index) => all.findIndex((other) => other.question.text === question.text) === index);
  return unique.slice(0, limit).map(({ question, program }) => ({
    key: question.key,
    text: question.text,
    count: question.count ?? 0,
    site: PLATFORM_LABELS[question.platform ?? platformOf(question.sourceUrl) ?? ''] ?? 'Forums',
    program,
  }));
}

/** A trend's searches in each month's pull up to `month`, oldest first, found the way Home finds them (src/demand/read.ts). */
async function sampleTopicHistory(trend: TrendRow, scope: 'city' | 'state', month: string): Promise<MonthCount[]> {
  const months = DEMAND_MONTHS.filter((each) => each <= month).slice(-DEMAND_RULES.historyMonths);
  const pulls = await Promise.all(months.map(async (each) => ({ month: each, rows: (await sampleDemand(SAMPLE_REPORT.slug, each, scope)).rows })));
  return pulls.flatMap((pull) => {
    const row = pull.rows.find((entry) => entry.programKey === trend.programKey && entry.kind === 'rising' && entry.text === trend.text);
    return row && row.count !== null ? [{ month: pull.month, count: row.count }] : [];
  });
}

/** Home's highlight, as demand_highlight() picks it: the fastest rise across the programs' pulls. */
function highlightOf(trend: TrendRow, month: string): Highlight {
  return {
    text: trend.text,
    changePct: trend.changePct,
    count: trend.searches,
    countSource: trend.searchesUrl,
    sourceUrl: trend.sourceUrl,
    foundAt: trend.foundAt,
    programName: trend.programName,
    region: trend.region,
    month,
  };
}

async function build(): Promise<Showcase> {
  const input = await sampleReportInput();
  const { institution, audit, month } = input;
  const previous = [...input.history].reverse().find((row) => row.runAt < audit.runAt) ?? null;
  const view = auditPlaces(audit, input.findings, {
    institutionType: institution.type,
    city: institution.city,
    programNames: input.programNames,
    previousRunAt: previous?.runAt ?? null,
  });
  const rivalNames = new Map(input.rivals.map((rival) => [rival.id, rival.name]));
  const places = rivalPlaces(reportSides(input));

  const rivalSlugs = SAMPLE_RIVALS.filter(([tracker]) => tracker === SAMPLE_REPORT.slug).map(([, rival]) => rival);
  const [move] = sampleMoves(rivalSlugs, istDate(`${month}-01`), new Date(monthEnd(month).getTime() - 1));

  const signals = input.demand.signals;
  if (!signals?.month) throw new Error('The sample report has no Demand.');
  const top = signals.trends.find((trend) => trend.kind === 'rising') ?? null;

  return asLarkmoor<Showcase>({
    institution: { id: institution.id, name: institution.name, type: institution.type, city: institution.city },
    checkedAt: audit.runAt,
    answer: auditVerdict(audit.scores),
    audit: view,
    things: threeThings({ fixes: view.fixes, lessons: input.lessons, picks: input.picks, rivalNames }),
    rivals: {
      line: input.line,
      view: places,
      opened: openingPlace(places, institution.id),
      latest: move ? { ...move, id: 'move-0', rivalName: rivalNames.get(move.rivalId) ?? 'A rival' } : null,
    },
    demand: {
      place: institution.city,
      signals,
      picks: [...input.picks].sort((a, b) => a.rank - b.rank),
      highlight: top ? highlightOf(top, signals.month) : null,
      history: top ? await sampleTopicHistory(top, top.region === institution.city ? 'city' : 'state', month) : [],
      nextUpdate: nextPullOn(input.madeAt).toISOString(),
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
