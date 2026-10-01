// Reads Demand pulls back: the latest pull of each program for one region, up to a month when
// given. Used by the Demand page (as the signed-in user, so row level security applies) and by
// the monthly report (service key). Mentions are never read here.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types.ts';
import type { DemandRegion } from './regions.ts';
import type { DemandRow } from './view.ts';

type Db = SupabaseClient<Database>;

export class DemandReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemandReadError';
  }
}

export interface DemandProgramRef {
  name: string;
  programKey: string;
}

export interface TopicMonth {
  /** 'YYYY-MM' */
  month: string;
  count: number;
}

/**
 * One topic's count in each of the program's last `months` pulls for the region, oldest first:
 * how a rising trend got here. A month whose pull did not list the topic is left out.
 */
export async function topicHistory(
  db: Db,
  region: DemandRegion,
  topic: { programKey: string; kind: DemandRow['kind']; text: string },
  months: number,
): Promise<TopicMonth[]> {
  let query = db.from('demand_pulls').select('id, month').eq('scope', region.scope).eq('region', region.region).eq('program_key', topic.programKey);
  query = region.state === null ? query.is('state', null) : query.eq('state', region.state);
  const { data: pulls, error } = await query.order('month', { ascending: false }).limit(months);
  if (error) throw new DemandReadError(`Could not load Demand pulls: ${error.message}`);
  if (!pulls?.length) return [];

  const { data: items, error: itemError } = await db
    .from('demand_items')
    .select('pull_id, count')
    .in(
      'pull_id',
      pulls.map((pull) => pull.id),
    )
    .eq('kind', topic.kind)
    .eq('text', topic.text);
  if (itemError) throw new DemandReadError(`Could not load the topic's history: ${itemError.message}`);

  const monthOf = new Map(pulls.map((pull) => [pull.id, pull.month.slice(0, 7)]));
  return (items ?? [])
    .flatMap((item) => {
      const month = monthOf.get(item.pull_id);
      return month ? [{ month, count: item.count }] : [];
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** The grouped items of each program's latest pull for the region, and when the newest was pulled. */
export async function latestDemandRows(
  db: Db,
  region: DemandRegion,
  programs: readonly DemandProgramRef[],
  upToMonth?: string,
): Promise<{ rows: DemandRow[]; pulledAt: string | null }> {
  if (programs.length === 0) return { rows: [], pulledAt: null };
  let query = db
    .from('demand_pulls')
    .select('id, program_key, month, pulled_at')
    .eq('scope', region.scope)
    .eq('region', region.region)
    .in(
      'program_key',
      programs.map((program) => program.programKey),
    );
  query = region.state === null ? query.is('state', null) : query.eq('state', region.state);
  if (upToMonth) query = query.lte('month', `${upToMonth}-01`);
  const { data: pulls, error } = await query.order('month', { ascending: false });
  if (error) throw new DemandReadError(`Could not load Demand pulls: ${error.message}`);

  // The latest month for each program.
  const latest = new Map<string, { id: string; month: string; pulledAt: string }>();
  for (const pull of pulls ?? []) if (!latest.has(pull.program_key)) latest.set(pull.program_key, { id: pull.id, month: pull.month.slice(0, 7), pulledAt: pull.pulled_at });
  if (latest.size === 0) return { rows: [], pulledAt: null };

  const { data: items, error: itemError } = await db
    .from('demand_items')
    .select('id, pull_id, kind, text, language, count, change_pct, rank, source_url, found_at, meta')
    .in(
      'pull_id',
      [...latest.values()].map((pull) => pull.id),
    )
    .neq('kind', 'mention');
  if (itemError) throw new DemandReadError(`Could not load Demand items: ${itemError.message}`);

  const byPull = new Map([...latest.entries()].map(([programKey, pull]) => [pull.id, { programKey, month: pull.month }]));
  const names = new Map(programs.map((program) => [program.programKey, program.name]));
  const rows = (items ?? []).flatMap((item): DemandRow[] => {
    const pull = byPull.get(item.pull_id);
    if (!pull) return [];
    return [
      {
        id: item.id,
        programKey: pull.programKey,
        programName: names.get(pull.programKey) ?? pull.programKey,
        month: pull.month,
        kind: item.kind,
        text: item.text,
        language: item.language,
        count: item.count,
        changePct: item.change_pct === null ? null : Number(item.change_pct),
        rank: item.rank,
        sourceUrl: item.source_url,
        foundAt: item.found_at,
        meta: (item.meta ?? {}) as Record<string, unknown>,
      },
    ];
  });
  const pulledAt = [...latest.values()].map((pull) => pull.pulledAt).sort().pop() ?? null;
  return { rows, pulledAt };
}
