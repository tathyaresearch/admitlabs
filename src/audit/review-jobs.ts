// Review before sending, the part with the database (spec section 25): the To review list, one
// waiting Audit with what it is compared with, a change the team makes (the engine scores it again;
// a result moved below Strong gets its fix from the writer, from the facts the Audit collected),
// and Approve and send. The team's pages call these with the team's own session, so row level
// security and the database functions check the team again; the sample world calls them with the
// service key, naming the team user. No Next.js here, so Node runs it in the seed and the tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import { institutionDetailsFromRow, programDetailsFromRow, type ProgramDetails } from '../domain/details.ts';
import type { CheckResult, InstitutionType, Tier } from '../domain/types.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';
import { getAnalysisProvider } from '../providers/registry.ts';
import { factsFromSignals, type CheckSignal } from './facts.ts';
import type { StoredFinding } from './places.ts';
import { storedAuditById, storedFindings } from './read.ts';
import { changesLine, reviewChanges, reviewPayload, ReviewError, type ApprovedBefore, type FreshAdvice, type ReviewChange, type ReviewChanges } from './review.ts';
import { sendAuditReadyEmails } from './ready-jobs.ts';
import { AUDIT_READY_TEXT } from './run.ts';
import type { StoredAudit } from './view.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

export { ReviewError };

export interface ReviewInstitution {
  id: string;
  name: string;
  type: InstitutionType;
  city: string;
  tier: Tier;
  freeProgram: string | null;
}

export interface ReviewState {
  audit: StoredAudit & { institutionId: string; review: 'waiting' | 'approved' };
  findings: StoredFinding[];
  before: ApprovedBefore | null;
  institution: ReviewInstitution;
  names: Map<string, string>;
  changes: ReviewChanges;
  /** Every change already made in this review, oldest first. */
  edits: Array<{ what: string; target: string; before: string | null; after: string | null; reason: string | null; by: string | null; at: string }>;
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new ReviewError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new ReviewError(`No ${what} found.`);
  return result.data;
}

async function institutionOf(db: Db, institutionId: string): Promise<{ institution: ReviewInstitution; names: Map<string, string> }> {
  const [row, plan, programs] = await Promise.all([
    db.from('institutions').select('id, name, type, city').eq('id', institutionId).maybeSingle(),
    db.from('plans').select('tier, starts_at, ends_at, free_program_id').eq('institution_id', institutionId).maybeSingle(),
    db.from('programs').select('id, name').eq('institution_id', institutionId),
  ]);
  const institution = must(row, 'the institution');
  const names = new Map(must(programs, 'programs').map((program) => [program.id, program.name]));
  const now = Date.now();
  const tier: Tier =
    !plan.data || Date.parse(plan.data.starts_at) > now || (plan.data.ends_at && Date.parse(plan.data.ends_at) <= now) ? 'free' : plan.data.tier;
  return {
    institution: { ...institution, tier, freeProgram: plan.data?.free_program_id ? (names.get(plan.data.free_program_id) ?? null) : null },
    names,
  };
}

/** The Audit the college saw last before this one: the comparison for what changed. */
async function approvedBefore(db: Db, audit: StoredAudit & { institutionId: string }): Promise<ApprovedBefore | null> {
  const { data, error } = await db
    .from('audits')
    .select('id')
    .eq('institution_id', audit.institutionId)
    .in('kind', ['free', 'paid', 'client'])
    .eq('review', 'approved')
    .lt('run_at', audit.runAt)
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ReviewError(`Could not read the Audit before: ${error.message}`);
  if (!data) return null;
  const [previous, findings] = await Promise.all([storedAuditById(db, data.id), storedFindings(db, data.id)]);
  if (!previous) return null;
  return {
    id: previous.id,
    runAt: previous.runAt,
    scores: previous.scores,
    programs: previous.programs,
    checks: previous.checks.map((check) => ({ key: check.key, programId: check.programId, result: check.result })),
    findingKeys: findings.map((finding) => finding.findingKey),
  };
}

export async function loadReview(db: Db, auditId: string): Promise<ReviewState | null> {
  const audit = await storedAuditById(db, auditId);
  if (!audit) return null;
  const [findings, before, { institution, names }, edits] = await Promise.all([
    storedFindings(db, auditId, { withRemoved: true }),
    approvedBefore(db, audit),
    institutionOf(db, audit.institutionId),
    db.from('audit_edits').select('what, target, before, after, reason, edited_by, edited_at').eq('audit_id', auditId).order('edited_at'),
  ]);
  const editorIds = [...new Set((edits.data ?? []).flatMap((row) => (row.edited_by ? [row.edited_by] : [])))];
  const editors = new Map<string, string>();
  if (editorIds.length) {
    const people = await db.rpc('team_people');
    for (const person of people.data ?? []) if (editorIds.includes(person.user_id)) editors.set(person.user_id, person.email);
  }
  return {
    audit,
    findings,
    before,
    institution,
    names,
    changes: reviewChanges(audit, findings, before, { institutionType: institution.type, city: institution.city, programNames: names }),
    edits: (edits.data ?? []).map((row) => ({
      what: row.what,
      target: row.target,
      before: row.before,
      after: row.after,
      reason: row.reason,
      by: row.edited_by ? (editors.get(row.edited_by) ?? null) : null,
      at: row.edited_at,
    })),
  };
}

/** The writer's fix for a check the team moved below Strong, from the facts this Audit collected. */
async function freshAdvice(db: Db, state: ReviewState, checkId: string, result: CheckResult, env: Env): Promise<FreshAdvice | null> {
  const check = state.audit.checks.find((candidate) => candidate.id === checkId);
  if (!check || result === 'strong' || check.detail?.fixSteps.length) return null;
  const [signals, details, programDetails] = await Promise.all([
    db.from('signals').select('check_key, program_id, value, source_url, fetched_at').eq('institution_id', state.audit.institutionId).lte('fetched_at', state.audit.runAt),
    db.from('institution_details').select('*').eq('institution_id', state.audit.institutionId).maybeSingle(),
    db.from('program_details').select('*').eq('institution_id', state.audit.institutionId),
  ]);
  if (signals.error) throw new ReviewError(`Could not read what this Audit collected: ${signals.error.message}`);
  const audited = state.audit.programs.map((program) => ({ id: program.programId, name: state.names.get(program.programId) ?? 'Program' }));
  const collected = factsFromSignals(
    (signals.data ?? []).map((row): CheckSignal => ({ key: row.check_key, programId: row.program_id, value: row.value, sourceUrl: row.source_url, fetchedAt: row.fetched_at })),
    audited,
  );
  const facts = check.programId === null ? (collected.institution as Record<string, unknown>)[check.key] : (collected.programs.get(check.programId) as Record<string, unknown> | undefined)?.[check.key];
  const programName = check.programId ? (state.names.get(check.programId) ?? null) : null;
  const byName = new Map<string, ProgramDetails>(
    (programDetails.data ?? []).flatMap((row) => {
      const name = state.names.get(row.program_id);
      return name ? [[name, programDetailsFromRow(row)] as const] : [];
    }),
  );
  const advice = await getAnalysisProvider(env).fixAdvice({
    checkKey: check.key,
    result,
    facts: facts as never,
    institutionType: state.institution.type,
    programName,
    context: {
      institutionName: state.institution.name,
      city: state.institution.city,
      programNames: [...state.names.values()],
      institutionDetails: details.data ? institutionDetailsFromRow(details.data) : null,
      programDetails: byName,
    },
  });
  return { whyItMatters: advice.whyItMatters, steps: advice.steps, difficulty: advice.difficulty, readyFix: advice.readyFix };
}

/** One change to a waiting Audit, saved with the scores and ranks the engine works out again. */
export async function applyReviewChange(db: Db, auditId: string, change: ReviewChange, options: { editedBy?: string | null; env?: Env } = {}): Promise<void> {
  const state = await loadReview(db, auditId);
  if (!state) throw new ReviewError('That Audit is not there.');
  if (state.audit.review !== 'waiting') throw new ReviewError('That Audit has been approved already.');
  const advice = change.kind === 'result' ? await freshAdvice(db, state, change.checkId, change.result, options.env ?? process.env) : null;
  const payload = reviewPayload({ audit: state.audit, findings: state.findings, before: state.before, institutionType: state.institution.type, advice }, change);
  const saved = await db.rpc('record_review', { payload: JSON.parse(JSON.stringify({ ...payload, ...(options.editedBy ? { edited_by: options.editedBy } : {}) })) as Json });
  if (saved.error) {
    if (saved.error.message.includes('not_waiting')) throw new ReviewError('That Audit has been approved already.');
    throw new ReviewError(`That change did not save: ${saved.error.message}`);
  }
}

/**
 * Approve and send: the Audit shows, marks done are checked, the college hears it is ready, and on
 * Free the Audit ready email goes (`emails: false` keeps it back: the seed's past). The approval
 * stands whether or not the email went.
 */
export async function approveAudit(db: Db, auditId: string, options: { by?: string | null; at?: Date; emails?: boolean; env?: Env } = {}): Promise<void> {
  const state = await loadReview(db, auditId);
  if (!state) throw new ReviewError('That Audit is not there.');
  if (state.audit.review !== 'waiting') throw new ReviewError('That Audit has been approved already.');
  const notice = state.before ? { text: AUDIT_READY_TEXT.next, link: '/#changed' } : { text: AUDIT_READY_TEXT.first, link: '/audit' };
  const saved = await db.rpc('approve_audit', {
    p_audit: auditId,
    p_notice: notice.text,
    p_link: notice.link,
    p_by: options.by ?? undefined,
    p_at: options.at?.toISOString() ?? undefined,
  });
  if (saved.error) {
    if (saved.error.message.includes('not_waiting')) throw new ReviewError('That Audit has been approved already.');
    throw new ReviewError(`It did not approve: ${saved.error.message}`);
  }
  if (state.audit.kind === 'free' && options.emails !== false) {
    try {
      await sendAuditReadyEmails(db, auditId, { reviewed: true, now: options.at, env: options.env });
    } catch (error) {
      console.error(`The Audit ready email did not go: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export interface WaitingRow {
  auditId: string;
  institutionId: string;
  name: string;
  /** "First Audit, at sign up", "New Audit, extra refresh", "New Audit, every 3 months". */
  what: string;
  first: boolean;
  /** "Free, BBA", "Paid", "Client". */
  plan: string;
  runAt: string;
  line: string;
}

const PLAN_NAMES: Readonly<Record<Tier, string>> = { free: 'Free', paid: 'Paid', client: 'Client' };

function whatItIs(trigger: string, tier: Tier, first: boolean): string {
  if (first) return 'First Audit, at sign up';
  if (trigger === 'manual') return 'New Audit, extra refresh';
  return tier === 'free' ? 'New Audit, every 3 months' : 'New Audit, monthly';
}

/** Every own Audit waiting for review, oldest first, each with what changed in one line. */
export async function waitingAudits(db: Db): Promise<WaitingRow[]> {
  const { data, error } = await db.from('audits').select('id, institution_id, run_at, trigger').eq('review', 'waiting').in('kind', ['free', 'paid', 'client']).order('run_at');
  if (error) throw new ReviewError(`Could not read what waits for review: ${error.message}`);
  const rows: WaitingRow[] = [];
  for (const row of data ?? []) {
    const state = await loadReview(db, row.id);
    if (!state) continue;
    const first = state.before === null;
    rows.push({
      auditId: row.id,
      institutionId: row.institution_id,
      name: state.institution.name,
      what: whatItIs(row.trigger, state.institution.tier, first),
      first,
      plan: state.institution.tier === 'free' && state.institution.freeProgram ? `Free, ${state.institution.freeProgram}` : PLAN_NAMES[state.institution.tier],
      runAt: row.run_at,
      line: changesLine(state.changes, first),
    });
  }
  return rows;
}

/** How many own Audits and monthly summaries wait for review: the count beside To review in the team's menu. */
export async function waitingCount(db: Db): Promise<number> {
  const [audits, summaries] = await Promise.all([
    db.from('audits').select('id', { count: 'exact', head: true }).eq('review', 'waiting').in('kind', ['free', 'paid', 'client']),
    db.from('reports').select('id', { count: 'exact', head: true }).eq('review', 'waiting'),
  ]);
  if (audits.error || summaries.error) throw new ReviewError(`Could not count what waits for review: ${(audits.error ?? summaries.error)?.message}`);
  return (audits.count ?? 0) + (summaries.count ?? 0);
}
