// The fictional sample world, worked out in memory: Audits through the live path (mock providers,
// then the scoring engine), each rival's Audit, the Rivals 3 things to do and the Demand pulls.
// No database. The product page, its sample report and the tests are built from it, so they
// always match what Drishti shows for the same institution.
//
// The mock providers are used whatever the provider settings say: the sample world is fictional.
// Not exported from ./index.ts, because it imports the providers, which import the sample data.

import { factsFromSignals, findingsFromSignals, type CheckSignal } from '../audit/facts.ts';
import type { StoredFinding } from '../audit/places.ts';
import { prepareAudit, type AuditRecord, type PreparedAudit, type PreviousAudit } from '../audit/record.ts';
import type { HistoryRow, StoredAudit } from '../audit/view.ts';
import { PROVIDER_KEYS } from '../config/providers.ts';
import { RIVAL_RULES } from '../config/rivals.ts';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { ideaItems, pulledItems } from '../demand/items.ts';
import { regionsFor, type DemandRegion } from '../demand/regions.ts';
import { pullDayOf } from '../demand/schedule.ts';
import type { DemandRow } from '../demand/view.ts';
import { istDate, monthKey } from '../domain/dates.ts';
import { resultKey } from '../domain/scoring/score.ts';
import { effectiveTier, paidPlanEndsAt, type PlanRecord } from '../domain/tiers.ts';
import { CHECK_KEYS, type AuditKind, type AuditTrigger, type CheckKey, type InstitutionType } from '../domain/types.ts';
import { collect } from '../providers/collect.ts';
import { mockAnalysis } from '../providers/mock/index.ts';
import type { InstitutionRef } from '../providers/types.ts';
import type { RivalLesson } from '../report/things.ts';
import { compareChecks, type CheckScore, type ScoreSet } from '../rivals/compare.ts';
import { rivalOpportunities } from '../rivals/opportunities.ts';
import { SAMPLE_INSTITUTION_DETAILS, SAMPLE_PROGRAM_DETAILS } from './details.ts';
import { institutionId, sampleInstitution, SAMPLE_CONTENT, SAMPLE_MOVES, SAMPLE_RIVALS, SAMPLE_RUNS, toInstitutionRef, toProgramRefs } from './index.ts';

const DAY_MS = 86_400_000;
const KEYS: ReadonlySet<string> = new Set(CHECK_KEYS);

/** Every provider on its mock, whatever the settings say. */
export const MOCK_ENV: Readonly<Record<string, string>> = Object.fromEntries(PROVIDER_KEYS.map((key) => [`DRISHTI_PROVIDER_${key.toUpperCase()}`, 'mock']));

export interface SampleAudit extends PreparedAudit {
  /** A stable id, so changes and history line up: slug, kind and day. */
  id: string;
  /** Program names by program id. */
  names: Map<string, string>;
  type: InstitutionType;
  institution: InstitutionRef;
}

export interface SampleAuditOptions {
  kind?: AuditKind;
  trigger?: AuditTrigger;
  previous?: PreviousAudit | null;
  /** Only these programs (by key). All programs when left out. */
  programKeys?: readonly string[];
}

/** One Audit of a sample institution on a day (10 am, India time), through the live path. */
export async function sampleAudit(slug: string, day: string, options: SampleAuditOptions = {}): Promise<SampleAudit> {
  const sample = sampleInstitution(slug);
  const institution = toInstitutionRef(sample);
  const kind = options.kind ?? 'paid';
  const asOf = istDate(day, 10);
  const programs = toProgramRefs(sample).filter((program) => !options.programKeys || options.programKeys.includes(program.programKey ?? ''));
  const found = [
    ...(await collect({ kind: 'institution', institution }, asOf, MOCK_ENV)),
    ...(await Promise.all(programs.map((program) => collect({ kind: 'program', institution, program }, asOf, MOCK_ENV)))).flat(),
  ];
  const signals: CheckSignal[] = found
    .filter((signal) => KEYS.has(signal.key))
    .map((signal) => ({ key: signal.key as CheckKey, programId: signal.programId, value: signal.value, sourceUrl: signal.sourceUrl, fetchedAt: signal.fetchedAt }));
  const named = programs.map((program) => ({ id: program.id, name: program.name }));
  const prepared = await prepareAudit(
    {
      institutionId: institution.id,
      institutionType: sample.type,
      kind,
      trigger: options.trigger ?? 'scheduled',
      runAt: asOf,
      createdBy: null,
      config: SCORING_V1,
      thresholds: SCORING_V1.thresholds,
      programs: named,
      collected: factsFromSignals(signals, named),
      findings: findingsFromSignals(found),
      previous: options.previous ?? null,
      context: {
        institutionName: sample.name,
        city: sample.city,
        programNames: sample.programs.map((program) => program.name),
        institutionDetails: SAMPLE_INSTITUTION_DETAILS[slug] ?? null,
        programDetails: new Map(
          SAMPLE_PROGRAM_DETAILS.flatMap((row) => {
            const program = row.slug === slug ? sample.programs.find((candidate) => candidate.programKey === row.programKey) : undefined;
            return program ? [[program.name, row.details] as const] : [];
          }),
        ),
      },
    },
    mockAnalysis,
  );
  return { ...prepared, id: `${slug}-${kind}-${day}`, names: new Map(named.map((program) => [program.id, program.name])), type: sample.type, institution };
}

/** The Audit as the next one sees it: its scores and every check result. */
export function previousOf(audit: Pick<SampleAudit, 'id' | 'record'>): PreviousAudit {
  const { record } = audit;
  return {
    id: audit.id,
    overall: record.overall,
    pillars: { discovered: record.discovered, trusted: record.trusted, chosen: record.chosen },
    programs: record.programs.map((program) => ({
      programId: program.program_id,
      overall: program.overall,
      discovered: program.discovered,
      trusted: program.trusted,
      chosen: program.chosen,
    })),
    results: new Map(record.checks.map((check) => [resultKey(check.check_key, check.program_id), check.result])),
  };
}

/** The record as a viewer reads it back. `freeDetails` hides details outside the top 3, as the database does for Free. */
export function storedAudit(record: AuditRecord, options: { id?: string; previousAuditId?: string | null; freeDetails?: boolean } = {}): StoredAudit {
  return {
    id: options.id ?? 'audit',
    runAt: record.run_at,
    kind: record.kind,
    trigger: record.trigger,
    programCount: record.programs.length,
    previousAuditId: options.previousAuditId ?? null,
    scores: { overall: record.overall, discovered: record.discovered, trusted: record.trusted, chosen: record.chosen },
    changes: { overall: record.overall_change, discovered: record.discovered_change, trusted: record.trusted_change, chosen: record.chosen_change },
    programs: record.programs.map((program) => ({
      programId: program.program_id,
      scores: { overall: program.overall, discovered: program.discovered, trusted: program.trusted, chosen: program.chosen },
      changes: { overall: program.overall_change, discovered: program.discovered_change, trusted: program.trusted_change, chosen: program.chosen_change },
    })),
    checks: record.checks.map((check, index) => {
      const open = !options.freeDetails || (check.strength_rank ?? 99) <= 3 || (check.fix_rank ?? 99) <= 3;
      return {
        id: `check-${index}`,
        programId: check.program_id,
        pillar: check.pillar,
        key: check.check_key,
        result: check.result,
        pointsAwarded: check.points_awarded,
        pointsMax: check.points_max,
        strengthRank: check.strength_rank,
        fixRank: check.fix_rank,
        previousResult: check.previous_result,
        checkedAt: check.checked_at,
        detail: open
          ? { finding: check.finding, whyItMatters: check.why_it_matters, howToFix: check.how_to_fix, fixSteps: check.fix_steps, difficulty: check.difficulty, sourceUrl: check.source_url, readyFix: check.ready_fix }
          : null,
      };
    }),
  };
}

/** The record's findings as a viewer reads them back. `freeTop` keeps only those among the top 3 fixes, as the database does for Free. */
export function storedFindingsOf(record: AuditRecord, options: { freeTop?: boolean } = {}): StoredFinding[] {
  return record.findings
    .map((finding, index): StoredFinding => ({
      id: `finding-${index}`,
      place: finding.place,
      kind: finding.kind,
      findingKey: finding.finding_key,
      line: finding.line,
      sourceName: finding.source_name,
      sourceUrl: finding.source_url,
      checkedAt: finding.checked_at,
      repeats: finding.repeats,
      listing: finding.listing,
      fix: finding.fix ? { title: finding.fix.title, why: finding.fix.why, steps: finding.fix.steps, readyFix: finding.fix.ready_fix, effort: finding.fix.effort, impact: finding.fix.impact } : null,
      fixRank: finding.fix_rank,
      removed: false,
    }))
    .filter((finding) => !options.freeTop || (finding.fixRank ?? 99) <= 3);
}

/** A sample institution's plan, dated as the seed dates it. */
export function samplePlan(slug: string): PlanRecord | null {
  const plan = sampleInstitution(slug).plan;
  if (!plan) return null;
  const startsAt = istDate(plan.startsAt, 10);
  const endsAt = plan.tier === 'paid' ? paidPlanEndsAt(startsAt) : plan.endsAt ? istDate(plan.endsAt, 10) : null;
  return { tier: plan.tier, startsAt, endsAt };
}

/** The kind of an institution's own Audits: its plan's tier (Free covers its one program only). */
function ownKind(slug: string): { kind: AuditKind; programKeys?: readonly string[] } {
  const plan = sampleInstitution(slug).plan;
  if (plan?.tier === 'paid' || plan?.tier === 'client') return { kind: plan.tier };
  return { kind: 'free', programKeys: plan?.freeProgramKey ? [plan.freeProgramKey] : undefined };
}

/**
 * Every sample run of one kind up to and including `until` (a day), oldest first, each with the
 * one before as its previous Audit: the institution's own Audits, or Drishti's rival Audits of it.
 */
export async function sampleAuditChain(slug: string, runs: 'own' | 'rival', until: string): Promise<SampleAudit[]> {
  const own = runs === 'own' ? ownKind(slug) : { kind: 'rival' as const };
  const chain: SampleAudit[] = [];
  for (const run of SAMPLE_RUNS[slug] ?? []) {
    // A run still waiting for the team's review is not one the institution has seen.
    if (run.kind !== runs || run.day > until || run.waiting) continue;
    const previous = chain.length ? previousOf(chain[chain.length - 1] as SampleAudit) : null;
    chain.push(await sampleAudit(slug, run.day, { ...own, trigger: run.trigger, previous }));
  }
  return chain;
}

export function historyOf(chain: readonly SampleAudit[]): HistoryRow[] {
  return chain.map((audit) => ({
    id: audit.id,
    runAt: audit.record.run_at,
    scores: { overall: audit.record.overall, discovered: audit.record.discovered, trusted: audit.record.trusted, chosen: audit.record.chosen },
  }));
}

export function scoresOf(record: AuditRecord): ScoreSet {
  return { overall: record.overall, discovered: record.discovered, trusted: record.trusted, chosen: record.chosen };
}

/** Every check of an Audit as the rival comparison reads it, programs matched by their key. */
export function checkScoresOf(audit: SampleAudit): CheckScore[] {
  const sample = sampleInstitution(audit.institution.slug);
  const keys = new Map(toProgramRefs(sample).map((program) => [program.id, program.programKey ?? program.name.toLowerCase()]));
  return audit.record.checks.map((check, index) => ({
    checkId: `${audit.id}-check-${index}`,
    key: check.check_key,
    pillar: check.pillar,
    programKey: check.program_id ? (keys.get(check.program_id) ?? check.program_id) : null,
    programName: check.program_id ? (audit.names.get(check.program_id) ?? 'Program') : null,
    result: check.result,
    points: check.points_awarded,
    maxPoints: check.points_max,
    checkedAt: check.checked_at,
    finding: check.finding,
    sourceUrl: check.source_url,
  }));
}

export interface SampleRival {
  id: string;
  slug: string;
  name: string;
  /** Drishti's latest rival Audit of it up to the day, or null before the first one. */
  audit: SampleAudit | null;
}

/** The rivals an institution tracks, in name order, each with its latest rival Audit up to `until`. */
export async function sampleRivals(slug: string, until: string): Promise<SampleRival[]> {
  const slugs = SAMPLE_RIVALS.filter(([tracker]) => tracker === slug).map(([, rival]) => rival);
  const rivals = await Promise.all(
    slugs.map(async (rival) => {
      const chain = await sampleAuditChain(rival, 'rival', until);
      return { id: institutionId(rival), slug: rival, name: sampleInstitution(rival).name, audit: chain[chain.length - 1] ?? null };
    }),
  );
  return rivals.sort((a, b) => a.name.localeCompare(b.name));
}

export interface SampleMoveRow {
  rivalId: string;
  kind: (typeof SAMPLE_MOVES)[number]['kind'];
  description: string;
  sourceUrl: string;
  /** ISO time the weekly check found it (9 am on the day). */
  detectedAt: string;
}

/** Moves the weekly check found on these rivals' websites from `from` up to `to`, newest first. */
export function sampleMoves(rivalSlugs: readonly string[], from: Date, to: Date): SampleMoveRow[] {
  return SAMPLE_MOVES.filter((move) => rivalSlugs.includes(move.slug))
    .map((move) => ({
      rivalId: institutionId(move.slug),
      kind: move.kind,
      description: move.description,
      sourceUrl: `${sampleInstitution(move.slug).website}${move.path}`,
      detectedAt: istDate(move.detectedAt, 9).toISOString(),
    }))
    .filter((move) => {
      const at = new Date(move.detectedAt).getTime();
      return at >= from.getTime() && at <= to.getTime();
    })
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

/**
 * The Rivals 3 things to do on a day (Paid and Client only), as the monthly job writes them:
 * from the institution's latest Audit, each rival's latest rival Audit, the month's best posts
 * and the moves of the last 30 days.
 */
export async function sampleRivalLessons(slug: string, day: string): Promise<RivalLesson[]> {
  const asOf = istDate(day, 9);
  // Paid and Client only, as the job does.
  if (effectiveTier(samplePlan(slug), asOf) === 'free') return [];
  const [ownChain, rivals] = await Promise.all([sampleAuditChain(slug, 'own', day), sampleRivals(slug, day)]);
  const own = ownChain[ownChain.length - 1];
  if (!own || rivals.length === 0) return [];
  const yours = checkScoresOf(own);
  const rivalSlugs = rivals.map((rival) => rival.slug);
  const month = day.slice(0, 7);
  const posts = SAMPLE_CONTENT.filter((post) => rivalSlugs.includes(post.slug) && post.month <= month && istDate(post.postedAt, 12).getTime() <= asOf.getTime());
  const latestMonth = posts.map((post) => post.month).sort().pop();
  const names = new Map(rivals.map((rival) => [rival.id, rival.name]));
  const ref = (id: string) => ({ id, name: names.get(id) ?? 'A rival' });

  const opportunities = rivalOpportunities({
    rivals: rivals.flatMap((rival) => (rival.audit ? [{ id: rival.id, name: rival.name, comparisons: compareChecks(yours, checkScoresOf(rival.audit)) }] : [])),
    posts: posts
      .filter((post) => post.month === latestMonth)
      .map((post) => ({ rival: ref(institutionId(post.slug)), platform: post.platform, title: post.title, views: post.metrics.views, whyItWorked: post.whyItWorked })),
    moves: sampleMoves(rivalSlugs, new Date(asOf.getTime() - RIVAL_RULES.movesWindowDays * DAY_MS), asOf).map((move) => ({
      rival: ref(move.rivalId),
      kind: move.kind,
      description: move.description,
      detectedAt: move.detectedAt,
    })),
  });
  const texts = await mockAnalysis.rivalActions({ institutionType: own.type, opportunities });
  return opportunities.map((item, index) => ({
    text: texts[index]?.text ?? '',
    detail: texts[index]?.detail ?? null,
    checkKey: item.type === 'gap' ? item.key : null,
    rivalId: item.type === 'gap' ? (item.rivals[0]?.id ?? null) : item.rival.id,
    effort: texts[index]?.effort ?? null,
    month: monthKey(asOf),
  }));
}

/**
 * The month's Demand for the institution's city, one pull per program on the pull day, as the
 * monthly job collects it: grouped items, ranked, plus the content ideas.
 */
export async function sampleDemand(slug: string, month: string): Promise<{ region: DemandRegion; rows: DemandRow[]; pulledAt: string }> {
  const sample = sampleInstitution(slug);
  const region = regionsFor(sample).city;
  const pulledAt = pullDayOf(month);
  const rows: DemandRow[] = [];
  for (const program of sample.programs) {
    const target = { kind: 'region' as const, scope: region.scope, region: region.region, state: region.state, programKey: program.programKey };
    const { items, basis } = pulledItems(await collect(target, pulledAt, MOCK_ENV));
    const ideas = await mockAnalysis.contentIdeas({ programKey: program.programKey, region: { scope: region.scope, region: region.region, state: region.state }, ...basis });
    [...items, ...ideaItems(ideas, pulledAt)].forEach((item, index) => {
      rows.push({
        id: `${program.programKey}-${item.kind}-${index}`,
        programKey: program.programKey,
        programName: program.name,
        month,
        kind: item.kind,
        text: item.text,
        language: item.language,
        count: item.count,
        changePct: item.changePct,
        rank: item.rank,
        sourceUrl: item.sourceUrl,
        foundAt: item.foundAt,
        meta: item.meta,
      });
    });
  }
  return { region, rows, pulledAt: pulledAt.toISOString() };
}
