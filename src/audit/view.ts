// What the Audit screens show, built from the rows the signed-in user is allowed to read.
// Pure: the page loads the rows (row level security applies), this shapes them.
//
// The all-programs view uses the ranks the engine stored, so Free's top 3 always match the
// details the database lets Free see. A single-program view (Paid and Client) ranks that
// program's checks with the same engine functions.

import { CHECKS, checkLooksAt, checkName, type CheckLevel } from '../domain/checks.ts';
import { itemPoints, rankFixes, rankWorking } from '../domain/scoring/rank.ts';
import type { CheckOutcome } from '../domain/scoring/score.ts';
import { scoreLabel, type ScoreLabel } from '../domain/scores.ts';
import type { ScoringConfig } from '../domain/scoring-config.ts';
import {
  DIFFICULTIES,
  PILLARS,
  RESULTS,
  type AuditKind,
  type AuditTrigger,
  type CheckKey,
  type CheckResult,
  type Difficulty,
  type InstitutionType,
  type Pillar,
} from '../domain/types.ts';

export interface CheckDetail {
  finding: string;
  whyItMatters: string | null;
  howToFix: string | null;
  difficulty: Difficulty | null;
  sourceUrl: string;
}

export interface StoredCheck {
  id: string;
  programId: string | null;
  pillar: Pillar;
  key: CheckKey;
  result: CheckResult;
  pointsAwarded: number;
  pointsMax: number;
  strengthRank: number | null;
  fixRank: number | null;
  previousResult: CheckResult | null;
  checkedAt: string;
  /** Null when the plan does not include this check's details. */
  detail: CheckDetail | null;
}

export interface ScoreSet {
  overall: number;
  discovered: number;
  trusted: number;
  chosen: number;
}

export interface ChangeSet {
  overall: number | null;
  discovered: number | null;
  trusted: number | null;
  chosen: number | null;
}

export interface StoredAudit {
  id: string;
  runAt: string;
  kind: AuditKind;
  trigger: AuditTrigger;
  programCount: number;
  previousAuditId: string | null;
  scores: ScoreSet;
  changes: ChangeSet;
  programs: Array<{ programId: string; scores: ScoreSet; changes: ChangeSet }>;
  checks: StoredCheck[];
}

/** One scored check inside a list item or an area row. */
export interface ItemPart {
  checkId: string;
  programId: string | null;
  programName: string | null;
  result: CheckResult;
  previousResult: CheckResult | null;
  points: number;
  maxPoints: number;
  checkedAt: string;
  detail: CheckDetail | null;
}

export interface ListItem {
  rank: number;
  key: CheckKey;
  name: string;
  pillar: Pillar;
  parts: ItemPart[];
  /** What's working: Strong items first, then Okay. Null on fix items. */
  strength: 'strong' | 'okay' | null;
  /** What to fix: the hardest fix among the parts the viewer can see. */
  difficulty: Difficulty | null;
  /** Effect on the score of this view, in points: earned (working) or could add (fix). */
  points: number;
}

/**
 * One line for a check in the list of all checks. A per-program check whose programs
 * disagree "varies by program", with the average points; the side panel shows each program.
 */
export type RowSummary =
  | { kind: 'single'; result: CheckResult; points: number; maxPoints: number }
  | { kind: 'varies'; points: number; maxPoints: number }
  | { kind: 'none' };

export interface AreaRow {
  key: CheckKey;
  name: string;
  looksAt: string;
  pillar: Pillar;
  level: CheckLevel;
  parts: ItemPart[];
  summary: RowSummary;
}

export function rowSummary(parts: readonly ItemPart[]): RowSummary {
  const first = parts[0];
  if (!first) return { kind: 'none' };
  const average = parts.reduce((sum, part) => sum + part.points, 0) / parts.length;
  if (parts.every((part) => part.result === first.result)) return { kind: 'single', result: first.result, points: average, maxPoints: first.maxPoints };
  return { kind: 'varies', points: average, maxPoints: first.maxPoints };
}

export interface AuditView {
  programId: string | null;
  scores: ScoreSet;
  changes: ChangeSet;
  label: ScoreLabel;
  /** No earlier Audit to compare with. */
  firstAudit: boolean;
  /** There was an earlier Audit, but it covered other programs, so the overall change is left out. */
  programsChanged: boolean;
  working: ListItem[];
  fixes: ListItem[];
  areas: Array<{ pillar: Pillar; rows: AreaRow[] }>;
}

interface ViewOptions {
  institutionType: InstitutionType;
  programNames: ReadonlyMap<string, string>;
  config?: Pick<ScoringConfig, 'labels'>;
}

const DIFFICULTY_ORDER = new Map<Difficulty, number>(DIFFICULTIES.map((difficulty, index) => [difficulty, index]));

const hundredths = (points: number) => Math.round(points * 100);

function part(check: StoredCheck, names: ReadonlyMap<string, string>): ItemPart {
  return {
    checkId: check.id,
    programId: check.programId,
    programName: check.programId ? (names.get(check.programId) ?? 'Program') : null,
    result: check.result,
    previousResult: check.previousResult,
    points: check.pointsAwarded,
    maxPoints: check.pointsMax,
    checkedAt: check.checkedAt,
    detail: check.detail,
  };
}

function byProgramName(a: ItemPart, b: ItemPart): number {
  return (a.programName ?? '').localeCompare(b.programName ?? '');
}

function hardest(parts: readonly ItemPart[]): Difficulty | null {
  let worst: Difficulty | null = null;
  for (const item of parts) {
    const difficulty = item.detail?.difficulty ?? null;
    if (difficulty && (worst === null || (DIFFICULTY_ORDER.get(difficulty) ?? 0) > (DIFFICULTY_ORDER.get(worst) ?? 0))) worst = difficulty;
  }
  return worst;
}

function areas(checks: readonly StoredCheck[], options: ViewOptions): AuditView['areas'] {
  return PILLARS.map((pillar) => ({
    pillar,
    rows: CHECKS.filter((check) => check.pillar === pillar).map((check) => {
      const parts = checks
        .filter((stored) => stored.key === check.key)
        .map((stored) => part(stored, options.programNames))
        .sort(byProgramName);
      return {
        key: check.key,
        name: checkName(check.key, options.institutionType),
        looksAt: checkLooksAt(check.key, options.institutionType),
        pillar,
        level: check.level,
        parts,
        summary: rowSummary(parts),
      };
    }),
  }));
}

/** Effect of a set of checks on an overall score over `programCount` programs, in points. */
function effect(checks: readonly StoredCheck[], programCount: number, amount: (check: StoredCheck) => number): number {
  const total = checks.reduce((sum, check) => sum + amount(check) * (check.programId === null ? programCount : 1), 0);
  return total / (300 * programCount);
}

/** Items from the ranks the engine stored: checks that share a rank are one item. */
function fromStoredRanks(audit: StoredAudit, options: ViewOptions, field: 'strengthRank' | 'fixRank'): ListItem[] {
  const groups = new Map<number, StoredCheck[]>();
  for (const check of audit.checks) {
    const rank = check[field];
    if (rank === null) continue;
    groups.set(rank, [...(groups.get(rank) ?? []), check]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rank, checks]) => {
      const first = checks[0] as StoredCheck;
      const parts = checks.map((check) => part(check, options.programNames)).sort(byProgramName);
      const working = field === 'strengthRank';
      return {
        rank,
        key: first.key,
        name: checkName(first.key, options.institutionType),
        pillar: first.pillar,
        parts,
        strength: working ? (first.result === 'strong' ? 'strong' : 'okay') : null,
        difficulty: working ? null : hardest(parts),
        points: working
          ? effect(checks, audit.programCount, (check) => hundredths(check.pointsAwarded))
          : effect(checks, audit.programCount, (check) => check.pointsMax * 100 - hundredths(check.pointsAwarded)),
      } satisfies ListItem;
    });
}

/** The whole Audit: every program the viewer can see, ranked as stored. */
export function overviewView(audit: StoredAudit, options: ViewOptions): AuditView {
  return {
    programId: null,
    scores: audit.scores,
    changes: audit.changes,
    label: scoreLabel(audit.scores.overall, options.config),
    firstAudit: audit.previousAuditId === null,
    programsChanged: audit.previousAuditId !== null && audit.changes.overall === null,
    working: fromStoredRanks(audit, options, 'strengthRank'),
    fixes: fromStoredRanks(audit, options, 'fixRank'),
    areas: areas(audit.checks, options),
  };
}

/** One program: its own scores, its checks plus the shared institution checks, ranked for it. */
export function programView(audit: StoredAudit, programId: string, options: ViewOptions): AuditView | null {
  const program = audit.programs.find((entry) => entry.programId === programId);
  if (!program) return null;
  const checks = audit.checks.filter((check) => check.programId === null || check.programId === programId);
  const byOutcome = new Map<CheckOutcome, StoredCheck>();
  const outcomes = checks.map((check) => {
    const outcome: CheckOutcome = {
      key: check.key,
      pillar: check.pillar,
      programId: check.programId,
      result: check.result,
      earned: hundredths(check.pointsAwarded),
      maxPoints: check.pointsMax,
    };
    byOutcome.set(outcome, check);
    return outcome;
  });

  const toItem = (item: { rank: number; key: CheckKey; pillar: Pillar; outcomes: CheckOutcome[]; value: number }, strength: ListItem['strength']): ListItem => {
    const parts = item.outcomes.map((outcome) => part(byOutcome.get(outcome) as StoredCheck, options.programNames));
    return {
      rank: item.rank,
      key: item.key,
      name: checkName(item.key, options.institutionType),
      pillar: item.pillar,
      parts,
      points: itemPoints(item, 1),
      strength,
      difficulty: strength === null ? hardest(parts) : null,
    };
  };

  const difficultyOf = (outcome: CheckOutcome): Difficulty => byOutcome.get(outcome)?.detail?.difficulty ?? 'medium';
  return {
    programId,
    scores: program.scores,
    changes: program.changes,
    label: scoreLabel(program.scores.overall, options.config),
    firstAudit: program.changes.overall === null,
    programsChanged: false,
    working: rankWorking(outcomes, 1).map((item) => toItem(item, item.strength)),
    fixes: rankFixes(outcomes, 1, difficultyOf).map((item) => toItem(item, null)),
    areas: areas(checks, options),
  };
}

/** One line of a check's results in its panel. */
export interface PanelLine {
  key: string;
  /** The programs on this line; empty for a check on the whole institution. */
  programs: string[];
  result: CheckResult;
  points: number;
  maxPoints: number;
  /** The result at the last Audit, when it has moved since. */
  previousResult: CheckResult | null;
}

/**
 * A check's results, one line per program. Programs that are Strong with the same points (and
 * were Strong before) share one line, after the rest.
 */
export function panelLines(parts: readonly ItemPart[]): PanelLine[] {
  const steady = parts.filter((part) => part.programName && part.result === 'strong' && (part.previousResult === null || part.previousResult === 'strong'));
  const first = steady[0];
  const shared = first && steady.length > 1 && steady.every((part) => part.points === first.points && part.maxPoints === first.maxPoints) ? steady : [];
  const lines: PanelLine[] = parts
    .filter((part) => !shared.includes(part))
    .map((part) => ({
      key: part.checkId,
      programs: part.programName ? [part.programName] : [],
      result: part.result,
      points: part.points,
      maxPoints: part.maxPoints,
      previousResult: part.previousResult !== null && part.previousResult !== part.result ? part.previousResult : null,
    }));
  if (first && shared.length) {
    lines.push({ key: 'strong', programs: shared.map((part) => part.programName as string), result: 'strong', points: first.points, maxPoints: first.maxPoints, previousResult: null });
  }
  return lines;
}

/** How to fix a check: said once when every program needs the same, otherwise per program. The hardest difficulty counts. */
export function fixAdvice(parts: readonly ItemPart[]): Array<{ programs: string[]; text: string; difficulty: Difficulty | null }> {
  const byText = new Map<string, { programs: string[]; difficulty: Difficulty | null }>();
  for (const part of parts) {
    const text = part.detail?.howToFix;
    if (!text) continue;
    const entry = byText.get(text) ?? { programs: [], difficulty: null };
    if (part.programName) entry.programs.push(part.programName);
    const difficulty = part.detail?.difficulty ?? null;
    if (difficulty && (!entry.difficulty || DIFFICULTIES.indexOf(difficulty) > DIFFICULTIES.indexOf(entry.difficulty))) entry.difficulty = difficulty;
    byText.set(text, entry);
  }
  return [...byText.entries()].map(([text, entry]) => ({ text, programs: byText.size > 1 ? entry.programs : [], difficulty: entry.difficulty }));
}

export interface HistoryRow {
  id: string;
  runAt: string;
  scores: ScoreSet;
}

/** One point per month for the chart: the latest Audit in each month (India time). */
export function historyByMonth(
  rows: ReadonlyArray<{ runAt: string; scores: Pick<ScoreSet, 'overall'> }>,
  monthOf: (runAt: string) => string,
): Array<{ month: string; score: number }> {
  const byMonth = new Map<string, { runAt: string; scores: Pick<ScoreSet, 'overall'> }>();
  for (const row of [...rows].sort((a, b) => a.runAt.localeCompare(b.runAt))) byMonth.set(monthOf(row.runAt), row);
  return [...byMonth.entries()].map(([month, row]) => ({ month, score: row.scores.overall }));
}

/** Each month's latest Audit, oldest first, with all four scores: the score and pillar charts. */
export function scoresByMonth(
  rows: ReadonlyArray<{ runAt: string; scores: ScoreSet }>,
  monthOf: (runAt: string) => string,
): Array<{ month: string; scores: ScoreSet }> {
  const byMonth = new Map<string, ScoreSet>();
  for (const row of [...rows].sort((a, b) => a.runAt.localeCompare(b.runAt))) byMonth.set(monthOf(row.runAt), row.scores);
  return [...byMonth.entries()].map(([month, scores]) => ({ month, scores }));
}

export interface PillarCheck {
  key: CheckKey;
  name: string;
  /** The weakest result across the programs the check covers. */
  result: CheckResult;
}

export interface PillarChecks {
  pillar: Pillar;
  /** Every check the Audit ran in this pillar, in check order. */
  checks: PillarCheck[];
  /** How many are Strong for every program they cover. */
  strong: number;
  /** The worst result, then the one that could add the most points. Null when every check is Strong. */
  weakest: PillarCheck | null;
}

const RESULT_RANK = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));
const worse = (a: CheckResult, b: CheckResult) => ((RESULT_RANK.get(b) ?? 0) > (RESULT_RANK.get(a) ?? 0) ? b : a);

/** Each pillar's checks at a glance: one result per check, how many are Strong, and the weakest. */
export function pillarChecks(view: Pick<AuditView, 'areas' | 'fixes'>): PillarChecks[] {
  const gain = new Map(view.fixes.map((item) => [item.key, item.points]));
  return view.areas.map((area) => {
    const checks = area.rows.flatMap((row): PillarCheck[] =>
      row.parts.length ? [{ key: row.key, name: row.name, result: row.parts.reduce<CheckResult>((worst, item) => worse(worst, item.result), 'strong') }] : [],
    );
    const [weakest = null] = checks
      .filter((check) => check.result !== 'strong')
      .sort((a, b) => (RESULT_RANK.get(b.result) ?? 0) - (RESULT_RANK.get(a.result) ?? 0) || (gain.get(b.key) ?? 0) - (gain.get(a.key) ?? 0));
    return { pillar: area.pillar, checks, strong: checks.filter((check) => check.result === 'strong').length, weakest };
  });
}

/**
 * The score a monthly report shows (the latest Audit up to the end of its month) and the change
 * since the month before it that had an Audit. Null when there is no Audit up to that month.
 */
export function monthScore(
  points: ReadonlyArray<{ month: string; score: number }>,
  month: string,
): { score: number; change: number | null; since: string | null } | null {
  const upTo = points.filter((point) => point.month <= month);
  const current = upTo.at(-1);
  if (!current) return null;
  const before = upTo.at(-2);
  return { score: current.score, change: before ? current.score - before.score : null, since: before?.month ?? null };
}

/** "Could add up to 7 points". Whole numbers, and never "0 points". */
export function pointsToGainText(points: number): string {
  if (points < 0.5) return 'Could add less than 1 point';
  const rounded = Math.round(points);
  return `Could add up to ${rounded} ${rounded === 1 ? 'point' : 'points'}`;
}

/** "Worth 6 points of your score", for what's working. */
export function pointsWorthText(points: number): string {
  if (points < 0.5) return 'Worth less than 1 point of your score';
  const rounded = Math.round(points);
  return `Worth ${rounded} ${rounded === 1 ? 'point' : 'points'} of your score`;
}

// Points on screen are whole numbers: 7.5 shows as 8. The exact value stays in the data and
// in every score calculation.

/** "8 of 25 points". */
export function pointsEarnedText(points: number, maxPoints: number): string {
  return `${Math.round(points)} of ${maxPoints} points`;
}

/** "8/25", for the list of checks. */
export function pointsFraction(points: number, maxPoints: number): string {
  return `${Math.round(points)}/${maxPoints}`;
}
