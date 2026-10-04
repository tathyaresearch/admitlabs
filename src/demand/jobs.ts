// Demand pulls, run on the server with the service key (spec sections 9 and 11): one shared
// pull per region and program each month, with an alert for each big spike to the Paid and
// Client institutions in that city; and a first pull, straight away, for a region and program
// nobody needed before. The one path for the app, the scripts and the seed.
//
// Honest numbers (spec 9.5): a search trend keeps its count only when the keyword tool gives
// searches a month for it; a question or a topic keeps the questions counted.

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMAND_RULES } from '../config/demand.ts';
import { monthStart } from '../domain/dates.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';
import { collect } from '../providers/collect.ts';
import { getAnalysisProvider } from '../providers/registry.ts';
import type { InstitutionType } from '../domain/types.ts';
import { ideaItems, pulledItems } from './items.ts';
import { bigSpikes } from './rank.ts';
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
  type: InstitutionType;
  city: string;
  state: string;
  programs: Array<{ key: string; name: string; createdAt: string }>;
}

async function institutions(db: Db): Promise<{ rows: InstitutionRow[]; claimed: Set<string> }> {
  const [list, statuses, programs] = await Promise.all([
    db.from('institutions').select('id, slug, name, type, city, state'),
    db.from('institution_status').select('institution_id, claimed'),
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
  };
}

/** Every region and program an institution that has signed up needs this month. */
export async function neededNow(db: Db): Promise<NeededPull[]> {
  const { rows, claimed } = await institutions(db);
  return neededPulls(rows.filter((row) => claimed.has(row.id)).map((row) => ({ city: row.city, state: row.state, programKeys: row.programs.map((program) => program.key) })));
}

export interface PullResult {
  pull: NeededPull;
  month: string;
  items: number;
  spikes: string[];
}

/**
 * One shared pull: collect grouped items from every Demand source, add the keyword tool's
 * searches a month to the trends it covers, rank them, write the content ideas, and save it all
 * at once. With `notify`, a city pull alerts Paid and Client institutions there to each big
 * spike (spec section 11).
 */
export async function pullDemand(db: Db, pull: NeededPull, month: string, pulledAt: Date, options: { notify: boolean; env?: Env }): Promise<PullResult> {
  const env = options.env ?? process.env;
  const target = { kind: 'region' as const, scope: pull.scope, region: pull.region, state: pull.state, programKey: pull.programKey };
  const { items: found, basis } = pulledItems(await collect(target, pulledAt, env));
  const ideas = await getAnalysisProvider(env).contentIdeas({ programKey: pull.programKey, region: { scope: pull.scope, region: pull.region, state: pull.state }, ...basis });
  const items = [...found, ...ideaItems(ideas, pulledAt)].map((item) => ({
    kind: item.kind,
    text: item.text,
    original_text: item.originalText,
    language: item.language,
    count: item.count,
    change_pct: item.changePct,
    rank: item.rank,
    source_url: item.sourceUrl,
    found_at: item.foundAt,
    meta: item.meta,
  }));

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
  const results: PullResult[] = [];
  for (const pull of due) results.push(await pullDemand(db, pull, month, now, { notify: true, env }));
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
  const month = pullMonth(now);
  for (const pull of missing) await pullDemand(db, pull, month, now, { notify: false, env });
  return missing.length;
}
