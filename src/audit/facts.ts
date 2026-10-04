// Turns collected signals into the facts the scoring engine reads, and keeps the source and
// date of every fact so each result can be explained. Pure: no database, no network.

import { INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS, getCheck } from '../domain/checks.ts';
import type { ApprovalsFacts, ApprovalsValue, CheckFacts } from '../domain/facts.ts';
import type { InstitutionFacts, ProgramFacts } from '../domain/scoring/evaluate.ts';
import { resultKey } from '../domain/scoring/score.ts';
import type { CheckKey } from '../domain/types.ts';
import type { AnySignal } from '../providers/types.ts';
import type { CollectedFinding } from './record.ts';

/** A check signal as stored or as collected: which check, which program, the value and its source. */
export interface CheckSignal {
  key: CheckKey;
  programId: string | null;
  value: unknown;
  sourceUrl: string;
  /** ISO timestamp. */
  fetchedAt: string;
}

export interface FactSource {
  sourceUrl: string;
  checkedAt: string;
}

export interface CollectedFacts {
  institution: InstitutionFacts;
  programs: Map<string, ProgramFacts>;
  /** Where each fact came from, keyed by resultKey(check, programId). */
  sources: Map<string, FactSource>;
}

export class IncompleteFactsError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(`Some checks have no data yet, so no Audit was saved: ${missing.join(', ')}.`);
    this.name = 'IncompleteFactsError';
    this.missing = missing;
  }
}

/** The newest signal for each check and program (approvals keep one site and one official signal). */
function newest(signals: readonly CheckSignal[]): Map<string, CheckSignal> {
  const latest = new Map<string, CheckSignal>();
  for (const signal of signals) {
    const approvalSource = signal.key === 'approvals' ? `|${(signal.value as ApprovalsValue).source}` : '';
    const id = `${resultKey(signal.key, signal.programId)}${approvalSource}`;
    const current = latest.get(id);
    if (!current || Date.parse(signal.fetchedAt) >= Date.parse(current.fetchedAt)) latest.set(id, signal);
  }
  return latest;
}

/**
 * Facts for one Audit. Institution checks come from signals with no program; program checks
 * from each program's own signals. Throws IncompleteFactsError when anything is missing, so a
 * partial Audit is never saved.
 */
export function factsFromSignals(signals: readonly CheckSignal[], audited: ReadonlyArray<{ id: string; name: string }>): CollectedFacts {
  const latest = newest(signals);
  const sources = new Map<string, FactSource>();
  const missing: string[] = [];

  const take = <K extends CheckKey>(key: K, program: { id: string; name: string } | null): CheckFacts[K] | undefined => {
    if (key === 'approvals') return approvalsFacts(latest, program?.id ?? null, sources, missing) as CheckFacts[K] | undefined;
    const signal = latest.get(resultKey(key, program?.id ?? null));
    if (!signal) {
      missing.push(program ? `${getCheck(key).name} for ${program.name}` : getCheck(key).name);
      return undefined;
    }
    sources.set(resultKey(key, program?.id ?? null), { sourceUrl: signal.sourceUrl, checkedAt: signal.fetchedAt });
    return signal.value as CheckFacts[K];
  };

  const institution = Object.fromEntries(INSTITUTION_CHECK_KEYS.map((key) => [key, take(key, null)])) as InstitutionFacts;
  const programs = new Map<string, ProgramFacts>();
  for (const program of audited) {
    programs.set(program.id, Object.fromEntries(PROGRAM_CHECK_KEYS.map((key) => [key, take(key, program)])) as ProgramFacts);
  }

  if (missing.length) throw new IncompleteFactsError(missing);
  return { institution, programs, sources };
}

/** Approvals combine what the website shows with what official records say is held. */
function approvalsFacts(latest: Map<string, CheckSignal>, programId: string | null, sources: Map<string, FactSource>, missing: string[]): ApprovalsFacts | undefined {
  const site = latest.get(`${resultKey('approvals', programId)}|site`);
  const official = latest.get(`${resultKey('approvals', programId)}|official`);
  if (!site) {
    missing.push(getCheck('approvals').name);
    return undefined;
  }
  const shown = site.value as Extract<ApprovalsValue, { source: 'site' }>;
  const held = official ? (official.value as Extract<ApprovalsValue, { source: 'official' }>).held : null;
  sources.set(resultKey('approvals', programId), { sourceUrl: site.sourceUrl, checkedAt: site.fetchedAt });
  return { shown: shown.shown, withProof: shown.withProof, held };
}

/** The findings among collected signals (What people say, Other places), each once, with its source and date. */
export function findingsFromSignals(signals: readonly AnySignal[]): CollectedFinding[] {
  const seen = new Set<string>();
  return signals.flatMap((signal) => {
    if (signal.key !== 'finding' || seen.has(signal.value.key)) return [];
    seen.add(signal.value.key);
    return [{ ...signal.value, sourceUrl: signal.sourceUrl, checkedAt: signal.fetchedAt }];
  });
}
