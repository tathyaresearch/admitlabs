// What goes into the monthly report (spec section 12), as one plain snapshot: every number and
// sentence the PDF prints, already worded. Built from what was known at the end of the month.
// Pure, so every rule here is tested without a database or a PDF.
//
// Short enough to read in 5 minutes: what's working is the top 3, what to fix is the top 5 in
// detail and the rest as a compact ranked list, Rivals shows up to 5 moves of the month, and
// Demand shows the city's top 3 rising trends, top 5 questions and 5 content ideas.

import { auditVerdict } from '../audit/verdict.ts';
import {
  historyByMonth,
  overviewView,
  pointsToGainText,
  pointsWorthText,
  programView,
  type ChangeSet,
  type HistoryRow,
  type ListItem,
  type ScoreSet,
  type StoredAudit,
} from '../audit/view.ts';
import { regionPlace, type DemandRegion } from '../demand/regions.ts';
import { changeWords, countWords, LANGUAGE_TAGS, PLATFORM_LABELS, sourcesCaption } from '../demand/text.ts';
import { demandView, type DemandRow } from '../demand/view.ts';
import { CHECKS, checkName } from '../domain/checks.ts';
import { monthKey } from '../domain/dates.ts';
import { formatDate, formatMonth, formatMonthShort, hostAndPath, joinNames } from '../domain/format.ts';
import { scoreLabel, type ScoreLabel } from '../domain/scores.ts';
import {
  DIFFICULTY_LABELS,
  INSTITUTION_TYPE_LABELS,
  LANGUAGE_LABELS,
  PILLAR_LABELS,
  PILLARS,
  TIER_LABELS,
  type CheckResult,
  type InstitutionType,
  type Pillar,
  type RivalMoveKind,
  type Tier,
} from '../domain/types.ts';
import { ladder } from '../rivals/compare.ts';
import { MOVE_KIND_LABELS } from '../rivals/text.ts';
import { rivalsVerdict } from '../rivals/verdict.ts';
import { threeThings, type RivalLesson, type Thing } from './things.ts';

export const REPORT_LIMITS = {
  working: 3,
  fixesInDetail: 5,
  historyMonths: 6,
  moves: 5,
  rising: 3,
  questions: 5,
  ideas: 5,
  /** Program results shown one by one on a fix; more than this reads "Varies across 5 programs". */
  partsShown: 4,
  /** Programs on the by program page; the rest are counted. */
  programs: 30,
} as const;

/** The quiet line on the last page, for Paid only (not Client). */
export const PAID_CONTACT = { text: 'Want AdmitLabs to do this for you?', email: 'hello@admitlabs.in' } as const;

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
  /** Its latest rival Audit up to the end of the month. */
  audit: { runAt: string; scores: ScoreSet; changes: ChangeSet } | null;
}

export interface ReportMove {
  rivalId: string;
  kind: RivalMoveKind;
  description: string;
  detectedAt: string;
}

export interface ReportInput {
  institution: ReportInstitution;
  tier: Exclude<Tier, 'free'>;
  /** 'YYYY-MM'. */
  month: string;
  madeAt: Date;
  /** The latest own Audit up to the end of the month, with every detail. */
  audit: StoredAudit;
  programNames: ReadonlyMap<string, string>;
  /** Own Audits up to the end of the month. */
  history: readonly HistoryRow[];
  rivals: readonly ReportRival[];
  /** Moves found during the month. */
  moves: readonly ReportMove[];
  /** The month's Rivals 3 things to do, ranked. */
  lessons: readonly RivalLesson[];
  /** Rival Audits and the weekly check, for the sources page. */
  lastRivalCheck: string | null;
  /** The institution's city: the latest pull of each program up to the month. */
  demand: { region: DemandRegion; rows: readonly DemandRow[]; pulledAt: string | null };
}

// Output: what the PDF prints ------------------------------------------------------------------

export interface PartResult {
  program: string | null;
  result: CheckResult;
}

/** A fix as one short row: the rest of the list, or any fix in a compact report. */
export interface ReportFixRow {
  rank: number;
  name: string;
  /** Short enough for one line: "BBA and MBA", or "5 programs". */
  programs: string | null;
  gain: string;
  difficulty: string | null;
}

export interface ReportFix {
  rank: number;
  name: string;
  /** The same fix as one short row. */
  row: ReportFixRow;
  results: PartResult[];
  /** "Varies across 5 programs" when there are too many to list. */
  resultsNote: string | null;
  finding: string | null;
  howToFix: string | null;
  gain: string;
  difficulty: string | null;
}

export interface ReportData {
  institution: { name: string; place: string; website: string };
  month: string;
  monthLabel: string;
  madeAt: string;
  madeOn: string;
  tier: Exclude<Tier, 'free'>;
  tierLabel: string;
  cover: { score: number; label: ScoreLabel; change: string | null; verdict: string; checkedOn: string };
  summary: {
    overall: number;
    label: ScoreLabel;
    change: string | null;
    pillars: Array<{ pillar: Pillar; name: string; score: number; label: ScoreLabel; change: string | null }>;
    /** Up to 6 months, oldest first, one score per month. */
    history: Array<{ month: string; label: string; score: number }>;
    note: string | null;
  };
  working: Array<{ rank: number; name: string; programs: string | null; result: CheckResult; worth: string; finding: string | null }>;
  fixes: ReportFix[];
  /** The rest of the ranked list. */
  moreFixes: ReportFixRow[];
  programs: Array<{
    name: string;
    score: number;
    label: ScoreLabel;
    change: string | null;
    pillars: Record<Pillar, number>;
    topFix: string | null;
    topFixGain: string | null;
  }>;
  /** Programs left off the by program page (over the limit). */
  morePrograms: number;
  rivals: {
    verdict: string;
    rows: Array<{ name: string; you: boolean; rank: number | null; overall: number | null; pillars: Record<Pillar, number> | null; change: string | null }>;
    moves: Array<{ rival: string; kind: string; text: string; date: string }>;
    moreMoves: number;
  } | null;
  demand: {
    place: string;
    rising: Array<{ text: string; change: string; count: string; program: string }>;
    questions: Array<{ text: string; count: string; program: string; language: string | null }>;
    ideas: Array<{ text: string; program: string; basedOn: string | null }>;
    pulledOn: string | null;
    caption: string;
  } | null;
  things: Thing[];
  sources: {
    /** The day every check was checked, when they share one. */
    checkedOn: string | null;
    checks: Array<{ name: string; pillar: string; checkedOn: string; links: string[] }>;
    notes: Array<{ label: string; text: string }>;
  };
  /** Paid only: "Want AdmitLabs to do this for you? hello@admitlabs.in". */
  contact: { text: string; email: string } | null;
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

/** "BBA, MBA and B.Com" for the programs of a program check, or null for an institution check. */
export function programsOf(item: ListItem): string | null {
  const names = [...new Set(item.parts.flatMap((part) => (part.programName ? [part.programName] : [])))];
  return names.length ? joinNames(names) : null;
}

/** Short enough for one line: "BBA and MBA", or "5 programs". */
function shortPrograms(item: ListItem): string | null {
  const names = programsOf(item);
  const count = new Set(item.parts.flatMap((part) => (part.programName ? [part.programName] : []))).size;
  return count > 1 && (count > 2 || (names?.length ?? 0) > 28) ? `${count} programs` : names;
}

function share(part: ListItem['parts'][number]): number {
  return part.maxPoints > 0 ? part.points / part.maxPoints : 0;
}

/** One link per site, and how many more pages there: "site.example/programs/bba and 4 more". */
export function compactLinks(urls: readonly string[]): string[] {
  const byHost = new Map<string, string[]>();
  for (const url of [...new Set(urls)].sort()) {
    const shown = hostAndPath(url);
    const slash = shown.indexOf('/');
    const host = slash === -1 ? shown : shown.slice(0, slash);
    const path = slash === -1 ? '' : shown.slice(slash);
    const paths = byHost.get(host) ?? [];
    if (!paths.includes(path)) paths.push(path);
    byHost.set(host, paths);
  }
  return [...byHost.entries()].map(([host, paths]) => {
    const [first = '', ...rest] = paths;
    return rest.length ? `${host}${first} and ${rest.length} more` : `${host}${first}`;
  });
}

// The build ---------------------------------------------------------------------------------------

function fixRow(item: ListItem): ReportFixRow {
  return {
    rank: item.rank,
    name: item.name,
    programs: shortPrograms(item),
    gain: pointsToGainText(item.points).replace('Could add up to', 'Up to').replace('Could add less than', 'Less than'),
    difficulty: item.difficulty ? DIFFICULTY_LABELS[item.difficulty] : null,
  };
}

/** One of what's working, as the PDF prints it. */
export function workingRow(item: ListItem): ReportData['working'][number] {
  return {
    rank: item.rank,
    name: item.name,
    programs: programsOf(item),
    result: item.strength ?? 'okay',
    worth: pointsWorthText(item.points),
    finding: item.parts.find((part) => part.detail)?.detail?.finding ?? null,
  };
}

/** Each program in name order, with its score and the one fix that would help it most. */
export function programRows(audit: StoredAudit, options: { institutionType: InstitutionType; programNames: ReadonlyMap<string, string> }): ReportData['programs'] {
  return [...audit.programs]
    .map((program) => ({ program, name: options.programNames.get(program.programId) ?? 'Program' }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, REPORT_LIMITS.programs)
    .map(({ program, name }) => {
      const top = programView(audit, program.programId, options)?.fixes[0];
      return {
        name,
        score: program.scores.overall,
        label: scoreLabel(program.scores.overall),
        change: shortChange(program.changes.overall),
        pillars: { discovered: program.scores.discovered, trusted: program.scores.trusted, chosen: program.scores.chosen },
        topFix: top ? checkName(top.key, options.institutionType) : null,
        topFixGain: top ? pointsToGainText(top.points) : null,
      };
    });
}

export function fixOf(item: ListItem): ReportFix {
  const most = [...item.parts].sort((a, b) => share(a) - share(b))[0];
  const tooMany = item.parts.length > REPORT_LIMITS.partsShown;
  return {
    rank: item.rank,
    name: item.name,
    row: fixRow(item),
    results: tooMany ? [] : item.parts.map((part) => ({ program: part.programName, result: part.result })),
    resultsNote: tooMany ? `Varies across ${item.parts.length} programs` : null,
    finding: most?.detail?.finding ?? null,
    howToFix: most?.detail?.howToFix ?? null,
    gain: pointsToGainText(item.points),
    difficulty: item.difficulty ? `${DIFFICULTY_LABELS[item.difficulty]} to fix` : null,
  };
}

export function buildReport(input: ReportInput): ReportData {
  const { institution, audit, month } = input;
  const options = { institutionType: institution.type, programNames: input.programNames };
  const view = overviewView(audit, options);

  // Change since the Audit before this one, dated so it is never vague.
  const previous = audit.previousAuditId ? input.history.find((row) => row.id === audit.previousAuditId) : undefined;
  const since = previous ? sinceWhen(previous.runAt, month) : null;
  const overallChange = view.firstAudit ? 'First Audit' : view.programsChanged || !since ? null : changeSince(view.changes.overall, since);
  const quietPillars = view.firstAudit || view.programsChanged;

  const history = historyByMonth(input.history, (runAt) => monthKey(new Date(runAt)))
    .filter((point) => point.month <= month)
    .slice(-REPORT_LIMITS.historyMonths)
    .map((point) => ({ month: point.month, label: formatMonthShort(point.month), score: point.score }));

  const fixes = view.fixes;
  const place = regionPlace(input.demand.region);
  const demand = demandView(input.demand.rows, {
    singleProgram: new Set(input.demand.rows.map((row) => row.programKey)).size <= 1,
    skills: institution.type === 'skilling',
  });

  // Rivals: you and each rival, highest overall first.
  const scoredRivals = input.rivals.flatMap((rival) => (rival.audit ? [{ name: rival.name, scores: rival.audit.scores }] : []));
  const byRival = new Map(input.rivals.map((rival) => [rival.id, rival]));
  const rows = input.rivals.length
    ? ladder(
        { id: institution.id, name: institution.name, overall: audit.scores.overall, change: view.firstAudit || view.programsChanged ? null : audit.changes.overall },
        input.rivals.map((rival) => ({ id: rival.id, name: rival.name, overall: rival.audit?.scores.overall ?? null, change: rival.audit?.changes.overall ?? null })),
      ).map((row) => {
        const scores = row.you ? audit.scores : (byRival.get(row.id)?.audit?.scores ?? null);
        return {
          name: row.name,
          you: row.you,
          rank: row.rank,
          overall: row.overall,
          pillars: scores ? { discovered: scores.discovered, trusted: scores.trusted, chosen: scores.chosen } : null,
          change: shortChange(row.change),
        };
      })
    : [];
  const moves = [...input.moves].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

  const lastRivalAudit = input.rivals.reduce<string | null>((latest, rival) => (rival.audit && (!latest || rival.audit.runAt > latest) ? rival.audit.runAt : latest), null);
  const platforms = demand.platforms.map((platform) => PLATFORM_LABELS[platform] ?? platform);
  // Sources: each check, where it was found and when. One date when every check shares it.
  const checkSources = CHECKS.flatMap((check) => {
    const parts = audit.checks.filter((stored) => stored.key === check.key);
    if (!parts.length) return [];
    const checkedAt = parts.map((part) => part.checkedAt).sort().pop() as string;
    return [
      {
        name: checkName(check.key, institution.type),
        pillar: PILLAR_LABELS[check.pillar],
        checkedOn: formatDate(checkedAt),
        links: compactLinks(parts.flatMap((part) => (part.detail?.sourceUrl ? [part.detail.sourceUrl] : []))),
      },
    ];
  });
  const days = new Set(checkSources.map((check) => check.checkedOn));
  const sameDay = days.size === 1 ? ([...days][0] as string) : null;
  const notes: Array<{ label: string; text: string }> = [
    {
      label: 'Audit',
      text: sameDay
        ? `Your Audit of ${formatDate(audit.runAt)}, from public pages only. Every check below was checked on ${sameDay}.`
        : `Your Audit of ${formatDate(audit.runAt)}, from public pages only.`,
    },
  ];
  if (input.rivals.length) {
    const checks = [lastRivalAudit ? `Each rival's own Audit, last run ${formatDate(lastRivalAudit)}.` : 'Rival scores arrive after their first Audit.'];
    if (input.lastRivalCheck) checks.push(`Moves from the weekly check of their public pages, last run ${formatDate(input.lastRivalCheck)}.`);
    notes.push({ label: 'Rivals', text: checks.join(' ') });
  }
  if (demand.month) {
    const pulled = input.demand.pulledAt ? `, pulled ${formatDate(input.demand.pulledAt)}` : '';
    const from = platforms.length ? `, from ${joinNames(platforms)}` : '';
    const languages = demand.languages.length ? `, in ${joinNames(demand.languages.map((language) => LANGUAGE_LABELS[language]))}` : '';
    notes.push({ label: 'Demand', text: `${place}${pulled}${from}${languages}.` });
  }

  return typeset({
    institution: {
      name: institution.name,
      place: `${INSTITUTION_TYPE_LABELS[institution.type]} in ${institution.city}, ${institution.state}`,
      website: hostAndPath(institution.website),
    },
    month,
    monthLabel: formatMonth(month),
    madeAt: input.madeAt.toISOString(),
    madeOn: formatDate(input.madeAt),
    tier: input.tier,
    tierLabel: TIER_LABELS[input.tier],
    cover: { score: audit.scores.overall, label: view.label, change: overallChange, verdict: auditVerdict(audit.scores), checkedOn: `Checked ${formatDate(audit.runAt)}` },
    summary: {
      overall: audit.scores.overall,
      label: view.label,
      change: overallChange,
      pillars: PILLARS.map((pillar) => ({
        pillar,
        name: PILLAR_LABELS[pillar],
        score: audit.scores[pillar],
        label: scoreLabel(audit.scores[pillar]),
        change: quietPillars ? null : shortChange(audit.changes[pillar]),
      })),
      history,
      note: view.programsChanged ? 'Your programs changed since the last Audit, so each program shows its own change.' : null,
    },
    working: view.working.slice(0, REPORT_LIMITS.working).map(workingRow),
    fixes: fixes.slice(0, REPORT_LIMITS.fixesInDetail).map(fixOf),
    moreFixes: fixes.slice(REPORT_LIMITS.fixesInDetail).map(fixRow),
    programs: programRows(audit, options),
    morePrograms: Math.max(0, audit.programs.length - REPORT_LIMITS.programs),
    rivals: input.rivals.length
      ? {
          verdict: rivalsVerdict(audit.scores, scoredRivals),
          rows,
          moves: moves.slice(0, REPORT_LIMITS.moves).map((move) => ({
            rival: byRival.get(move.rivalId)?.name ?? 'A rival',
            kind: MOVE_KIND_LABELS[move.kind],
            text: move.description,
            date: formatDate(move.detectedAt),
          })),
          moreMoves: Math.max(0, moves.length - REPORT_LIMITS.moves),
        }
      : null,
    demand: demand.month
      ? {
          place,
          rising: demand.rising.slice(0, REPORT_LIMITS.rising).map((row) => ({
            text: row.text,
            change: changeWords(row.changePct),
            count: countWords('rising', row.count),
            program: row.programName,
          })),
          questions: demand.questions.slice(0, REPORT_LIMITS.questions).map((row) => ({
            text: row.text,
            count: countWords('question', row.count),
            program: row.programName,
            language: LANGUAGE_TAGS[row.language],
          })),
          ideas: demand.ideas.slice(0, REPORT_LIMITS.ideas).map((idea) => ({ text: idea.text, program: idea.programName, basedOn: idea.question?.text ?? null })),
          pulledOn: input.demand.pulledAt ? formatDate(input.demand.pulledAt) : null,
          caption: sourcesCaption(demand.platforms.length, demand.languages.length),
        }
      : null,
    things: threeThings({ institutionType: institution.type, place, fixes, lessons: input.lessons, ideas: demand.ideas }),
    sources: { checkedOn: sameDay, checks: checkSources, notes },
    contact: input.tier === 'paid' ? { ...PAID_CONTACT } : null,
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
