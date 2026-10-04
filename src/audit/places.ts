// The Audit by place (spec 7.6 to 7.8): the three words, Fix these first, and each of the five
// places with what we found (its proof), what's good and what to fix. Built from the stored Audit
// and its findings, as the reader may see them (row level security applies when they are loaded):
// Free gets results everywhere but the proof and the fix only for its top 3, so the rest shows as
// a count. Pure.
//
// Checks and findings share one ranking (the stored fix_rank), so Fix these first can mix them.
// A check is in exactly one of what's good (Strong everywhere it applies) and what to fix.

import { SCORING_V1 } from '../config/scoring.v1.ts';
import { checkAction, checkName, checksForPlace, getCheck } from '../domain/checks.ts';
import type { ListingProblem } from '../domain/finding-rules.ts';
import { findingIsGood, THIN_FINDINGS } from '../domain/finding-rules.ts';
import { formatMonthName } from '../domain/format.ts';
import type { ReadyFix } from '../domain/ready-fix.ts';
import { impactOf } from '../domain/scoring/rank.ts';
import { scoreLabel, type ScoreLabel } from '../domain/scores.ts';
import type { ScoringConfig } from '../domain/scoring-config.ts';
import {
  DIFFICULTIES,
  FINDING_KIND_LABELS,
  PILLAR_LABELS,
  PILLAR_QUESTIONS,
  PILLARS,
  PLACE_COVERS,
  PLACE_LABELS,
  PLACES,
  RESULTS,
  type CheckKey,
  type CheckResult,
  type Difficulty,
  type FindingKind,
  type FindingPlace,
  type Impact,
  type InstitutionType,
  type Pillar,
  type Place,
} from '../domain/types.ts';
import { fixAdvice, weakestPart, type ItemPart, type ScoreSet, type ChangeSet, type StoredAudit, type StoredCheck } from './view.ts';

/** A finding as stored (audit_findings), as the reader may see it. */
export interface StoredFinding {
  id: string;
  place: FindingPlace;
  kind: FindingKind;
  findingKey: string;
  line: string;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  repeats: number;
  listing: ListingProblem | null;
  fix: { title: string; why: string | null; steps: string[]; readyFix: ReadyFix | null; effort: Difficulty; impact: Impact } | null;
  fixRank: number | null;
  /** Taken out in a review: the team sees it, the college never does. */
  removed: boolean;
}

/** The proof behind one result or finding: the link, the day it was checked and what was seen. */
export interface ProofView {
  url: string | null;
  date: string | null;
  line: string | null;
  /** The program, when a program check's programs differ. */
  program: string | null;
  /** Changed by the AdmitLabs team in a review: "Checked by the AdmitLabs team". */
  byTeam: boolean;
}

/** One line of what we found: a check with its result, or a finding with its kind. */
export interface FoundRowView {
  id: string;
  kind: 'check' | 'finding';
  name: string;
  checkKey: CheckKey | null;
  result: CheckResult | null;
  /** The share of the check's points its weakest program earned, 0 to 1, for the bar. */
  share: number | null;
  /** The weakest program by name, when the programs differ. */
  weakestProgram: string | null;
  findingKind: FindingKind | null;
  /** Null when the plan does not include it (Free beyond its top 3). */
  proof: ProofView | null;
}

export interface GoodView {
  id: string;
  title: string;
  line: string;
}

/** A fix, the same for a check and a finding (spec 7.7). */
export interface FixView {
  /** The fix's key, as a request to fix it names it: 'check:fees_shown' or 'finding:<key>'. */
  id: string;
  kind: 'check' | 'finding';
  /** Its place in the one ranking of the Audit's fixes (for the order; lists number by position). */
  rank: number;
  title: string;
  place: Place;
  /** The check or the finding, as a small label: "Fees", "Quora, unanswered". */
  label: string;
  checkKey: CheckKey | null;
  findingKey: string | null;
  findingKind: FindingKind | null;
  impact: Impact;
  effort: Difficulty | null;
  /** The programs with something to fix; empty for the whole institution. */
  programs: string[];
  /** Each program's result, for a program check. */
  results: Array<{ program: string | null; result: CheckResult }>;
  /** What we found, program by program. */
  found: ProofView[];
  why: string | null;
  /** The steps, once when every program needs the same, otherwise for each program. */
  advice: Array<{ programs: string[]; steps: string[] }>;
  readyFix: ReadyFix | null;
  /** False when the plan does not include its details (Free beyond its top 3). */
  open: boolean;
  /** A Strong check, opened from what we found: not a fix, so nothing to mark or ask. */
  strong?: boolean;
}

export interface ThinView {
  title: string;
  why: string;
  helps: string[];
  next: string;
}

export interface PlaceView {
  key: Place;
  name: string;
  covers: string;
  /** What people say and Other places hold findings, not scored checks. */
  scored: boolean;
  found: FoundRowView[];
  good: GoodView[];
  fixes: FixView[];
  /** How many found items and fixes the plan does not show (Free). */
  hidden: { found: number; fixes: number };
  thin: ThinView | null;
}

export interface WordView {
  pillar: Pillar;
  name: string;
  question: string;
  word: ScoreLabel;
  score: number;
  /** What holds it back most: its weakest check below Strong. Null when every check in it is Strong. */
  fixFirst: { key: CheckKey; name: string; result: CheckResult } | null;
  /** "Up from Okay in June", or null when the word did not move. */
  moved: string | null;
}

export interface AuditPlacesView {
  words: WordView[];
  /** The top 3 fixes across every place, by the one ranking. */
  topFixes: FixView[];
  /** Every fix the reader may see, ranked. */
  fixes: FixView[];
  places: PlaceView[];
  /** What the fix panel can open: every fix the reader may see, and each Strong check with what was found. */
  panel: FixView[];
}

export interface PlacesOptions {
  institutionType: InstitutionType;
  city: string;
  programNames: ReadonlyMap<string, string>;
  /** One program's view, or every program the Audit covers. */
  programId?: string | null;
  config?: Pick<ScoringConfig, 'labels' | 'impact'>;
  /** When the Audit before it ran, for "Up from Okay in June". */
  previousRunAt?: string | null;
  /** "15 Oct 2026": when Drishti looks again, for the kind words when little is found. */
  nextAuditOn?: string | null;
  /** Free: how much each unscored place holds, from findings_teaser(), since it cannot read the findings. */
  teaser?: Partial<Record<FindingPlace, { found: number; toFix: number }>> | null;
}

/** More named programs than this and a fix's name leaves them out ("Show your full fees"). */
const MAX_NAMED_PROGRAMS = 3;
const TOP_FIXES = 3;

const RESULT_RANK = new Map<CheckResult, number>(RESULTS.map((result, index) => [result, index]));
const DIFFICULTY_ORDER = new Map<Difficulty, number>(DIFFICULTIES.map((difficulty, index) => [difficulty, index]));

function partOf(check: StoredCheck, names: ReadonlyMap<string, string>): ItemPart {
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

function proofOf(part: ItemPart, check: StoredCheck | undefined, withProgram: boolean): ProofView | null {
  if (!part.detail) return null;
  const line = part.detail.finding || null;
  return {
    url: part.detail.sourceUrl || null,
    date: part.checkedAt,
    line,
    // The program, unless the line already names it.
    program: withProgram && part.programName && !line?.includes(part.programName) ? part.programName : null,
    byTeam: Boolean(check?.teamCheckedAt),
  };
}

function hardest(parts: readonly ItemPart[]): Difficulty | null {
  let worst: Difficulty | null = null;
  for (const item of parts) {
    const difficulty = item.detail?.difficulty ?? null;
    if (difficulty && (worst === null || (DIFFICULTY_ORDER.get(difficulty) ?? 0) > (DIFFICULTY_ORDER.get(worst) ?? 0))) worst = difficulty;
  }
  return worst;
}

/** Points a check's fix could add to its part, out of 100: an institution check in full, a program check averaged over the programs. */
function partGain(parts: readonly ItemPart[], programCount: number): number {
  return parts.reduce((sum, item) => sum + (item.maxPoints - item.points) / (item.programId === null ? 1 : programCount), 0);
}

interface CheckGroup {
  key: CheckKey;
  parts: ItemPart[];
  checks: StoredCheck[];
}

function groups(audit: StoredAudit, options: PlacesOptions): CheckGroup[] {
  const checks = audit.checks.filter((check) => !options.programId || check.programId === null || check.programId === options.programId);
  const byKey = new Map<CheckKey, CheckGroup>();
  for (const check of checks) {
    const entry = byKey.get(check.key) ?? { key: check.key, parts: [], checks: [] };
    entry.parts.push(partOf(check, options.programNames));
    entry.checks.push(check);
    byKey.set(check.key, entry);
  }
  for (const entry of byKey.values()) entry.parts.sort((a, b) => (a.programName ?? '').localeCompare(b.programName ?? ''));
  return [...byKey.values()];
}

function checkFix(group: CheckGroup, options: PlacesOptions, programCount: number): FixView | null {
  const below = group.parts.filter((item) => item.result !== 'strong');
  if (below.length === 0) return null;
  const weakest = weakestPart(group.parts) as ItemPart;
  const programs = below.flatMap((item) => (item.programName ? [item.programName] : []));
  const named = programs.length > MAX_NAMED_PROGRAMS ? [] : programs;
  const teamTitle = group.parts.map((item) => item.detail?.fixTitle).find((title) => title) ?? null;
  const differ = group.parts.some((item) => item.result !== group.parts[0]?.result);
  const checkOf = new Map(group.checks.map((check) => [check.id, check]));
  const ranks = group.checks.flatMap((check) => (check.fixRank === null ? [] : [check.fixRank]));
  // The ready fix from the program with the most to gain, else any program's.
  const readyFix = [...below].sort((a, b) => a.points / a.maxPoints - b.points / b.maxPoints).map((item) => item.detail?.readyFix ?? null).find((fix) => fix) ?? null;
  return {
    id: `check:${group.key}`,
    kind: 'check',
    rank: ranks.length ? Math.min(...ranks) : Number.MAX_SAFE_INTEGER,
    title: teamTitle ?? checkAction(group.key, named, options.institutionType, weakest.result),
    place: getCheck(group.key).place,
    label: checkName(group.key, options.institutionType, options.city),
    checkKey: group.key,
    findingKey: null,
    findingKind: null,
    impact: impactOf(partGain(group.parts, programCount), (options.config ?? SCORING_V1).impact),
    effort: hardest(below),
    programs,
    results: group.parts.map((item) => ({ program: item.programName, result: item.result })),
    found: below.flatMap((item) => {
      const proof = proofOf(item, checkOf.get(item.checkId), group.parts.length > 1 && (differ || below.length > 1));
      return proof ? [proof] : [];
    }),
    why: below.map((item) => item.detail?.whyItMatters).find((text) => text) ?? null,
    advice: fixAdvice(below).map(({ programs: on, steps }) => ({ programs: on, steps })),
    readyFix,
    open: below.some((item) => item.detail !== null),
  };
}

/** A Strong check, as the fix panel opens it from what we found: what was found and why it matters. */
function strongEntry(group: CheckGroup, options: PlacesOptions): FixView | null {
  if (!group.parts.every((item) => item.result === 'strong') || !group.parts.some((item) => item.detail)) return null;
  const checkOf = new Map(group.checks.map((check) => [check.id, check]));
  return {
    id: `check:${group.key}`,
    kind: 'check',
    rank: Number.MAX_SAFE_INTEGER,
    title: checkName(group.key, options.institutionType, options.city),
    place: getCheck(group.key).place,
    label: checkName(group.key, options.institutionType, options.city),
    checkKey: group.key,
    findingKey: null,
    findingKind: null,
    impact: 'low',
    effort: null,
    programs: [],
    results: group.parts.map((item) => ({ program: item.programName, result: item.result })),
    found: group.parts.flatMap((item) => {
      const proof = proofOf(item, checkOf.get(item.checkId), group.parts.length > 1);
      return proof ? [proof] : [];
    }),
    why: group.parts.map((item) => item.detail?.whyItMatters).find((text) => text) ?? null,
    advice: [],
    readyFix: null,
    open: true,
    strong: true,
  };
}

function findingProof(finding: StoredFinding): ProofView {
  return { url: finding.sourceUrl, date: finding.checkedAt, line: finding.line, program: null, byTeam: false };
}

function findingFix(finding: StoredFinding): FixView | null {
  if (!finding.fix || finding.removed) return null;
  return {
    id: `finding:${finding.findingKey}`,
    kind: 'finding',
    rank: finding.fixRank ?? Number.MAX_SAFE_INTEGER,
    title: finding.fix.title,
    place: finding.place,
    label: `${finding.sourceName}, ${FINDING_KIND_LABELS[finding.kind].toLowerCase()}`,
    checkKey: null,
    findingKey: finding.findingKey,
    findingKind: finding.kind,
    impact: finding.fix.impact,
    effort: finding.fix.effort,
    programs: [],
    results: [],
    found: [findingProof(finding)],
    why: finding.fix.why,
    advice: finding.fix.steps.length ? [{ programs: [], steps: finding.fix.steps }] : [],
    readyFix: finding.fix.readyFix,
    open: true,
  };
}

const byRank = (a: FixView, b: FixView) => a.rank - b.rank || a.title.localeCompare(b.title);

/** "Up from Okay in June": how a word moved since the Audit before, or null when it held. */
export function movedWords(word: ScoreLabel, score: number, change: number | null, previousRunAt: string | null | undefined, config: Pick<ScoringConfig, 'labels'> = SCORING_V1): string | null {
  if (change === null) return null;
  const before = scoreLabel(score - change, config);
  if (before === word) return null;
  const rank = { Weak: 0, Okay: 1, Strong: 2 } as const;
  const direction = rank[word] > rank[before] ? 'Up' : 'Down';
  const when = previousRunAt ? ` in ${formatMonthName(previousRunAt.slice(0, 7))}` : '';
  return `${direction} from ${before}${when}`;
}

/** The kind words when a place has little in it (spec 7.6). Neither counts against the institution. */
export function thinState(place: FindingPlace, found: number, options: Pick<PlacesOptions, 'institutionType' | 'city' | 'nextAuditOn'>): ThinView {
  const next = options.nextAuditOn ? `Drishti looks again with your next Audit, on ${options.nextAuditOn}.` : 'Drishti looks again with your next Audit.';
  const small = options.institutionType === 'skilling' ? 'smaller institutes and newer courses' : 'smaller colleges and newer courses';
  if (place === 'people') {
    const seen = found === 0 ? 'nothing about you yet' : found === 1 ? 'one thread' : `${found} threads`;
    return {
      title: 'Not much said about you yet.',
      why: `That is common for ${small}. Drishti looked on Reddit, Quora and student forums and found ${seen}.`,
      helps: ['Answer the questions students ask about your courses on Quora, from a named account.', 'Ask this year’s students to share their experience in their own words.'],
      next,
    };
  }
  const seen = found === 0 ? 'no listing yet' : found === 1 ? 'one' : `${found}`;
  return {
    title: 'No listings found yet.',
    why: `That is common for ${small}. Drishti looked at news sites, college listing sites and directories and found ${seen}.`,
    helps: [`Add your institution to the listing sites students in ${options.city} use, with your programs and fees.`, 'Use the same name, address and phone everywhere.'],
    next,
  };
}

export function auditPlaces(
  audit: Pick<StoredAudit, 'checks' | 'programCount' | 'scores' | 'changes' | 'programs'>,
  findings: readonly StoredFinding[],
  options: PlacesOptions,
): AuditPlacesView {
  const config = options.config ?? SCORING_V1;
  const programCount = options.programId ? 1 : Math.max(1, audit.programCount);
  const checkGroups = groups(audit as StoredAudit, options);
  const visibleFindings = findings.filter((finding) => !finding.removed);

  const checkFixes = checkGroups.flatMap((group) => {
    const fix = checkFix(group, options, programCount);
    return fix ? [fix] : [];
  });
  const findingFixes = visibleFindings.flatMap((finding) => {
    const fix = findingFix(finding);
    return fix ? [fix] : [];
  });
  const fixes = [...checkFixes, ...findingFixes].sort(byRank);
  const fixById = new Map(fixes.map((fix) => [fix.id, fix]));

  const places = PLACES.map((place): PlaceView => {
    if (place === 'people' || place === 'other') {
      const here = visibleFindings.filter((finding) => finding.place === place);
      // What needs doing first, by the ranking; then the rest as they were found.
      const ordered = [...here].sort((a, b) => (a.fixRank ?? Number.MAX_SAFE_INTEGER) - (b.fixRank ?? Number.MAX_SAFE_INTEGER));
      const teaser = options.teaser?.[place];
      const total = teaser ? Math.max(teaser.found, here.length) : here.length;
      const placeFixes = ordered.flatMap((finding) => {
        const fix = fixById.get(`finding:${finding.findingKey}`);
        return fix ? [fix] : [];
      });
      return {
        key: place,
        name: PLACE_LABELS[place],
        covers: PLACE_COVERS[place],
        scored: false,
        found: ordered.map((finding) => ({
          id: `finding:${finding.findingKey}`,
          kind: 'finding',
          name: finding.sourceName,
          checkKey: null,
          result: null,
          share: null,
          weakestProgram: null,
          findingKind: finding.kind,
          proof: findingProof(finding),
        })),
        good: ordered.filter((finding) => findingIsGood(finding)).map((finding) => ({ id: `finding:${finding.findingKey}`, title: finding.sourceName, line: finding.line })),
        fixes: placeFixes,
        hidden: { found: Math.max(0, total - here.length), fixes: teaser ? Math.max(0, teaser.toFix - placeFixes.length) : 0 },
        thin: total < THIN_FINDINGS ? thinState(place, total, options) : null,
      };
    }

    const inPlace = checksForPlace(place).flatMap((check) => {
      const group = checkGroups.find((candidate) => candidate.key === check.key);
      return group ? [group] : [];
    });
    const found = inPlace.map((group): FoundRowView => {
      const weakest = weakestPart(group.parts) as ItemPart;
      const differ = group.parts.some((item) => item.result !== group.parts[0]?.result);
      const check = group.checks.find((candidate) => candidate.id === weakest.checkId);
      return {
        id: `check:${group.key}`,
        kind: 'check',
        name: checkName(group.key, options.institutionType, options.city),
        checkKey: group.key,
        result: weakest.result,
        share: weakest.maxPoints ? weakest.points / weakest.maxPoints : 0,
        weakestProgram: differ ? weakest.programName : null,
        findingKind: null,
        proof: proofOf(weakest, check, differ),
      };
    });
    // What's good: the checks Strong everywhere, the most points first, with what was found.
    const good = inPlace
      .filter((group) => group.parts.every((item) => item.result === 'strong'))
      .flatMap((group): Array<GoodView & { order: number }> => {
        const detail = group.parts.find((item) => item.detail)?.detail;
        if (!detail) return [];
        const rank = Math.min(...group.checks.map((check) => check.strengthRank ?? Number.MAX_SAFE_INTEGER));
        return [{ id: `check:${group.key}`, title: checkName(group.key, options.institutionType, options.city), line: detail.finding, order: rank }];
      })
      .sort((a, b) => a.order - b.order)
      .map((item) => ({ id: item.id, title: item.title, line: item.line }));
    const placeFixes = fixes.filter((fix) => fix.kind === 'check' && fix.place === place);
    const shown = placeFixes.filter((fix) => fix.open);
    return {
      key: place,
      name: PLACE_LABELS[place],
      covers: PLACE_COVERS[place],
      scored: true,
      found,
      good,
      fixes: shown,
      hidden: { found: found.filter((row) => row.proof === null).length, fixes: placeFixes.length - shown.length },
      thin: null,
    };
  });

  const scores: ScoreSet = options.programId ? (audit.programs.find((program) => program.programId === options.programId)?.scores ?? audit.scores) : audit.scores;
  const changes: ChangeSet = options.programId ? (audit.programs.find((program) => program.programId === options.programId)?.changes ?? audit.changes) : audit.changes;
  const words = PILLARS.map((pillar): WordView => {
    const word = scoreLabel(scores[pillar], config);
    const candidates = checkGroups
      .filter((group) => getCheck(group.key).pillar === pillar && group.parts.some((item) => item.result !== 'strong'))
      .map((group) => ({ group, weakest: weakestPart(group.parts) as ItemPart, gain: partGain(group.parts, programCount) }))
      .sort((a, b) => (RESULT_RANK.get(b.weakest.result) ?? 0) - (RESULT_RANK.get(a.weakest.result) ?? 0) || b.gain - a.gain);
    const first = candidates[0];
    return {
      pillar,
      name: PILLAR_LABELS[pillar],
      question: PILLAR_QUESTIONS[pillar],
      word,
      score: scores[pillar],
      fixFirst: first ? { key: first.group.key, name: checkName(first.group.key, options.institutionType, options.city), result: first.weakest.result } : null,
      moved: movedWords(word, scores[pillar], changes[pillar], options.previousRunAt, config),
    };
  });

  const open = fixes.filter((fix) => fix.open);
  const strong = checkGroups.flatMap((group) => {
    const entry = strongEntry(group, options);
    return entry ? [entry] : [];
  });
  return { words, topFixes: open.slice(0, TOP_FIXES), fixes: open, places, panel: [...open, ...strong] };
}
