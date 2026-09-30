// Demand pulls, run on the server with the service key (spec sections 9 and 11): one shared
// pull per region and program each month, with an alert for each big spike to the Paid and
// Client institutions in that city; and a first pull, straight away, for a region and program
// nobody needed before. The one path for the app, the scripts and the seed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMAND_RULES } from '../config/demand.ts';
import { monthStart } from '../domain/dates.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';
import { collect } from '../providers/collect.ts';
import { getAnalysisProvider } from '../providers/registry.ts';
import type { Signal, WatchedInstitution } from '../providers/types.ts';
import { bigSpikes, rankDemand } from './rank.ts';
import { neededPulls, pullKey, regionLabel, type NeededPull } from './regions.ts';
import { isPullDue, pullMonth } from './schedule.ts';
import { spikeNotice } from './text.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

export class DemandJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemandJobError';
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new DemandJobError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new DemandJobError(`No ${what} found.`);
  return result.data;
}

const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

interface InstitutionRow {
  id: string;
  slug: string;
  name: string;
  type: WatchedInstitution['type'];
  city: string;
  state: string;
  programs: Array<{ key: string; name: string; createdAt: string }>;
}

async function institutions(db: Db): Promise<{ rows: InstitutionRow[]; claimed: Set<string>; tracked: Set<string> }> {
  const [list, statuses, links, programs] = await Promise.all([
    db.from('institutions').select('id, slug, name, type, city, state'),
    db.from('institution_status').select('institution_id, claimed'),
    db.from('rivals').select('rival_institution_id'),
    db.from('programs').select('institution_id, name, program_key, created_at').is('archived_at', null).not('program_key', 'is', null),
  ]);
  const byInstitution = new Map<string, InstitutionRow['programs']>();
  for (const program of must(programs, 'programs')) {
    if (!program.program_key) continue;
    const entry = byInstitution.get(program.institution_id) ?? [];
    entry.push({ key: program.program_key, name: program.name, createdAt: program.created_at });
    byInstitution.set(program.institution_id, entry);
  }
  const rows = must(list, 'institutions').map((row) => ({
    ...row,
    programs: (byInstitution.get(row.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name)),
  }));
  return {
    rows,
    claimed: new Set(must(statuses, 'institution status').flatMap((row) => (row.claimed ? [row.institution_id] : []))),
    tracked: new Set(must(links, 'rival links').map((row) => row.rival_institution_id)),
  };
}

/** Every region and program an institution that has signed up needs this month. */
export async function neededNow(db: Db): Promise<NeededPull[]> {
  const { rows, claimed } = await institutions(db);
  return neededPulls(rows.filter((row) => claimed.has(row.id)).map((row) => ({ city: row.city, state: row.state, programKeys: row.programs.map((program) => program.key) })));
}

/**
 * Institutions whose public mentions are worth collecting: every one that has signed up, and
 * every rival someone tracks. Each is filed under one of its programs that its state is pulled
 * for, so its mentions are stored once per region.
 */
export async function watchList(db: Db, needed: readonly NeededPull[]): Promise<WatchedInstitution[]> {
  const { rows, claimed, tracked } = await institutions(db);
  const statePulls = new Set(needed.filter((pull) => pull.scope === 'state').map((pull) => `${pull.region}|${pull.programKey}`));
  return rows.flatMap((row) => {
    if (!claimed.has(row.id) && !tracked.has(row.id)) return [];
    const program = row.programs.find((candidate) => statePulls.has(`${row.state}|${candidate.key}`));
    return program ? [{ id: row.id, slug: row.slug, name: row.name, type: row.type, city: row.city, state: row.state, programKey: program.key }] : [];
  });
}

export interface PullResult {
  pull: NeededPull;
  month: string;
  items: number;
  spikes: string[];
}

/**
 * One shared pull: collect grouped items from every Demand source, rank them, write the content
 * ideas, and save it all at once. With `notify`, a city pull alerts Paid and Client
 * institutions there to each big spike (spec section 11).
 */
export async function pullDemand(
  db: Db,
  pull: NeededPull,
  month: string,
  pulledAt: Date,
  options: { notify: boolean; watch: readonly WatchedInstitution[]; env?: Env },
): Promise<PullResult> {
  const env = options.env ?? process.env;
  const target = { kind: 'region' as const, scope: pull.scope, region: pull.region, state: pull.state, programKey: pull.programKey, watch: options.watch };
  const found = (await collect(target, pulledAt, env))
    .filter((signal): signal is Signal<'demand_item'> => signal.key === 'demand_item')
    .map((signal) => ({ signal, kind: signal.value.kind, text: signal.value.text, count: signal.value.count, changePct: signal.value.changePct }));
  const ranks = rankDemand(found);

  const items: Array<Record<string, unknown>> = found.map((entry) => {
    const value = entry.signal.value;
    return {
      kind: value.kind,
      text: value.text,
      original_text: value.originalText,
      language: value.language,
      count: value.count,
      change_pct: value.changePct,
      rank: ranks.get(entry) ?? null,
      institution_id: value.about?.id ?? null,
      sentiment: value.sentiment,
      source_url: entry.signal.sourceUrl,
      found_at: entry.signal.fetchedAt,
      meta: { ...value.meta, platform: entry.signal.provider },
    };
  });

  const questions = found
    .filter((entry) => entry.kind === 'question')
    .map((entry) => ({
      text: entry.text,
      sourceUrl: entry.signal.sourceUrl,
      questionIndex: typeof entry.signal.value.meta.questionIndex === 'number' ? entry.signal.value.meta.questionIndex : null,
    }));
  const ideas = await getAnalysisProvider(env).contentIdeas({ programKey: pull.programKey, region: { scope: pull.scope, region: pull.region, state: pull.state }, questions });
  ideas.forEach((idea, index) => {
    items.push({ kind: 'idea', text: idea.text, language: 'en', count: 0, rank: index + 1, source_url: idea.sourceUrl, found_at: pulledAt.toISOString(), meta: { basedOn: idea.basedOn } });
  });

  const spikes =
    options.notify && pull.scope === 'city'
      ? bigSpikes(found, DEMAND_RULES.spikeMinChangePct).map((entry) => spikeNotice(entry.text, regionLabel(pull), entry.changePct ?? 0))
      : [];

  const saved = await db.rpc('record_demand_pull', {
    payload: json({
      scope: pull.scope,
      region: pull.region,
      state: pull.state,
      program_key: pull.programKey,
      month: monthStart(month),
      pulled_at: pulledAt.toISOString(),
      items,
      spikes: spikes.map((notice) => ({ notice })),
    }),
  });
  if (saved.error) throw new DemandJobError(`Could not save the ${regionLabel(pull)} pull for ${pull.programKey}: ${saved.error.message}`);
  return { pull, month, items: items.length, spikes };
}

/** Regions and programs due for their monthly pull on `now` (the 28th, or catching up after it). */
export async function demandPullsDue(db: Db, now: Date): Promise<{ month: string; due: NeededPull[] }> {
  const month = pullMonth(now);
  const needed = await neededNow(db);
  const existing = must(await db.from('demand_pulls').select('scope, region, state, program_key, pulled_at').eq('month', monthStart(month)), 'pulls');
  const pulledAt = new Map(existing.map((row) => [pullKey({ scope: row.scope, region: row.region, state: row.state, programKey: row.program_key }), new Date(row.pulled_at)]));
  return { month, due: needed.filter((pull) => isPullDue(pulledAt.get(pullKey(pull)) ?? null, month)) };
}

/** Every monthly pull due on `now`, with spike alerts. */
export async function runDuePulls(db: Db, now: Date, env?: Env): Promise<PullResult[]> {
  const { month, due } = await demandPullsDue(db, now);
  if (due.length === 0) return [];
  const watch = await watchList(db, await neededNow(db));
  const results: PullResult[] = [];
  for (const pull of due) results.push(await pullDemand(db, pull, month, now, { notify: true, watch, env }));
  return results;
}

/**
 * A new signup, or a program added in Settings: any region and program nobody needed before is
 * pulled straight away, for the latest pull month, so the Demand page is never empty. No alerts.
 */
export async function firstPulls(db: Db, institutionId: string, now: Date, env?: Env): Promise<number> {
  const { rows } = await institutions(db);
  const institution = rows.find((row) => row.id === institutionId);
  if (!institution) return 0;
  const mine = neededPulls([{ city: institution.city, state: institution.state, programKeys: institution.programs.map((program) => program.key) }]);
  if (mine.length === 0) return 0;
  const existing = must(
    await db
      .from('demand_pulls')
      .select('scope, region, state, program_key')
      .in(
        'program_key',
        mine.map((pull) => pull.programKey),
      ),
    'pulls',
  );
  const have = new Set(existing.map((row) => pullKey({ scope: row.scope, region: row.region, state: row.state, programKey: row.program_key })));
  const missing = mine.filter((pull) => !have.has(pullKey(pull)));
  if (missing.length === 0) return 0;
  const watch = await watchList(db, [...(await neededNow(db)), ...mine]);
  const month = pullMonth(now);
  for (const pull of missing) await pullDemand(db, pull, month, now, { notify: false, watch, env });
  return missing.length;
}
