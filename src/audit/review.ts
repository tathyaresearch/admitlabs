// Review before sending (spec section 25), the part with no database: what changed since the
// college's last approved Audit, and what a change the team makes does to a waiting Audit. A
// result the team changes is scored again by the same engine (src/domain/scoring), so the words,
// the score and the one ranking of fixes move with it; lines and findings taken out are kept as
// they are written. Every change becomes a row in audit_edits. Pure: the server action loads the
// Audit and saves what comes back through record_review().

import { SCORING_V1 } from '../config/scoring.v1.ts';
import { checkName, INSTITUTION_CHECK_KEYS, PROGRAM_CHECK_KEYS, type InstitutionCheckKey, type ProgramCheckKey } from '../domain/checks.ts';
import type { ReadyFix } from '../domain/ready-fix.ts';
import { outcomeRanks, rankAllFixes, rankFixes, rankWorking } from '../domain/scoring/rank.ts';
import { compareScores, resultKey, scoreAudit, type CheckOutcome, type PreviousScores } from '../domain/scoring/score.ts';
import { scoreLabel, type ScoreLabel } from '../domain/scores.ts';
import type { ScoringConfig } from '../domain/scoring-config.ts';
import { PILLAR_LABELS, PILLARS, scoringFamily, type CheckKey, type CheckResult, type Difficulty, type InstitutionType, type Pillar } from '../domain/types.ts';
import type { StoredFinding } from './places.ts';
import type { StoredAudit, StoredCheck } from './view.ts';

/** The Audit the college saw last, as the review compares with it. */
export interface ApprovedBefore {
  id: string;
  runAt: string;
  scores: StoredAudit['scores'];
  programs: StoredAudit['programs'];
  checks: ReadonlyArray<Pick<StoredCheck, 'key' | 'programId' | 'result'>>;
  findingKeys: readonly string[];
}

export interface ReviewChanges {
  words: Array<{ pillar: Pillar; name: string; word: ScoreLabel; before: ScoreLabel | null }>;
  checks: Array<{ key: CheckKey; name: string; program: string | null; before: CheckResult; after: CheckResult }>;
  findings: { added: StoredFinding[]; gone: string[] };
}

/** What changed since the last approved Audit: the words, the checks that moved, and findings new and gone. */
export function reviewChanges(
  audit: Pick<StoredAudit, 'scores' | 'checks'>,
  findings: readonly StoredFinding[],
  before: ApprovedBefore | null,
  options: { institutionType: InstitutionType; city: string; programNames: ReadonlyMap<string, string>; config?: Pick<ScoringConfig, 'labels'> },
): ReviewChanges {
  const config = options.config ?? SCORING_V1;
  const previous = new Map((before?.checks ?? []).map((check) => [resultKey(check.key, check.programId), check.result]));
  const keysBefore = new Set(before?.findingKeys ?? []);
  const live = findings.filter((finding) => !finding.removed);
  const keysNow = new Set(live.map((finding) => finding.findingKey));
  return {
    words: PILLARS.map((pillar) => ({
      pillar,
      name: PILLAR_LABELS[pillar],
      word: scoreLabel(audit.scores[pillar], config),
      before: before ? scoreLabel(before.scores[pillar], config) : null,
    })),
    checks: before
      ? audit.checks.flatMap((check) => {
          const was = previous.get(resultKey(check.key, check.programId));
          if (!was || was === check.result) return [];
          return [
            {
              key: check.key,
              name: checkName(check.key, options.institutionType, options.city),
              program: check.programId ? (options.programNames.get(check.programId) ?? null) : null,
              before: was,
              after: check.result,
            },
          ];
        })
      : [],
    findings: {
      added: before ? live.filter((finding) => !keysBefore.has(finding.findingKey)) : [],
      gone: before ? [...keysBefore].filter((key) => !keysNow.has(key)) : [],
    },
  };
}

/** The changes in one line, for To review: "Visibility Weak to Okay, 2 checks moved, 1 new finding". */
export function changesLine(changes: ReviewChanges, first: boolean): string {
  if (first) return 'First Audit: nothing to compare with';
  const words = changes.words.filter((word) => word.before && word.before !== word.word).map((word) => `${word.name} ${word.before} to ${word.word}`);
  const parts = [
    words.length ? words.join(', ') : 'No word moved',
    changes.checks.length ? `${changes.checks.length} ${changes.checks.length === 1 ? 'check' : 'checks'} moved` : null,
    changes.findings.added.length ? `${changes.findings.added.length} new ${changes.findings.added.length === 1 ? 'finding' : 'findings'}` : null,
    changes.findings.gone.length ? `${changes.findings.gone.length} ${changes.findings.gone.length === 1 ? 'finding' : 'findings'} gone` : null,
  ];
  return parts.filter(Boolean).join(', ');
}

// What a change does ------------------------------------------------------------------------------

export type ReviewChange =
  /** A result the reader got wrong: the team chooses another, with a short reason. */
  | { kind: 'result'; checkId: string; result: CheckResult; reason: string }
  /** What was seen, a fix's name, its steps or its ready fix, for a check or a finding. */
  | { kind: 'line'; on: 'check'; checkId: string; field: 'finding' | 'fix_title' | 'fix_steps' | 'ready_fix'; value: string; reason?: string }
  | { kind: 'line'; on: 'finding'; findingId: string; field: 'line' | 'fix_title' | 'fix_steps' | 'ready_fix'; value: string; reason?: string }
  /** A finding that is not about the college. */
  | { kind: 'remove'; findingId: string; reason: string };

/** Fresh advice for a check whose result the team moved below Strong, from the writer. */
export interface FreshAdvice {
  whyItMatters: string;
  steps: string[];
  difficulty: Difficulty | null;
  readyFix: ReadyFix | null;
}

export interface ReviewInput {
  audit: StoredAudit;
  findings: readonly StoredFinding[];
  /** The Audit the waiting one is compared with, for the changes it stores. */
  before: ApprovedBefore | null;
  institutionType: InstitutionType;
  config?: Pick<ScoringConfig, 'weights' | 'resultShares' | 'impact'>;
  /** When a result moves below Strong and its check had no advice, the writer's advice for it. */
  advice?: FreshAdvice | null;
}

export interface ReviewPayload {
  audit_id: string;
  scores: Record<string, number | null>;
  programs: Array<Record<string, string | number | null>>;
  checks: Array<{ id: string; result?: CheckResult; points_awarded?: number; strength_rank: number | null; fix_rank: number | null; team_checked?: boolean }>;
  details: Array<Record<string, unknown>>;
  findings: Array<Record<string, unknown>>;
  edits: Array<{ what: 'result' | 'line' | 'finding_removed'; target: string; before: string | null; after: string | null; reason: string | null }>;
}

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewError';
  }
}

/** A ready fix the team wrote as text: one text fix, with the old title kept. */
function readyFromText(value: string, old: ReadyFix | null): ReadyFix {
  return { kind: 'text', title: old?.title ?? 'Ready to copy', text: value.trim() };
}

const stepsFrom = (value: string) =>
  value
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

/**
 * The rows record_review() writes for one change. Results are scored again with the engine, and
 * every check's and finding's rank is worked out again, so the payload always carries the whole
 * ranking (a line or a finding taken out moves nothing else).
 */
export function reviewPayload(input: ReviewInput, change: ReviewChange): ReviewPayload {
  const { audit } = input;
  const config = input.config ?? SCORING_V1;
  const family = scoringFamily(input.institutionType);
  const edits: ReviewPayload['edits'] = [];
  const details: ReviewPayload['details'] = [];
  const findingRows = new Map<string, Record<string, unknown>>();
  const results = new Map(audit.checks.map((check) => [check.id, check.result]));
  let teamChecked: string | null = null;
  let removedId: string | null = null;

  if (change.kind === 'result') {
    const check = audit.checks.find((candidate) => candidate.id === change.checkId);
    if (!check) throw new ReviewError('That check is not in this Audit.');
    if (!change.reason.trim()) throw new ReviewError('Say in a few words why the result is different.');
    if (check.result === change.result) throw new ReviewError('That is the result already.');
    results.set(check.id, change.result);
    teamChecked = check.id;
    edits.push({ what: 'result', target: `check:${check.key}:${check.programId ?? 'institution'}`, before: check.result, after: change.result, reason: change.reason.trim() });
    // A result moved below Strong needs its fix: the writer's advice, when the check had none.
    if (change.result !== 'strong' && input.advice && !check.detail?.fixSteps.length) {
      details.push({
        audit_check_id: check.id,
        why_it_matters: input.advice.whyItMatters,
        fix_steps: input.advice.steps,
        ...(input.advice.difficulty ? { difficulty: input.advice.difficulty } : {}),
        ...(input.advice.readyFix ? { ready_fix: input.advice.readyFix } : {}),
      });
    }
  } else if (change.kind === 'line') {
    const value = change.value.trim();
    if (!value) throw new ReviewError('Write the line first.');
    if (change.on === 'check') {
      const check = audit.checks.find((candidate) => candidate.id === change.checkId);
      if (!check?.detail) throw new ReviewError('That check is not in this Audit.');
      const before =
        change.field === 'finding'
          ? check.detail.finding
          : change.field === 'fix_title'
            ? (check.detail.fixTitle ?? null)
            : change.field === 'fix_steps'
              ? check.detail.fixSteps.join('\n')
              : check.detail.readyFix
                ? JSON.stringify(check.detail.readyFix)
                : null;
      const row: Record<string, unknown> = { audit_check_id: check.id };
      if (change.field === 'finding') row.finding = value;
      if (change.field === 'fix_title') row.fix_title = value;
      if (change.field === 'fix_steps') row.fix_steps = stepsFrom(value);
      if (change.field === 'ready_fix') row.ready_fix = readyFromText(value, check.detail.readyFix ?? null);
      details.push(row);
      edits.push({ what: 'line', target: `check:${check.key}:${check.programId ?? 'institution'}:${change.field}`, before, after: value, reason: change.reason?.trim() || null });
    } else {
      const finding = input.findings.find((candidate) => candidate.id === change.findingId);
      if (!finding) throw new ReviewError('That finding is not in this Audit.');
      const before =
        change.field === 'line'
          ? finding.line
          : change.field === 'fix_title'
            ? (finding.fix?.title ?? null)
            : change.field === 'fix_steps'
              ? (finding.fix?.steps.join('\n') ?? null)
              : finding.fix?.readyFix
                ? JSON.stringify(finding.fix.readyFix)
                : null;
      if (change.field !== 'line' && !finding.fix) throw new ReviewError('That finding has nothing to fix.');
      const row: Record<string, unknown> = { id: finding.id };
      if (change.field === 'line') row.line = value;
      if (change.field === 'fix_title') row.fix_title = value;
      if (change.field === 'fix_steps') row.fix_steps = stepsFrom(value);
      if (change.field === 'ready_fix') row.ready_fix = readyFromText(value, finding.fix?.readyFix ?? null);
      findingRows.set(finding.id, row);
      edits.push({ what: 'line', target: `finding:${finding.findingKey}:${change.field}`, before, after: value, reason: change.reason?.trim() || null });
    }
  } else {
    const finding = input.findings.find((candidate) => candidate.id === change.findingId);
    if (!finding) throw new ReviewError('That finding is not in this Audit.');
    if (!change.reason.trim()) throw new ReviewError('Say in a few words why it is not about the college.');
    removedId = finding.id;
    findingRows.set(finding.id, { id: finding.id, removed: true });
    edits.push({ what: 'finding_removed', target: `finding:${finding.findingKey}`, before: finding.line, after: null, reason: change.reason.trim() });
  }

  // Score again, with the results as they are now.
  const programIds = audit.programs.map((program) => program.programId);
  const resultFor = (key: CheckKey, programId: string | null): CheckResult => {
    const check = audit.checks.find((candidate) => candidate.key === key && candidate.programId === programId);
    if (!check) throw new ReviewError(`The Audit has no ${key} result.`);
    return results.get(check.id) ?? check.result;
  };
  const scores = scoreAudit({
    config,
    family,
    institution: Object.fromEntries(INSTITUTION_CHECK_KEYS.map((key) => [key, resultFor(key, null)])) as Record<InstitutionCheckKey, CheckResult>,
    programs: programIds.map((id) => ({ id, results: Object.fromEntries(PROGRAM_CHECK_KEYS.map((key) => [key, resultFor(key, id)])) as Record<ProgramCheckKey, CheckResult> })),
  });
  const checkOf = new Map<CheckOutcome, StoredCheck>();
  for (const outcome of scores.outcomes) {
    const check = audit.checks.find((candidate) => candidate.key === outcome.key && candidate.programId === outcome.programId);
    if (check) checkOf.set(outcome, check);
  }
  const count = scores.programs.length;
  const difficultyOf = (outcome: CheckOutcome) => checkOf.get(outcome)?.detail?.difficulty ?? (input.advice && checkOf.get(outcome)?.id === teamChecked ? input.advice.difficulty : null) ?? 'medium';
  const working = rankWorking(scores.outcomes, count);
  const checkFixes = rankFixes(scores.outcomes, count, difficultyOf, config.impact);
  const live = input.findings.filter((finding) => !finding.removed && finding.id !== removedId && finding.fix);
  const all = rankAllFixes(
    checkFixes,
    live.map((finding) => ({ id: finding.id, impact: finding.fix?.impact ?? 'low', difficulty: finding.fix?.effort ?? 'easy' })),
  );
  const fixRanks = outcomeRanks(checkFixes.map((item) => ({ ...item, rank: all.checks.get(item) ?? item.rank })));
  const strengthRanks = outcomeRanks(working);

  const previous: PreviousScores | null = input.before
    ? {
        overall: input.before.scores.overall,
        pillars: { discovered: input.before.scores.discovered, trusted: input.before.scores.trusted, chosen: input.before.scores.chosen },
        programs: input.before.programs.map((program) => ({ programId: program.programId, ...program.scores })),
        results: new Map(input.before.checks.map((check) => [resultKey(check.key, check.programId), check.result])),
      }
    : null;
  const changes = compareScores(scores, previous);

  for (const finding of input.findings) {
    const rank = live.some((candidate) => candidate.id === finding.id) ? (all.findings.get(finding.id) ?? null) : null;
    findingRows.set(finding.id, { ...(findingRows.get(finding.id) ?? { id: finding.id }), fix_rank: rank });
  }

  return {
    audit_id: audit.id,
    scores: {
      overall: scores.overall,
      discovered: scores.pillars.discovered,
      trusted: scores.pillars.trusted,
      chosen: scores.pillars.chosen,
      overall_change: changes.overall,
      discovered_change: changes.pillars.discovered,
      trusted_change: changes.pillars.trusted,
      chosen_change: changes.pillars.chosen,
    },
    programs: scores.programs.map((program) => {
      const change = changes.programs.get(program.programId);
      return {
        program_id: program.programId,
        overall: program.overall,
        discovered: program.discovered,
        trusted: program.trusted,
        chosen: program.chosen,
        overall_change: change?.overall ?? null,
        discovered_change: change?.pillars.discovered ?? null,
        trusted_change: change?.pillars.trusted ?? null,
        chosen_change: change?.pillars.chosen ?? null,
      };
    }),
    checks: scores.outcomes.flatMap((outcome) => {
      const check = checkOf.get(outcome);
      if (!check) return [];
      const changed = check.id === teamChecked;
      return [
        {
          id: check.id,
          ...(changed ? { result: outcome.result, points_awarded: outcome.earned / 100, team_checked: true } : {}),
          strength_rank: strengthRanks.get(outcome) ?? null,
          fix_rank: fixRanks.get(outcome) ?? null,
        },
      ];
    }),
    details,
    findings: [...findingRows.values()],
    edits,
  };
}
