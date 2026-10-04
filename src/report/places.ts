// The Audit by place as the PDFs print it (spec sections 12 and 13): the three words, each place
// with what was found and its proof, what's good and what to fix, a fix in detail and a fix as one
// short row. Shared by the monthly report and the shared Audit, so both read like the Audit on
// screen. Every list has a limit, so each page has a known largest size. Pure.

import type { AuditPlacesView, FixView, ProofView, WordView } from '../audit/places.ts';
import type { AddedByYou } from '../domain/details.ts';
import { formatDate, hostAndPath, joinNames } from '../domain/format.ts';
import type { ReadyFix } from '../domain/ready-fix.ts';
import type { ScoreLabel } from '../domain/scores.ts';
import { EFFORT_LABELS, FINDING_KIND_LABELS, IMPACT_LABELS, PLACE_LABELS, RESULT_LABELS, type CheckKey, type CheckResult, type Impact, type Pillar, type Place } from '../domain/types.ts';
import { platformFromUrl, type Platform } from '../graphics/platforms.ts';

export const PLACE_LIMITS = {
  /** What's good and what to fix in each place; the rest are counted, and in Drishti. */
  good: 3,
  fixes: 3,
  /** Steps of a fix in detail; the rest are in Drishti. */
  steps: 3,
  /** Lines of a ready fix in the PDF; the whole of it is in Drishti, with Copy. */
  readyLines: 4,
  /** Proof lines of a fix in detail, program by program. */
  proof: 2,
} as const;

export interface ReportWord {
  pillar: Pillar;
  name: string;
  question: string;
  word: ScoreLabel;
  /** "Up from Okay in August", or null when it held. */
  moved: string | null;
  /** What holds it back most, as the Audit says it: "Fees, Weak". */
  fixFirst: string | null;
}

export interface ReportProof {
  line: string | null;
  /** "site.example/programs/bba". */
  source: string | null;
  /** Where the source points, for its mark. */
  platform: Platform | null;
  date: string | null;
  program: string | null;
  /** "Checked by the AdmitLabs team". */
  byTeam: boolean;
}

/** One thing found in a place: what's good, or what to fix, with its proof. */
export interface ReportPlaceItem {
  title: string;
  /** For a fix, the check or the finding as a small label: "Fees", "Quora, unanswered". */
  label: string | null;
  checkKey: CheckKey | null;
  /** A check's result (its weakest program's), or null for a finding. */
  result: CheckResult | null;
  /** A finding's kind, as a word: "Good", "Complaint", "Unanswered". */
  kind: string | null;
  /** A fix's impact: "Impact High". */
  impact: string | null;
  proof: ReportProof | null;
}

export interface ReportPlace {
  key: Place;
  name: string;
  covers: string;
  scored: boolean;
  good: ReportPlaceItem[];
  fixes: ReportPlaceItem[];
  /** Over the limits: in Drishti. */
  moreGood: number;
  moreFixes: number;
  /** The kind words when little is found (spec 7.6). Never counts against the institution. */
  thin: { title: string; why: string } | null;
}

/** A fix in detail, as the Fix panel orders it: the fix, what was found, why, the steps, the ready fix. */
export interface ReportFix {
  /** Its place in the list. */
  rank: number;
  title: string;
  /** "Website, Fees", or "What people say, Quora, unanswered". */
  where: string;
  checkKey: CheckKey | null;
  impact: Impact;
  effort: string | null;
  /** "BBA and MBA", "5 programs", or null for the whole institution. */
  programs: string | null;
  found: ReportProof[];
  why: string | null;
  steps: string[];
  moreSteps: number;
  /** The ready fix, shortened: its text lines, a table's first rows or an outline's first headings. The whole of it is in Drishti, with Copy. */
  readyFix: { title: string; lines: string[]; table: { head: string[]; rows: string[][] } | null; outline: Array<{ heading: string; line: string }>; more: number } | null;
  /** What the institution added that relates to it: labelled, never scored. */
  added: AddedByYou | null;
}

/** A fix as one short row: the rest of the list. */
export interface ReportFixRow {
  rank: number;
  title: string;
  where: string;
  checkKey: CheckKey | null;
  impact: Impact;
  effort: string | null;
}

export function reportWords(words: readonly WordView[]): ReportWord[] {
  return words.map((word) => ({
    pillar: word.pillar,
    name: word.name,
    question: word.question,
    word: word.word,
    moved: word.moved,
    fixFirst: word.fixFirst ? `${word.fixFirst.name}, ${RESULT_LABELS[word.fixFirst.result]}` : null,
  }));
}

export function reportProof(proof: ProofView): ReportProof {
  return {
    line: proof.line,
    source: proof.url ? hostAndPath(proof.url) : null,
    platform: proof.url ? platformFromUrl(proof.url) : null,
    date: proof.date ? formatDate(proof.date) : null,
    program: proof.program,
    byTeam: proof.byTeam,
  };
}

/** "Impact High". */
export const impactText = (impact: Impact): string => `Impact ${IMPACT_LABELS[impact]}`;

/** "BBA and MBA", or "5 programs" when there are more than three. */
export function programsText(programs: readonly string[]): string | null {
  if (programs.length === 0) return null;
  return programs.length > 3 ? `${programs.length} programs` : joinNames(programs);
}

/** Each place as the PDFs print it: what's good and what to fix, side by side, each with its proof. */
export function placesFor(view: AuditPlacesView): ReportPlace[] {
  return view.places.map((place) => {
    const found = new Map(place.found.map((row) => [row.id, row]));
    const good = place.good.slice(0, PLACE_LIMITS.good).map((item): ReportPlaceItem => {
      const row = found.get(item.id);
      return {
        title: item.title,
        label: null,
        checkKey: row?.checkKey ?? null,
        result: row?.result ?? null,
        kind: row?.findingKind ? FINDING_KIND_LABELS[row.findingKind] : null,
        impact: null,
        proof: row?.proof ? reportProof(row.proof) : { line: item.line, source: null, platform: null, date: null, program: null, byTeam: false },
      };
    });
    const fixes = place.fixes.slice(0, PLACE_LIMITS.fixes).map((fix): ReportPlaceItem => {
      const row = found.get(fix.id);
      const proof = fix.found[0];
      return {
        title: fix.title,
        label: fix.label,
        checkKey: fix.checkKey,
        result: row?.result ?? null,
        kind: fix.findingKind ? FINDING_KIND_LABELS[fix.findingKind] : null,
        impact: impactText(fix.impact),
        proof: proof ? reportProof(proof) : null,
      };
    });
    return {
      key: place.key,
      name: place.name,
      covers: place.covers,
      scored: place.scored,
      good,
      fixes,
      moreGood: Math.max(0, place.good.length - good.length),
      moreFixes: Math.max(0, place.fixes.length - fixes.length) + place.hidden.fixes,
      thin: place.thin ? { title: place.thin.title, why: place.thin.why } : null,
    };
  });
}

function where(fix: FixView): string {
  return `${PLACE_LABELS[fix.place]}, ${fix.label}`;
}

export function fixRowOf(fix: FixView, rank: number): ReportFixRow {
  return { rank, title: fix.title, where: where(fix), checkKey: fix.checkKey, impact: fix.impact, effort: fix.effort ? `Effort ${EFFORT_LABELS[fix.effort]}` : null };
}

/** A ready fix, shortened for the page. */
export function shortReadyFix(ready: ReadyFix): NonNullable<ReportFix['readyFix']> {
  const limit = PLACE_LIMITS.readyLines;
  switch (ready.kind) {
    case 'text': {
      const lines = ready.text.split('\n').filter((line) => line.trim());
      return { title: ready.title, lines: lines.slice(0, limit), table: null, outline: [], more: Math.max(0, lines.length - limit) };
    }
    case 'table':
      return { title: ready.title, lines: [], table: { head: [...ready.head], rows: ready.rows.slice(0, limit - 1).map((row) => [...row]) }, outline: [], more: Math.max(0, ready.rows.length - (limit - 1)) };
    case 'outline':
      return { title: ready.title, lines: [], table: null, outline: ready.items.slice(0, limit).map((item) => ({ ...item })), more: Math.max(0, ready.items.length - limit) };
  }
}

export function fixDetailOf(fix: FixView, rank: number, added: AddedByYou | null = null): ReportFix {
  // The steps once when every program needs the same, otherwise the first program's, named.
  const advice = fix.advice[0];
  const steps = advice?.steps ?? [];
  return {
    rank,
    title: fix.title,
    where: where(fix),
    checkKey: fix.checkKey,
    impact: fix.impact,
    effort: fix.effort ? `Effort ${EFFORT_LABELS[fix.effort]}` : null,
    programs: programsText(fix.programs),
    found: fix.found.slice(0, PLACE_LIMITS.proof).map(reportProof),
    why: fix.why,
    steps: steps.slice(0, PLACE_LIMITS.steps),
    moreSteps: Math.max(0, steps.length - PLACE_LIMITS.steps) + fix.advice.slice(1).reduce((sum, entry) => sum + entry.steps.length, 0),
    readyFix: fix.readyFix ? shortReadyFix(fix.readyFix) : null,
    added,
  };
}
