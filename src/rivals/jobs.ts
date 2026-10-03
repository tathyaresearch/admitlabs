// Rival work, run on the server with the service key: the monthly rival Audits, the weekly
// check for moves and best content, the Rivals 3 things to do, and the first look at a rival
// someone has just picked. The one path for the app, the scripts and the seed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { AuditRunError, runAudit } from '../audit/run.ts';
import { RIVAL_RULES } from '../config/rivals.ts';
import { effectiveTier, type PlanRecord } from '../domain/tiers.ts';
import type { AuditTrigger, InstitutionType } from '../domain/types.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';
import { getAnalysisProvider, getProvider } from '../providers/registry.ts';
import type { RivalContentValue, RivalMoveValue } from '../providers/signals.ts';
import type { InstitutionRef, Signal } from '../providers/types.ts';
import { compareChecks } from './compare.ts';
import { rivalOpportunities } from './opportunities.ts';
import { checkScores, latestOwnAudit, latestRivalAudits, programInfo } from './read.ts';
import { isRivalAuditDue, monthColumn, mondayOf, monthStartOf } from './schedule.ts';
import { moveNotice } from './text.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

const DAY_MS = 86_400_000;

export class RivalJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RivalJobError';
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new RivalJobError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new RivalJobError(`No ${what} found.`);
  return result.data;
}

const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

/** Every institution someone tracks, by name. */
export async function trackedRivals(db: Db): Promise<Array<{ id: string; name: string }>> {
  const links = must(await db.from('rivals').select('rival_institution_id'), 'rival links');
  const ids = [...new Set(links.map((row) => row.rival_institution_id))];
  if (ids.length === 0) return [];
  const rows = must(await db.from('institutions').select('id, name').in('id', ids).order('name'), 'rival names');
  return rows;
}

export async function institutionRef(db: Db, institutionId: string): Promise<InstitutionRef> {
  const [institution, programs] = await Promise.all([
    db.from('institutions').select('id, slug, name, type, city, state, website, instagram, youtube, other_links').eq('id', institutionId).maybeSingle(),
    db.from('programs').select('program_key').eq('institution_id', institutionId).is('archived_at', null),
  ]);
  const row = must(institution, 'institution');
  const links = (row.other_links ?? {}) as { facebook?: string; linkedin?: string };
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    city: row.city,
    state: row.state,
    website: row.website,
    instagram: row.instagram,
    youtube: row.youtube,
    otherLinks: { facebook: links.facebook, linkedin: links.linkedin },
    programKeys: must(programs, 'programs').flatMap((program) => (program.program_key ? [program.program_key] : [])),
  };
}

// Rival Audits -------------------------------------------------------------------------

/** Tracked rivals whose monthly Audit has not run since the 1st of this month. */
export async function rivalAuditsDue(db: Db, now: Date): Promise<Array<{ id: string; name: string }>> {
  const rivals = await trackedRivals(db);
  const latest = await latestRivalAudits(
    db,
    rivals.map((rival) => rival.id),
    now,
  );
  return rivals.filter((rival) => {
    const last = latest.get(rival.id);
    return isRivalAuditDue(last ? new Date(last.runAt) : null, now);
  });
}

export async function runRivalAudit(db: Db, rivalId: string, asOf: Date, trigger: AuditTrigger = 'scheduled', env?: Env): Promise<number> {
  const result = await runAudit(db, { institutionId: rivalId, asOf, trigger, kind: 'rival', env });
  return result.overall;
}

// The weekly check -----------------------------------------------------------------------

export interface RivalCheckOutcome {
  newMoves: number;
  posts: number;
}

/**
 * One rival's weekly check: moves found on its site, and its best posts for each month the
 * check covers. New moves alert Paid and Client trackers when `notify` is on.
 */
export async function checkRival(db: Db, rivalId: string, asOf: Date, options: { notify: boolean; env?: Env }): Promise<RivalCheckOutcome> {
  const env = options.env ?? process.env;
  const rival = await institutionRef(db, rivalId);
  const target = { kind: 'institution' as const, institution: rival };
  const [site, instagram, youtube] = await Promise.all([
    getProvider('site_crawler', env).collect(target, asOf),
    getProvider('instagram', env).collect(target, asOf),
    getProvider('youtube', env).collect(target, asOf),
  ]);

  const moves = site
    .filter((signal): signal is Signal<'rival_move'> => signal.key === 'rival_move')
    .map((signal) => {
      const value: RivalMoveValue = signal.value;
      return { kind: value.kind, description: value.description, source_url: signal.sourceUrl, detected_at: value.detectedAt, notice: moveNotice(rival.name, value.description) };
    });

  // Best content: each month's top posts by views, with why each one worked.
  const posts = [...instagram, ...youtube].filter((signal): signal is Signal<'rival_content'> => signal.key === 'rival_content').map((signal) => signal.value);
  const byMonth = new Map<string, RivalContentValue[]>();
  for (const post of posts) {
    const month = monthColumn(new Date(post.postedAt));
    byMonth.set(month, [...(byMonth.get(month) ?? []), post]);
  }
  const analysis = getAnalysisProvider(env);
  const content: Array<Record<string, unknown>> = [];
  for (const [month, items] of byMonth) {
    const top = [...items].sort((a, b) => (b.metrics.views ?? 0) - (a.metrics.views ?? 0)).slice(0, RIVAL_RULES.postsPerMonth);
    for (const post of top) {
      content.push({
        platform: post.platform,
        url: post.url,
        title: post.title,
        metrics: post.metrics,
        why_it_worked: await analysis.whyItWorked({ institutionSlug: rival.slug, platform: post.platform, title: post.title, metrics: post.metrics }),
        month,
        posted_at: post.postedAt,
      });
    }
  }

  const saved = await db.rpc('record_rival_check', {
    payload: json({
      rival_institution_id: rival.id,
      week: mondayOf(asOf),
      checked_at: asOf.toISOString(),
      notify: options.notify,
      moves,
      content_months: [...byMonth.keys()],
      content,
    }),
  });
  if (saved.error) throw new RivalJobError(`Could not save the check of ${rival.name}: ${saved.error.message}`);
  return { newMoves: saved.data, posts: content.length };
}

/** Tracked rivals not yet checked this week (the Monday of `now`). */
export async function rivalChecksDue(db: Db, now: Date): Promise<Array<{ id: string; name: string }>> {
  const rivals = await trackedRivals(db);
  if (rivals.length === 0) return [];
  const week = mondayOf(now);
  const checked = must(
    await db
      .from('rival_checks')
      .select('rival_institution_id')
      .eq('week', week)
      .in(
        'rival_institution_id',
        rivals.map((rival) => rival.id),
      ),
    'rival checks',
  );
  const done = new Set(checked.map((row) => row.rival_institution_id));
  return rivals.filter((rival) => !done.has(rival.id));
}

// 3 things to do --------------------------------------------------------------------------

function planRecord(row: { tier: PlanRecord['tier']; starts_at: string; ends_at: string | null } | null): PlanRecord | null {
  return row ? { tier: row.tier, startsAt: new Date(row.starts_at), endsAt: row.ends_at ? new Date(row.ends_at) : null } : null;
}

/**
 * The Rivals 3 things to do for the month of `asOf` (Paid and Client only), built from what
 * was known then: the institution's latest Audit, each rival's latest rival Audit, the best
 * posts of the month and the moves of the last 30 days. Replaces the month's earlier list.
 * Returns how many were written (0 on Free, or with no rivals).
 */
export async function writeRivalActions(db: Db, institutionId: string, asOf: Date, env?: Env): Promise<number> {
  const [institution, plan, links] = await Promise.all([
    db.from('institutions').select('id, type').eq('id', institutionId).maybeSingle(),
    db.from('plans').select('tier, starts_at, ends_at').eq('institution_id', institutionId).maybeSingle(),
    db.from('rivals').select('rival_institution_id, institutions!rivals_rival_institution_id_fkey(name)').eq('institution_id', institutionId),
  ]);
  const type: InstitutionType = must(institution, 'institution').type;
  if (plan.error) throw new RivalJobError(`Could not read the plan: ${plan.error.message}`);
  if (effectiveTier(planRecord(plan.data), asOf) === 'free') return 0;
  const rivals = must(links, 'rival links').map((row) => ({ id: row.rival_institution_id, name: row.institutions?.name ?? 'A rival' }));
  if (rivals.length === 0) return 0;
  const rivalIds = rivals.map((rival) => rival.id);

  const own = await latestOwnAudit(db, institutionId, asOf);
  if (!own) return 0;
  const [theirs, programs] = await Promise.all([latestRivalAudits(db, rivalIds, asOf), programInfo(db, [institutionId, ...rivalIds])]);
  const checks = await checkScores(db, [own.id, ...[...theirs.values()].map((audit) => audit.id)], programs);
  const yours = checks.get(own.id) ?? [];

  const since = new Date(asOf.getTime() - RIVAL_RULES.movesWindowDays * DAY_MS);
  const [contentResult, movesResult] = await Promise.all([
    db
      .from('rival_content')
      .select('rival_institution_id, platform, title, metrics, why_it_worked, month, posted_at')
      .in('rival_institution_id', rivalIds)
      .lte('month', monthColumn(asOf))
      .order('month', { ascending: false }),
    db
      .from('rival_moves')
      .select('rival_institution_id, kind, description, detected_at')
      .in('rival_institution_id', rivalIds)
      .gt('detected_at', since.toISOString())
      .lte('detected_at', asOf.toISOString()),
  ]);
  const content = must(contentResult, 'rival content').filter((row) => !row.posted_at || new Date(row.posted_at).getTime() <= asOf.getTime());
  const latestMonth = content[0]?.month;
  const name = (id: string) => rivals.find((rival) => rival.id === id)?.name ?? 'A rival';

  const opportunities = rivalOpportunities({
    rivals: rivals.flatMap((rival) => {
      const audit = theirs.get(rival.id);
      return audit ? [{ ...rival, comparisons: compareChecks(yours, checks.get(audit.id) ?? []) }] : [];
    }),
    posts: content
      .filter((row) => row.month === latestMonth)
      .map((row) => ({
        rival: { id: row.rival_institution_id, name: name(row.rival_institution_id) },
        platform: row.platform,
        title: row.title,
        views: Number((row.metrics as { views?: number }).views ?? 0),
        whyItWorked: row.why_it_worked,
      })),
    moves: must(movesResult, 'rival moves').map((row) => ({
      rival: { id: row.rival_institution_id, name: name(row.rival_institution_id) },
      kind: row.kind,
      description: row.description,
      detectedAt: row.detected_at,
    })),
  });
  const texts = await getAnalysisProvider(env ?? process.env).rivalActions({ institutionType: type, opportunities });
  const items = opportunities.map((item, index) => ({
    rank: index + 1,
    text: texts[index]?.text ?? '',
    detail: texts[index]?.detail ?? null,
    rival_institution_id: item.type === 'gap' ? (item.rivals[0]?.id ?? null) : item.rival.id,
    check_key: item.type === 'gap' ? item.key : null,
    effort: texts[index]?.effort ?? null,
  }));

  const saved = await db.rpc('record_actions', { p_institution: institutionId, p_month: monthColumn(asOf), p_feature: 'rivals', p_items: json(items) });
  if (saved.error) throw new RivalJobError(`Could not save the 3 things to do: ${saved.error.message}`);
  return items.length;
}

/** Paid and Client institutions with rivals whose 3 things to do for this month are missing. */
export async function rivalActionsDue(db: Db, now: Date): Promise<Array<{ id: string; name: string }>> {
  const [links, plans, actions, institutions] = await Promise.all([
    db.from('rivals').select('institution_id'),
    db.from('plans').select('institution_id, tier, starts_at, ends_at'),
    db.from('actions').select('institution_id').eq('feature', 'rivals').eq('month', monthColumn(now)),
    db.from('institutions').select('id, name'),
  ]);
  const trackers = new Set(must(links, 'rival links').map((row) => row.institution_id));
  const done = new Set(must(actions, 'actions').map((row) => row.institution_id));
  const names = new Map(must(institutions, 'institutions').map((row) => [row.id, row.name]));
  return must(plans, 'plans')
    .filter((row) => trackers.has(row.institution_id) && !done.has(row.institution_id) && effectiveTier(planRecord(row), now) !== 'free')
    .map((row) => ({ id: row.institution_id, name: names.get(row.institution_id) ?? row.institution_id }));
}

// First look -------------------------------------------------------------------------------

/**
 * Right after rivals are picked: score any rival without a rival Audit this month, and give a
 * rival Drishti has never checked its first weekly check (no alerts for what it finds; they
 * show on the page instead).
 */
export async function firstLook(db: Db, rivalIds: readonly string[], now: Date, env?: Env): Promise<{ audits: number; checks: number; skipped: string[] }> {
  if (rivalIds.length === 0) return { audits: 0, checks: 0, skipped: [] };
  const [latest, checked] = await Promise.all([
    latestRivalAudits(db, rivalIds, now),
    db.from('rival_checks').select('rival_institution_id').in('rival_institution_id', [...rivalIds]),
  ]);
  const everChecked = new Set(must(checked, 'rival checks').map((row) => row.rival_institution_id));
  let audits = 0;
  let checks = 0;
  const skipped: string[] = [];
  for (const id of rivalIds) {
    // One rival that cannot be checked yet (for example a record with no programs) never
    // holds up the others; the next scheduled run tries it again.
    try {
      const last = latest.get(id);
      if (!last || new Date(last.runAt).getTime() < monthStartOf(now).getTime()) {
        await runRivalAudit(db, id, now, 'manual', env);
        audits += 1;
      }
      if (!everChecked.has(id)) {
        await checkRival(db, id, now, { notify: false, env });
        checks += 1;
      }
    } catch (error) {
      if (!(error instanceof AuditRunError || error instanceof RivalJobError)) throw error;
      skipped.push(id);
    }
  }
  return { audits, checks, skipped };
}
