// Make these 3, picked on the server with the service key (spec 9.4 and section 11): for each
// institution that has signed up, with each monthly update, and at sign up for the latest update;
// then kept until the next. The one path for the monthly job, the app's first pulls and the seed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { latestStoredAudit } from '../audit/read.ts';
import { loadBrainWriting } from '../brain/load.ts';
import { monthStart, previousMonth } from '../domain/dates.ts';
import { effectiveTier } from '../domain/tiers.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';
import type { Database, Json } from '../lib/supabase/database.types.ts';
import { getAnalysisProvider } from '../providers/registry.ts';
import { parsePickedIdea, pickThree } from './picks.ts';
import { latestDemandRows } from './read.ts';
import { regionsFor } from './regions.ts';
import { demandSignals, programSources } from './signals.ts';

type Db = SupabaseClient<Database>;

export class PicksJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PicksJobError';
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new PicksJobError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new PicksJobError(`No ${what} found.`);
  return result.data;
}

const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

/**
 * The month's 3 for one institution, from the latest pulls up to that month for its programs and
 * its latest approved own Audit before `pickedAt`. Kept once picked: returns 0 when the month
 * already has its 3, or when there is nothing to pick from yet.
 */
export async function writeContentPicks(db: Db, institutionId: string, month: string, pickedAt: Date): Promise<number> {
  const existing = must(await db.from('content_picks').select('rank').eq('institution_id', institutionId).eq('month', monthStart(month)), 'Make these 3');
  if (existing.length) return 0;

  const [institution, programs, plan, before] = await Promise.all([
    db.from('institutions').select('id, name, city, state').eq('id', institutionId).single(),
    db.from('programs').select('id, name, program_key, created_at').eq('institution_id', institutionId).is('archived_at', null),
    db.from('plans').select('tier, starts_at, ends_at, free_program_id').eq('institution_id', institutionId).maybeSingle(),
    db.from('content_picks').select('idea').eq('institution_id', institutionId).eq('month', monthStart(previousMonth(month))),
  ]);
  const place = must(institution, 'institution');
  const all = must(programs, 'programs').sort((a, b) => a.created_at.localeCompare(b.created_at) || a.name.localeCompare(b.name));
  if (plan.error) throw new PicksJobError(`Could not read the plan: ${plan.error.message}`);
  const covered = all.flatMap((program) => (program.program_key ? [{ id: program.id, name: program.name, programKey: program.program_key }] : []));
  if (covered.length === 0) return 0;

  const regions = regionsFor(place);
  const [city, state] = await Promise.all([latestDemandRows(db, regions.city, covered, month), latestDemandRows(db, regions.state, covered, month)]);
  const sources = programSources(covered, { region: regions.city.region, ...city }, { region: regions.state.region, ...state });
  const ideas = demandSignals(
    sources,
    all.map((program) => program.name),
  ).ideas;
  if (ideas.length === 0) return 0;

  // What the website answers already: the program checks of the latest approved own Audit.
  const audit = await latestStoredAudit(db, institutionId, pickedAt);
  const answers = new Map<string, Map<CheckKey, CheckResult>>();
  for (const check of audit?.checks ?? []) {
    if (!check.programId) continue;
    const entry = answers.get(check.programId) ?? new Map<CheckKey, CheckResult>();
    entry.set(check.key, check.result);
    answers.set(check.programId, entry);
  }

  const tier = effectiveTier(plan.data ? { tier: plan.data.tier, startsAt: new Date(plan.data.starts_at), endsAt: plan.data.ends_at ? new Date(plan.data.ends_at) : null } : null, pickedAt);
  const picks = pickThree({
    ideas,
    answers: audit ? answers : null,
    freeProgramId: tier === 'free' ? (plan.data?.free_program_id ?? null) : null,
    before: new Set(must(before, 'last month’s picks').flatMap((row) => parsePickedIdea(row.idea)?.text ?? [])),
    institutionName: place.name,
  });
  if (picks.length === 0) return 0;

  // A Client with a Brain: each idea fitted to the brand (its tone, one Brain fact, nothing it avoids).
  const brain = tier === 'client' ? await loadBrainWriting(db, institutionId, pickedAt) : null;
  const fitted = brain
    ? await Promise.all(
        picks.map(async (pick) => {
          const fit = await getAnalysisProvider().fitIdea({ idea: { hook: pick.idea.hook, points: pick.idea.points, programName: pick.idea.programName, topic: pick.idea.topic }, brain });
          return { ...pick, idea: { ...pick.idea, hook: fit.hook, points: fit.points, voice: { tone: brain.tone, fact: fit.fact } } };
        }),
      )
    : picks;

  const { error } = await db.from('content_picks').insert(
    fitted.map((pick) => ({
      institution_id: institutionId,
      month: monthStart(month),
      rank: pick.rank,
      program_id: pick.programId,
      idea: json(pick.idea),
      picked_at: pickedAt.toISOString(),
    })),
  );
  if (error) throw new PicksJobError(`Could not save Make these 3 for ${place.name}: ${error.message}`);
  return picks.length;
}

/** The month's 3 for every institution signed up by `pickedAt` that has none yet. Returns how many institutions got theirs. */
export async function writeMonthPicks(db: Db, month: string, pickedAt: Date): Promise<number> {
  const statuses = must(await db.from('institution_status').select('institution_id, claimed, claimed_at'), 'institution status');
  const signedUp = statuses.filter((row) => row.claimed && row.claimed_at && new Date(row.claimed_at).getTime() <= pickedAt.getTime());
  let picked = 0;
  for (const row of signedUp) if ((await writeContentPicks(db, row.institution_id, month, pickedAt)) > 0) picked += 1;
  return picked;
}
