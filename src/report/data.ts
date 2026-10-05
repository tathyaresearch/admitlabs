// What goes into the monthly report (spec section 12), as one plain snapshot: every word and
// number the PDF prints, already worded. Built from what was known at the end of the month, in the
// spec's order:
//   1. Cover: the institution, the month, Visibility, Trust and Chosen.
//   2. This month in short: the monthly summary (section 24).
//   3. What the internet says: each place, what's good and what to fix, with proof.
//   4. What to fix: the top 5 in detail, the rest as a short ranked list.
//   5. Rivals: the month's one line, the ranking with the small score, place by place, alerts.
//   6. Demand: Make these 3, programs rising and falling, what students ask, the best months.
//   7. Leads (Client): the month's enquiries by link. Counts only.
//   8. Progress and sources: the score and the three words month by month, the sources and dates.
// Pure, so every rule here is tested without a database or a PDF.

import { auditPlaces, type FixView, type StoredFinding } from '../audit/places.ts';
import { progressMonths } from '../audit/progress.ts';
import { auditVerdict } from '../audit/verdict.ts';
import type { HistoryRow, StoredAudit } from '../audit/view.ts';
import { changeWords, countWords, filledInNote, LANGUAGE_TAGS, sourcesCaption } from '../demand/text.ts';
import type { DemandSignals } from '../demand/signals.ts';
import { addedByYou, type InstitutionDetails, type ProgramDetails } from '../domain/details.ts';
import { monthKey } from '../domain/dates.ts';
import { formatCount, formatDate, formatMonth, formatMonthName, formatMonthShort, hostAndPath, ordinal, plural } from '../domain/format.ts';
import { scoreLabel, type ScoreLabel } from '../domain/scores.ts';
import { EFFORT_LABELS, IDEA_FORMAT_LABELS, INSTITUTION_TYPE_LABELS, PILLARS, TIER_LABELS, type InstitutionType, type Place, type RivalMoveKind, type Tier } from '../domain/types.ts';
import type { CheckScore, ScoreSet } from '../rivals/compare.ts';
import { placeLeadText, rivalPlaces, type PlaceSide } from '../rivals/places.ts';
import { MOVE_KIND_LABELS } from '../rivals/text.ts';
import { fixDetailOf, fixRowOf, placesFor, reportWords, type ReportFix, type ReportFixRow, type ReportPlace, type ReportWord } from './places.ts';
import { buildSummary, type MonthlySummary, type SummaryLeads } from './summary.ts';
import { threeThings, type MonthPick, type RivalLesson } from './things.ts';

export const REPORT_LIMITS = {
  fixesInDetail: 5,
  /** The short ranked list after the top 5; the rest are counted. */
  moreFixes: 12,
  moves: 4,
  trends: 4,
  questions: 4,
  bestMonths: 4,
  progressMonths: 6,
  leadLinks: 8,
} as const;

/** The quiet line at the end, for Paid only (not Client). */
export const PAID_CONTACT = { text: 'Want AdmitLabs to do this for you?', email: 'hello@admitlabs.in' } as const;

/** Printed on the cover and every page of the sample report the product page offers. */
export const SAMPLE_REPORT_NOTE = 'Sample report. Fictional data.';

// Input: what the report job loads -----------------------------------------------------------

export interface ReportInstitution {
  id: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
}

export interface ReportRival {
  id: string;
  name: string;
  /** From another city than yours: "Nearby city". */
  nearby: boolean;
  /** Its latest rival Audit up to the end of the month, with every check and finding. */
  audit: { runAt: string; scores: ScoreSet; checks: readonly CheckScore[]; findings: readonly StoredFinding[] } | null;
  /** Its rival Audits up to the end of the month, for your place among them month by month. */
  history: ReadonlyArray<{ runAt: string; overall: number }>;
}

export interface ReportMove {
  rivalId: string;
  kind: RivalMoveKind;
  description: string;
  detectedAt: string;
}

/** A Client's tracking link: enquiries in the month and in the month before. Counts only. */
export interface ReportLeadLink {
  name: string;
  count: number;
  before: number;
}

export interface ReportInput {
  institution: ReportInstitution;
  tier: Exclude<Tier, 'free'>;
  /** 'YYYY-MM'. */
  month: string;
  madeAt: Date;
  /** The latest approved own Audit up to the end of the month, with every detail. */
  audit: StoredAudit;
  /** Its findings: What people say and Other places. */
  findings: readonly StoredFinding[];
  programNames: ReadonlyMap<string, string>;
  /** Approved own Audits up to the end of the month. */
  history: readonly HistoryRow[];
  /** Your Audit's checks as the rival comparison reads them. */
  yourChecks: readonly CheckScore[];
  rivals: readonly ReportRival[];
  /** The month's one line about rivals. */
  line: string | null;
  /** Moves found during the month. */
  moves: readonly ReportMove[];
  /** The month's Rivals 3 things to do, ranked. */
  lessons: readonly RivalLesson[];
  /** When the weekly check last ran on any rival, for the sources. */
  lastRivalCheck: string | null;
  /** The month's Make these 3. */
  picks: readonly MonthPick[];
  /** The city's Demand (the state filling in), as the Demand page reads it. Null when no program is covered. */
  demand: { place: string; signals: DemandSignals | null };
  /** A Client's tracking links; null for Paid. */
  leads: readonly ReportLeadLink[] | null;
  /** The summary as kept with the report, with any line the team fixed in a review. Built here when not given. */
  summary?: MonthlySummary | null;
  /** The product page's sample report, made from fictional sample data. */
  sample?: boolean;
  /** What the institution added about itself in Settings. Shown as added by them, never scored. */
  added?: { institution: InstitutionDetails; programs: ReadonlyMap<string, ProgramDetails> };
}

// Output: what the PDF prints ------------------------------------------------------------------

export interface RivalRankRow {
  name: string;
  you: boolean;
  nearby: boolean;
  place: number | null;
  overall: number | null;
  /** Visibility, Trust and Chosen, each out of 100 with its word. */
  words: Array<{ score: number; word: ScoreLabel }>;
}

export interface RivalPlaceCell {
  word: ScoreLabel | null;
  /** The share of the place's points, 0 to 1, for the bar. */
  share: number | null;
  leads: boolean;
  /** What people say and Other places: what was found, in words. */
  note: string | null;
}

export interface ReportData {
  institution: { name: string; place: string; website: string };
  month: string;
  monthLabel: string;
  /** "September". */
  monthName: string;
  madeAt: string;
  madeOn: string;
  tier: Exclude<Tier, 'free'>;
  tierLabel: string;
  checkedOn: string;
  /** The one line from the three words. */
  answer: string;
  words: ReportWord[];
  /** The score, small: on the summary page and in the progress table. */
  score: { overall: number; change: string | null };
  summary: MonthlySummary;
  places: ReportPlace[];
  fixes: ReportFix[];
  moreFixes: ReportFixRow[];
  /** Past the short list: in Drishti. */
  moreFixesCount: number;
  rivals: {
    line: string | null;
    ranking: RivalRankRow[];
    places: Array<{ key: Place; name: string; scored: boolean; lead: string; cells: RivalPlaceCell[] }>;
    moves: Array<{ rival: string; kind: string; text: string; date: string }>;
    moreMoves: number;
  } | null;
  demand: {
    place: string;
    caption: string;
    pulledOn: string | null;
    note: string | null;
    picks: Array<{ title: string; meta: string; weight: string | null; effort: string | null }>;
    /** `changePct` is the number behind the word, for the bar. */
    trends: Array<{ text: string; program: string; kind: 'rising' | 'falling'; word: string | null; change: string | null; changePct: number | null; searches: string | null }>;
    /** `asked` is the number behind the words, for the bar. */
    questions: Array<{ text: string; program: string; count: string; asked: number; language: string | null }>;
    bestMonths: Array<{ program: string; text: string }>;
  } | null;
  leads: { line: string; total: number; links: ReportLeadLink[]; moreLinks: number } | null;
  progress: Array<{ month: string; label: string; score: number; words: Array<{ score: number; word: ScoreLabel }>; change: string | null; place: string | null }>;
  /** Where everything was found, and when: each place's items carry their own source and date. */
  sources: Array<{ label: string; text: string }>;
  /** Paid only: "Want AdmitLabs to do this for you? hello@admitlabs.in". */
  contact: { text: string; email: string } | null;
  /** The sample report only: SAMPLE_REPORT_NOTE, on the cover and every page. */
  sample: string | null;
}

// Words -----------------------------------------------------------------------------------------

/** "Up 3", "Down 2", "No change". */
export function shortChange(change: number | null): string | null {
  if (change === null) return null;
  const rounded = Math.round(change);
  if (rounded === 0) return 'No change';
  return `${rounded > 0 ? 'Up' : 'Down'} ${Math.abs(rounded)}`;
}

/** "August", "December 2025" in another year, or "5 Sep 2026" within the report's own month. */
export function sinceWhen(previousRunAt: string, reportMonth: string): string {
  const key = monthKey(new Date(previousRunAt));
  if (key === reportMonth) return formatDate(previousRunAt);
  const [name = '', year = ''] = formatMonth(key).split(' ');
  return year === reportMonth.slice(0, 4) ? name : `${name} ${year}`;
}

/** "Up 3 since August", "No change since August". */
export function changeSince(change: number | null, since: string): string | null {
  const short = shortChange(change);
  if (short === null) return null;
  return short === 'No change' ? `No change since ${since}` : `${short} since ${since}`;
}

/** The month's enquiries, for the summary line. */
export function leadsFacts(links: readonly ReportLeadLink[]): SummaryLeads {
  const count = links.reduce((sum, link) => sum + link.count, 0);
  const before = links.reduce((sum, link) => sum + link.before, 0);
  const [top] = [...links].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { count, before, top: top && top.count > 0 ? { name: top.name, count: top.count } : null };
}

// The build ---------------------------------------------------------------------------------------

/** What the institution added that relates to a check's fix: its own details, or its first program's. */
function addedFor(fix: FixView, input: ReportInput): ReturnType<typeof addedByYou> {
  const added = input.added;
  if (!added || !fix.checkKey) return null;
  const programIds = new Map([...input.programNames.entries()].map(([id, name]) => [name, id]));
  const programName = fix.results.find((result) => result.program)?.program ?? null;
  const programId = programName ? programIds.get(programName) : undefined;
  return addedByYou(fix.checkKey, {
    institution: added.institution,
    program: programId ? (added.programs.get(programId) ?? null) : null,
    programName,
    institutionType: input.institution.type,
  });
}

/** You and each rival as place by place compares them: your Audit, and each rival's own. */
export function reportSides(input: Pick<ReportInput, 'institution' | 'audit' | 'yourChecks' | 'findings' | 'rivals'>): PlaceSide[] {
  const { institution, audit } = input;
  return [
    { id: institution.id, name: institution.name, you: true, nearby: false, scores: audit.scores, checks: input.yourChecks, findings: input.findings },
    ...input.rivals.map(
      (rival): PlaceSide => ({
        id: rival.id,
        name: rival.name,
        you: false,
        nearby: rival.nearby,
        scores: rival.audit?.scores ?? null,
        checks: rival.audit?.checks ?? [],
        findings: rival.audit?.findings ?? [],
      }),
    ),
  ];
}

function rivalsPart(input: ReportInput): ReportData['rivals'] {
  if (input.rivals.length === 0) return null;
  const sides = reportSides(input);
  const view = rivalPlaces(sides);
  const names = new Map(input.rivals.map((rival) => [rival.id, rival.name]));
  const moves = [...input.moves].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  return {
    line: input.line,
    ranking: view.ranking.map((row) => ({
      name: row.name,
      you: row.you,
      nearby: row.nearby,
      place: row.place,
      overall: row.overall,
      words: row.words.map((word) => ({ score: word.score, word: word.word })),
    })),
    places: view.places.map((place) => ({
      key: place.key,
      name: place.name,
      scored: place.scored,
      lead: placeLeadText(place, sides),
      cells: view.ranking.map((row) => {
        const cell = place.cells[row.id];
        return { word: cell?.word ?? null, share: cell?.share ?? null, leads: cell?.leads ?? false, note: cell?.note ?? null };
      }),
    })),
    moves: moves.slice(0, REPORT_LIMITS.moves).map((move) => ({ rival: names.get(move.rivalId) ?? 'A rival', kind: MOVE_KIND_LABELS[move.kind], text: move.description, date: formatDate(move.detectedAt) })),
    moreMoves: Math.max(0, moves.length - REPORT_LIMITS.moves),
  };
}

function demandPart(input: ReportInput): ReportData['demand'] {
  const signals = input.demand.signals;
  if (!signals?.month) return null;
  const questions = signals.asks
    .flatMap((program) => [...program.topics.flatMap((topic) => topic.questions), ...program.other].map((question) => ({ question, program: program.programName })))
    .sort((a, b) => (b.question.count ?? -1) - (a.question.count ?? -1) || a.question.text.localeCompare(b.question.text));
  // A question asked about two programs shows once, under the program it was asked about most.
  const unique = questions.filter(({ question }, index) => questions.findIndex((other) => other.question.text === question.text) === index);
  const covered = signals.sources.map((source) => source.program.name);
  const filled = signals.filledIn;
  const state = signals.sources.find((source) => source.scope === 'state')?.region ?? null;
  return {
    place: input.demand.place,
    caption: signals.platforms.length ? sourcesCaption(signals.platforms, signals.languages) : 'From public sources',
    pulledOn: signals.pulledAt ? formatDate(signals.pulledAt) : null,
    note: filled.length && state ? filledInNote(input.demand.place, state, filled, filled.length === covered.length) : null,
    picks: [...input.picks]
      .sort((a, b) => a.rank - b.rank)
      .map((pick) => ({
        title: pick.idea.title,
        meta: [pick.idea.format ? IDEA_FORMAT_LABELS[pick.idea.format] : null, pick.idea.programName].filter(Boolean).join(' · '),
        weight: pick.idea.why.split(/(?<=\.)\s+/)[0]?.trim() || null,
        effort: pick.idea.effort ? `Effort ${EFFORT_LABELS[pick.idea.effort]}` : null,
      })),
    trends: signals.trends.slice(0, REPORT_LIMITS.trends).map((trend) => ({
      text: trend.text,
      program: trend.programName,
      kind: trend.kind,
      word: trend.word,
      change: trend.changePct === null ? null : changeWords(trend.changePct),
      changePct: trend.changePct,
      searches: trend.searches === null ? null : `About ${formatCount(trend.searches)} searches a month`,
    })),
    questions: unique.slice(0, REPORT_LIMITS.questions).map(({ question, program }) => ({
      text: question.text,
      program,
      count: countWords('question', question.count),
      asked: question.count ?? 0,
      language: LANGUAGE_TAGS[question.language],
    })),
    bestMonths: signals.bestMonths.slice(0, REPORT_LIMITS.bestMonths).map((row) => ({ program: row.programName, text: row.text })),
  };
}

function progressPart(input: ReportInput): ReportData['progress'] {
  const months = progressMonths({
    history: input.history.filter((row) => monthKey(new Date(row.runAt)) <= input.month),
    monthOf: (runAt) => monthKey(new Date(runAt)),
    checks: new Map(),
    names: input.programNames,
    type: input.institution.type,
    rivals: input.rivals.length ? input.rivals.map((rival) => rival.history) : null,
  });
  return months.slice(-REPORT_LIMITS.progressMonths).map((row) => ({
    month: row.month,
    label: formatMonthShort(row.month),
    score: row.scores.overall,
    words: PILLARS.map((pillar) => ({ score: Math.round(row.scores[pillar]), word: scoreLabel(row.scores[pillar]) })),
    change: shortChange(row.change),
    place: row.place ? `${ordinal(row.place.rank)} of ${row.place.of}` : null,
  }));
}

function sourcesPart(input: ReportInput, demand: ReportData['demand']): ReportData['sources'] {
  const { audit } = input;
  // One date when every check shares it.
  const days = new Set(audit.checks.map((check) => formatDate(check.checkedAt)));
  const sameDay = days.size === 1 ? ([...days][0] as string) : null;
  const findings = input.findings.filter((finding) => !finding.removed);
  const notes: Array<{ label: string; text: string }> = [
    {
      label: 'Audit',
      text: [
        `Your Audit of ${formatDate(audit.runAt)}, from public pages only: ${plural(audit.checks.length, 'result', 'results')} and ${plural(findings.length, 'finding', 'findings')}, each with its link and date in What the internet says.`,
        sameDay ? `Every check was checked on ${sameDay}.` : null,
      ]
        .filter(Boolean)
        .join(' '),
    },
  ];
  if (input.rivals.length) {
    const lastAudit = input.rivals.reduce<string | null>((latest, rival) => (rival.audit && (!latest || rival.audit.runAt > latest) ? rival.audit.runAt : latest), null);
    const lines = [lastAudit ? `Each rival’s own Audit, last run ${formatDate(lastAudit)}.` : 'Rival scores arrive after their first Audit.'];
    if (input.lastRivalCheck) lines.push(`Moves from the weekly check of their public pages, last run ${formatDate(input.lastRivalCheck)}.`);
    notes.push({ label: 'Rivals', text: lines.join(' ') });
  }
  if (demand) notes.push({ label: 'Demand', text: `${demand.place}${demand.pulledOn ? `, updated ${demand.pulledOn}` : ''}. ${demand.caption}. Grouped only, never one student.` });
  if (input.leads) notes.push({ label: 'Leads', text: 'Enquiries through your tracking links, counted by link. Never a student’s details.' });
  return notes;
}

export function buildReport(input: ReportInput): ReportData {
  const { institution, audit, month } = input;
  const previous = [...input.history].reverse().find((row) => row.runAt < audit.runAt) ?? null;
  const view = auditPlaces(audit, input.findings, {
    institutionType: institution.type,
    city: institution.city,
    programNames: input.programNames,
    previousRunAt: previous?.runAt ?? null,
  });
  const firstAudit = audit.previousAuditId === null && previous === null;
  const rivalNames = new Map(input.rivals.map((rival) => [rival.id, rival.name]));
  const things = threeThings({ fixes: view.fixes, lessons: input.lessons, picks: input.picks, rivalNames });
  const [latestMove] = [...input.moves].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  const summary =
    input.summary ??
    buildSummary({
      month,
      words: view.words,
      firstAudit,
      previousRunAt: previous?.runAt ?? null,
      things,
      move: latestMove ? { rival: rivalNames.get(latestMove.rivalId) ?? 'A rival', description: latestMove.description, detectedAt: latestMove.detectedAt } : null,
      hasRivals: input.rivals.length > 0,
      leads: input.leads ? leadsFacts(input.leads) : null,
    });

  const since = previous ? sinceWhen(previous.runAt, month) : null;
  const fixes = view.fixes;
  const demand = demandPart(input);
  const leadLinks = input.leads ? [...input.leads].filter((link) => link.count > 0 || link.before > 0).sort((a, b) => b.count - a.count || b.before - a.before || a.name.localeCompare(b.name)) : null;

  return typeset({
    institution: {
      name: institution.name,
      place: `${INSTITUTION_TYPE_LABELS[institution.type]} in ${institution.city}, ${institution.state}`,
      website: hostAndPath(institution.website),
    },
    month,
    monthLabel: formatMonth(month),
    monthName: formatMonthName(month),
    madeAt: input.madeAt.toISOString(),
    madeOn: formatDate(input.madeAt),
    tier: input.tier,
    tierLabel: TIER_LABELS[input.tier],
    checkedOn: `Checked ${formatDate(audit.runAt)}`,
    answer: auditVerdict(audit.scores),
    words: reportWords(view.words),
    score: { overall: audit.scores.overall, change: firstAudit ? 'First Audit' : since ? changeSince(audit.changes.overall, since) : null },
    summary,
    places: placesFor(view),
    fixes: fixes.slice(0, REPORT_LIMITS.fixesInDetail).map((fix, index) => fixDetailOf(fix, index + 1, addedFor(fix, input))),
    moreFixes: fixes.slice(REPORT_LIMITS.fixesInDetail, REPORT_LIMITS.fixesInDetail + REPORT_LIMITS.moreFixes).map((fix, index) => fixRowOf(fix, REPORT_LIMITS.fixesInDetail + index + 1)),
    moreFixesCount: Math.max(0, fixes.length - REPORT_LIMITS.fixesInDetail - REPORT_LIMITS.moreFixes),
    rivals: rivalsPart(input),
    demand,
    leads: leadLinks
      ? {
          line: summary.lines.enquiries ?? '',
          total: leadLinks.reduce((sum, link) => sum + link.count, 0),
          links: leadLinks.slice(0, REPORT_LIMITS.leadLinks),
          moreLinks: Math.max(0, leadLinks.length - REPORT_LIMITS.leadLinks),
        }
      : null,
    progress: progressPart(input),
    sources: sourcesPart(input, demand),
    contact: input.tier === 'paid' ? { ...PAID_CONTACT } : null,
    sample: input.sample ? SAMPLE_REPORT_NOTE : null,
  });
}

/**
 * Typographer's quotes: “double”, ‘single’ and apostrophes (’). Text comes from many places
 * (the Audit, rival moves, student questions), so the report sets them all the same way.
 */
export function curlyQuotes(text: string): string {
  return text
    .replace(/(^|[\s([{‘])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{“])'/g, '$1‘')
    .replace(/'/g, '’');
}

/** Curly quotes in every piece of text in the report. */
export function typeset<T>(value: T): T {
  if (typeof value === 'string') return curlyQuotes(value) as T;
  if (Array.isArray(value)) return value.map((entry) => typeset(entry)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, typeset(entry)])) as T;
  return value;
}

/** Every piece of text in the report, for the copy checks (no dashes, no straight quotes). */
export function reportTexts(data: unknown): string[] {
  const texts: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') texts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(data);
  return texts;
}
