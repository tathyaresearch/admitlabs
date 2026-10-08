// Loading a Client's Brain from the database: for the pages (as the signed-in person, so row level
// security decides what shows) and for the jobs that read it (the Audit's ready fixes, Make these
// 3, the monthly summary). Framework free, so the scripts use it too.

import type { SupabaseClient } from '@supabase/supabase-js';
import { institutionDetailsFromRow, programDetailsFromRow } from '../domain/details.ts';
import type { Database } from '../lib/supabase/database.types.ts';
import type { ChangeRow, ChangeWhat, Person } from './history.ts';
import { brainLine, brainState } from './line.ts';
import type { AnyBrainItem, Brain, BrainStep, Stamp } from './model.ts';
import { brainWriting, type BrainWriting } from './writing.ts';

type Db = SupabaseClient<Database>;

export class BrainLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrainLoadError';
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new BrainLoadError(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
}

type ItemRow = Database['public']['Tables']['brain_items']['Row'];

export function itemFromRow(row: ItemRow): AnyBrainItem {
  return {
    id: row.id,
    kind: row.kind,
    fields: row.fields,
    toConfirm: row.to_confirm,
    source: row.source,
    viaHelp: row.via_help,
    sourceUrl: row.source_url,
    foundAt: row.found_at,
    checkedAt: row.checked_at,
    checkedBy: row.checked_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  } as AnyBrainItem;
}

/** Whether a college's Brain has started, and how far it is. Null before onboarding (or out of reach). */
export async function loadBrainStatus(db: Db, institutionId: string): Promise<{ status: 'onboarding' | 'ready'; startedAt: string; readyAt: string | null } | null> {
  const { data, error } = await db.from('brains').select('status, started_at, ready_at').eq('institution_id', institutionId).maybeSingle();
  if (error) throw new BrainLoadError(`Could not load the Brain: ${error.message}`);
  return data ? { status: data.status, startedAt: data.started_at, readyAt: data.ready_at } : null;
}

/** The whole Brain, or null before onboarding has started (or when this person may not read it). */
export async function loadBrain(db: Db, institutionId: string): Promise<Brain | null> {
  const [brain, institution, items, details, programs, programDetails, checks, steps] = await Promise.all([
    db.from('brains').select('*').eq('institution_id', institutionId).maybeSingle(),
    db.from('institutions').select('id, name, type, city, state, website, instagram, youtube, other_links').eq('id', institutionId).maybeSingle(),
    db.from('brain_items').select('*').eq('institution_id', institutionId).order('created_at'),
    db.from('institution_details').select('*').eq('institution_id', institutionId).maybeSingle(),
    db.from('programs').select('id, name, created_at').eq('institution_id', institutionId).is('archived_at', null).order('created_at').order('name'),
    db.from('program_details').select('*').eq('institution_id', institutionId),
    db.from('brain_checks').select('fact, checked_at, checked_by').eq('institution_id', institutionId),
    db.from('brain_steps').select('step, done_at, done_by').eq('institution_id', institutionId),
  ]);
  const row = must(brain, 'the Brain');
  const place = must(institution, 'the institution');
  if (!row || !place) return null;
  const links = (place.other_links ?? {}) as { facebook?: string; linkedin?: string; google_maps?: string };
  const detailRows = new Map(must(programDetails, 'program details').map((entry) => [entry.program_id, entry]));
  return {
    institution: {
      id: place.id,
      name: place.name,
      type: place.type,
      city: place.city,
      state: place.state,
      website: place.website,
      instagram: place.instagram,
      youtube: place.youtube,
      facebook: links.facebook ?? null,
      linkedin: links.linkedin ?? null,
      googleMaps: links.google_maps ?? null,
    },
    status: row.status,
    started: { at: row.started_at, by: row.started_by },
    ready: row.ready_at ? { at: row.ready_at, by: row.ready_by } : null,
    items: must(items, 'the Brain’s facts').map(itemFromRow),
    details: institutionDetailsFromRow(must(details, 'the details added by you')),
    programs: must(programs, 'programs').map((program) => {
      const entry = detailRows.get(program.id) ?? null;
      return { id: program.id, name: program.name, details: programDetailsFromRow(entry), push: entry?.push ?? false };
    }),
    checks: new Map<string, Stamp>(must(checks, 'checks').map((check) => [check.fact, { at: check.checked_at, by: check.checked_by }])),
    steps: new Map<BrainStep, Stamp>(must(steps, 'the checklist').map((step) => [step.step, { at: step.done_at, by: step.done_by }])),
  };
}

/** What the writer reads from a college's Brain, or null when it has none. `now` decides "admissions open next". */
export async function loadBrainWriting(db: Db, institutionId: string, now: Date): Promise<BrainWriting | null> {
  // Most colleges have no Brain: one small read says so.
  if (!(await loadBrainStatus(db, institutionId))) return null;
  const brain = await loadBrain(db, institutionId);
  if (!brain) return null;
  const today = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  return brainWriting(
    brain.items.map((item) => ({ kind: item.kind, fields: item.fields, toConfirm: item.toConfirm })),
    brain.programs.map((program) => ({ name: program.name, details: program.details })),
    today,
  );
}

/** History, newest first: the whole Brain's, or one fact's ('item:<id>', 'about', 'program:<id>'). */
export async function loadChanges(db: Db, institutionId: string, options: { target?: string; limit?: number } = {}): Promise<ChangeRow[]> {
  let query = db.from('brain_changes').select('*').eq('institution_id', institutionId).order('at', { ascending: false });
  if (options.target) query = query.eq('target', options.target);
  if (options.limit) query = query.limit(options.limit);
  return must(await query, 'History').map((row) => ({
    id: row.id,
    at: row.at,
    by: row.by,
    what: row.what as ChangeWhat,
    target: row.target,
    kind: row.kind,
    field: row.field,
    before: row.before,
    after: row.after,
    teamOnly: row.team_only,
  }));
}

/** Who may appear in History, by id: a name, or the email when there is none. */
export async function loadBrainPeople(db: Db, institutionId: string): Promise<Map<string, Person>> {
  const rows = must(await db.rpc('brain_people', { p_institution: institutionId }), 'people');
  return new Map(rows.map((person) => [person.user_id, { name: person.name, email: person.email, team: person.team }]));
}

/** A Client's Brain in one line, for its monthly summary; null before onboarding has started. */
export async function loadBrainLine(db: Db, institutionId: string, now: Date): Promise<string | null> {
  if (!(await loadBrainStatus(db, institutionId))) return null;
  const brain = await loadBrain(db, institutionId);
  return brain ? brainLine(brainState(brain, now)) : null;
}
