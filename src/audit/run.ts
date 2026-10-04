// Runs one Audit end to end: collect with the providers (mock in this build), store the
// signals, score with the engine, and save everything in one transaction. The one path for
// the app (signup and Paid refresh), the scripts (scheduled and team runs) and the seed.
//
// Uses a service-key client, so it only ever runs on the server. Plan rules are checked here
// and again inside record_audit().

import type { SupabaseClient } from '@supabase/supabase-js';
import { istDate, istParts } from '../domain/dates.ts';
import { auditSchedule, isAuditDue } from '../domain/schedule.ts';
import { institutionDetailsFromRow, programDetailsFromRow, type ProgramDetails } from '../domain/details.ts';
import { thresholdsFor } from '../domain/scoring/classify.ts';
import { parseScoringConfig } from '../domain/scoring/config.ts';
import { resultKey } from '../domain/scoring/score.ts';
import { effectiveTier, type PlanRecord } from '../domain/tiers.ts';
import { CHECK_KEYS, type AuditKind, type CheckKey, type CheckResult, type ReviewState } from '../domain/types.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';
import { collect } from '../providers/collect.ts';
import { getAnalysisProvider } from '../providers/registry.ts';
import type { InstitutionRef, ProgramRef } from '../providers/types.ts';
import { factsFromSignals, findingsFromSignals, type CheckSignal } from './facts.ts';
import { OWN_AUDIT_KINDS, prepareAudit, type AuditRecord, type AuditTrigger, type PreviousAudit } from './record.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

export class AuditRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditRunError';
  }
}

/** Paid's extra refresh for this calendar month has been used. */
export class RefreshUsedError extends AuditRunError {
  constructor() {
    super('The extra refresh for this month has been used. It comes back on the 1st.');
    this.name = 'RefreshUsedError';
  }
}

export interface RunAuditOptions {
  institutionId: string;
  asOf: Date;
  trigger: AuditTrigger;
  /** Leave out for the institution's own Audit (free, paid or client from its plan). */
  kind?: 'team' | 'rival';
  createdBy?: string | null;
  /**
   * Leave out to follow the college's Review first setting: an own Audit waits for the team when it
   * is on (spec section 25). The seed passes the state its sample needs.
   */
  review?: ReviewState;
  /** For an Audit approved straight away by a team user: who, and when. */
  approvedBy?: string | null;
  approvedAt?: Date;
  env?: Env;
}

export interface RunAuditResult {
  auditId: string;
  kind: AuditKind;
  overall: number;
  programs: number;
  signals: number;
  review: ReviewState;
  record: AuditRecord;
}

export const AUDIT_READY_TEXT = {
  first: 'Your first Audit is ready. See where you stand.',
  next: 'Your new Audit is ready. See what changed.',
} as const;

const CHECK_KEY_SET: ReadonlySet<string> = new Set(CHECK_KEYS);

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new AuditRunError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new AuditRunError(`No ${what} found.`);
  return result.data;
}

function planRecord(row: { tier: PlanRecord['tier']; starts_at: string; ends_at: string | null } | null): PlanRecord | null {
  return row ? { tier: row.tier, startsAt: new Date(row.starts_at), endsAt: row.ends_at ? new Date(row.ends_at) : null } : null;
}

/** The first moment of this calendar month and of the next, in India. */
function istMonthBounds(now: Date): { start: Date; end: Date } {
  const { year, month } = istParts(now);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const pad = (value: number) => String(value).padStart(2, '0');
  return { start: istDate(`${year}-${pad(month)}-01`), end: istDate(`${next.year}-${pad(next.month)}-01`) };
}

/** Paid manual refreshes already used this calendar month. */
export async function manualRefreshesThisMonth(db: Db, institutionId: string, now: Date): Promise<number> {
  const { start, end } = istMonthBounds(now);
  const { count, error } = await db
    .from('audits')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institutionId)
    .eq('kind', 'paid')
    .eq('trigger', 'manual')
    .gte('run_at', start.toISOString())
    .lt('run_at', end.toISOString());
  if (error) throw new AuditRunError(`Could not count refreshes: ${error.message}`);
  return count ?? 0;
}

/** The last Audit that counts for the schedule: signup or scheduled, never a manual refresh. */
export async function lastScheduledRun(db: Db, institutionId: string): Promise<Date | null> {
  const { data, error } = await db
    .from('audits')
    .select('run_at')
    .eq('institution_id', institutionId)
    .in('kind', OWN_AUDIT_KINDS)
    .in('trigger', ['signup', 'scheduled'])
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AuditRunError(`Could not read the last Audit: ${error.message}`);
  return data ? new Date(data.run_at) : null;
}

async function previousAudit(db: Db, institutionId: string, kinds: readonly AuditKind[], before: Date): Promise<PreviousAudit | null> {
  const last = await db
    .from('audits')
    .select('id, overall, discovered, trusted, chosen')
    .eq('institution_id', institutionId)
    .in('kind', kinds)
    // What changed is measured from the last Audit the college saw: an approved one (spec section 25).
    .eq('review', 'approved')
    .lt('run_at', before.toISOString())
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last.error) throw new AuditRunError(`Could not read the last Audit: ${last.error.message}`);
  if (!last.data) return null;
  const [programs, checks] = await Promise.all([
    db.from('audit_program_scores').select('program_id, overall, discovered, trusted, chosen').eq('audit_id', last.data.id),
    db.from('audit_checks').select('check_key, program_id, result').eq('audit_id', last.data.id),
  ]);
  const programRows = must(programs, 'last program scores');
  const checkRows = must(checks, 'last check results');
  return {
    id: last.data.id,
    overall: last.data.overall,
    pillars: { discovered: last.data.discovered, trusted: last.data.trusted, chosen: last.data.chosen },
    programs: programRows.map((row) => ({ programId: row.program_id, overall: row.overall, discovered: row.discovered, trusted: row.trusted, chosen: row.chosen })),
    results: new Map<string, CheckResult>(checkRows.map((row) => [resultKey(row.check_key, row.program_id), row.result])),
  };
}

export async function runAudit(db: Db, options: RunAuditOptions): Promise<RunAuditResult> {
  const env = options.env ?? process.env;
  const { institutionId, asOf } = options;

  const [institutionResult, programsResult, planResult, statusResult, configResult, detailsResult, programDetailsResult] = await Promise.all([
    db.from('institutions').select('id, slug, name, type, city, state, website, instagram, youtube, other_links').eq('id', institutionId).maybeSingle(),
    db.from('programs').select('id, name, program_key, archived_at, created_at').eq('institution_id', institutionId).order('created_at').order('name'),
    db.from('plans').select('tier, starts_at, ends_at, free_program_id').eq('institution_id', institutionId).maybeSingle(),
    db.from('institution_status').select('claimed, review_first').eq('institution_id', institutionId).maybeSingle(),
    db.from('scoring_config').select('version, weights, result_shares, thresholds, labels, impact').eq('active', true).maybeSingle(),
    // The details it added fill some blanks in the ready fixes. Never read by scoring.
    db.from('institution_details').select('*').eq('institution_id', institutionId).maybeSingle(),
    db.from('program_details').select('*').eq('institution_id', institutionId),
  ]);
  const institution = must(institutionResult, 'institution');
  const allPrograms = must(programsResult, 'programs');
  const config = parseScoringConfig(must(configResult, 'active scoring config'));
  if (planResult.error || statusResult.error) throw new AuditRunError('Could not read the plan for this institution.');
  if (detailsResult.error || programDetailsResult.error) throw new AuditRunError('Could not read the details this institution added.');

  const plan = planRecord(planResult.data);
  const own = options.kind === undefined;
  const kind: AuditKind = options.kind ?? effectiveTier(plan, asOf);
  if (own && !statusResult.data?.claimed) throw new AuditRunError(`${institution.name} has not signed up, so it has no Audits of its own.`);

  const active = allPrograms.filter((program) => program.archived_at === null);
  const audited =
    kind === 'free'
      ? active.filter((program) => program.id === planResult.data?.free_program_id)
      : active;
  if (audited.length === 0) {
    throw new AuditRunError(kind === 'free' ? 'Pick the program your free Audit covers first.' : `${institution.name} has no programs to audit.`);
  }

  if (own && kind === 'paid' && options.trigger === 'manual' && (await manualRefreshesThisMonth(db, institutionId, asOf)) > 0) {
    throw new RefreshUsedError();
  }

  // Collect: institution checks once, program checks for each audited program.
  const links = (institution.other_links ?? {}) as { facebook?: string; linkedin?: string; google_maps?: string };
  const ref: InstitutionRef = {
    id: institution.id,
    slug: institution.slug,
    name: institution.name,
    type: institution.type,
    city: institution.city,
    state: institution.state,
    website: institution.website,
    instagram: institution.instagram,
    youtube: institution.youtube,
    otherLinks: { facebook: links.facebook, linkedin: links.linkedin, googleMaps: links.google_maps },
    programKeys: active.flatMap((program) => (program.program_key ? [program.program_key] : [])),
  };
  const programRefs: ProgramRef[] = audited.map((program) => ({ id: program.id, name: program.name, programKey: program.program_key }));
  const found = [
    ...(await collect({ kind: 'institution', institution: ref }, asOf, env)),
    ...(await Promise.all(programRefs.map((program) => collect({ kind: 'program', institution: ref, program }, asOf, env)))).flat(),
  ];
  const findings = findingsFromSignals(found);
  const signals: CheckSignal[] = found
    .filter((signal) => CHECK_KEY_SET.has(signal.key))
    .map((signal) => ({ key: signal.key as CheckKey, programId: signal.programId, value: signal.value, sourceUrl: signal.sourceUrl, fetchedAt: signal.fetchedAt }));

  if (signals.length) {
    const stored = await db.from('signals').insert(
      found
        .filter((signal) => CHECK_KEY_SET.has(signal.key))
        .map((signal) => ({
          institution_id: institution.id,
          program_id: signal.programId,
          provider: signal.provider,
          check_key: signal.key as CheckKey,
          value: JSON.parse(JSON.stringify(signal.value)) as Json,
          source_url: signal.sourceUrl,
          fetched_at: signal.fetchedAt,
        })),
    );
    if (stored.error) throw new AuditRunError(`Could not store signals: ${stored.error.message}`);
  }

  const named = audited.map((program) => ({ id: program.id, name: program.name }));
  const previous = await previousAudit(db, institutionId, own ? OWN_AUDIT_KINDS : [kind], asOf);
  const programNames = new Map(allPrograms.map((program) => [program.id, program.name]));
  const programDetails = new Map<string, ProgramDetails>(
    (programDetailsResult.data ?? []).flatMap((row) => {
      const name = programNames.get(row.program_id);
      return name ? [[name, programDetailsFromRow(row)] as const] : [];
    }),
  );
  const review: ReviewState = options.review ?? (own && (statusResult.data?.review_first ?? true) ? 'waiting' : 'approved');
  const { record, evaluation } = await prepareAudit(
    {
      institutionId,
      institutionType: institution.type,
      kind,
      trigger: options.trigger,
      runAt: asOf,
      createdBy: options.createdBy ?? null,
      config,
      thresholds: thresholdsFor(config),
      programs: named,
      collected: factsFromSignals(signals, named),
      findings,
      previous,
      context: {
        institutionName: institution.name,
        city: institution.city,
        programNames: active.map((program) => program.name),
        institutionDetails: detailsResult.data ? institutionDetailsFromRow(detailsResult.data) : null,
        programDetails,
      },
      review,
    },
    getAnalysisProvider(env),
  );

  // A new Audit lands on Home's What changed; the first one on the Audit. A waiting one tells nobody until it is approved.
  const notification = own && review === 'approved' ? (previous ? { text: AUDIT_READY_TEXT.next, link: '/#changed' } : { text: AUDIT_READY_TEXT.first, link: '/audit' }) : null;
  const approval = review === 'approved' ? { approved_at: (options.approvedAt ?? asOf).toISOString(), approved_by: options.approvedBy ?? null } : {};
  const saved = await db.rpc('record_audit', { payload: JSON.parse(JSON.stringify({ ...record, ...approval, notification })) as Json });
  if (saved.error) {
    if (saved.error.message.includes('refresh_used')) throw new RefreshUsedError();
    throw new AuditRunError(`Could not save the Audit: ${saved.error.message}`);
  }

  return { auditId: saved.data, kind, overall: evaluation.overall, programs: named.length, signals: signals.length, review, record };
}

export interface DueAudit {
  institutionId: string;
  name: string;
  tier: AuditKind;
}

/** Institutions whose scheduled Audit is due on `now` (spec section 11). */
export async function dueAudits(db: Db, now: Date): Promise<DueAudit[]> {
  const [plans, statuses, institutions] = await Promise.all([
    db.from('plans').select('institution_id, tier, starts_at, ends_at'),
    db.from('institution_status').select('institution_id, claimed'),
    db.from('institutions').select('id, name'),
  ]);
  const claimed = new Set(must(statuses, 'institution status').flatMap((row) => (row.claimed ? [row.institution_id] : [])));
  const names = new Map(must(institutions, 'institutions').map((row) => [row.id, row.name]));
  const due: DueAudit[] = [];
  for (const row of must(plans, 'plans')) {
    if (!claimed.has(row.institution_id)) continue;
    const schedule = auditSchedule(planRecord(row), now);
    if (!schedule) continue;
    if (isAuditDue(schedule, await lastScheduledRun(db, row.institution_id), now)) {
      due.push({ institutionId: row.institution_id, name: names.get(row.institution_id) ?? row.institution_id, tier: schedule.tier });
    }
  }
  return due;
}
