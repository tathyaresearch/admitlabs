// Seeds the sample Client Brains (spec section 26) through the database directly, with the
// service key: the same rows the app writes, dated as they happened in the sample world, so
// History and Needs checking read as they would live. What Drishti pre-filled comes from the real
// pre-fill (src/brain/jobs.ts), run on the college's latest Audit.

import type { SupabaseClient } from '@supabase/supabase-js';
import { foundItems } from '../../src/brain/jobs.ts';
import type { BrainFields } from '../../src/brain/model.ts';
import {
  EMPTY_PROGRAM_DETAILS,
  institutionDetailsFromRow,
  institutionDetailsToRow,
  programDetailsFromRow,
  programDetailsToRow,
  type InstitutionDetails,
  type ProgramDetails,
} from '../../src/domain/details.ts';
import { istDate } from '../../src/domain/dates.ts';
import type { Database, Json } from '../../src/lib/supabase/database.types.ts';
import type { SampleBrain } from '../../src/sample/brain.ts';
import { institutionId, programId } from '../../src/sample/ids.ts';
import { fail } from './local.ts';

type Db = SupabaseClient<Database>;

const at = (ymd: string, hour = 10, minute = 0) => istDate(ymd, hour, minute).toISOString();

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) fail(`Could not seed the Brain (${what}): ${result.error.message}`);
  return result.data as T;
}

/** Merges a change into the details there are now, and writes them, dated and signed. */
async function changeDetails(db: Db, slug: string, change: SampleBrain['details'][number], user: (email: string) => string): Promise<void> {
  const institution = institutionId(slug);
  const when = at(change.on, change.hour ?? 10);
  if (change.programKey === null) {
    const current = institutionDetailsFromRow(must(await db.from('institution_details').select('*').eq('institution_id', institution).maybeSingle(), 'details'));
    const next = { ...current, ...(change.details as Partial<InstitutionDetails>) };
    must(await db.from('institution_details').upsert({ institution_id: institution, ...institutionDetailsToRow(next), updated_at: when, updated_by: user(change.by) }), 'details');
    return;
  }
  const program = programId(slug, change.programKey);
  const { data: row, error } = await db.from('program_details').select('*').eq('program_id', program).maybeSingle();
  if (error) fail(`Could not seed the Brain (program details): ${error.message}`);
  const current: ProgramDetails = row ? programDetailsFromRow(row) : EMPTY_PROGRAM_DETAILS;
  const next = { ...current, ...(change.details as Partial<ProgramDetails>) };
  must(
    await db.from('program_details').upsert({ program_id: program, institution_id: institution, ...programDetailsToRow(next), push: change.push ?? row?.push ?? false, updated_at: when, updated_by: user(change.by) }),
    'program details',
  );
}

/** History keeps who did it and when, as the team would have, for a change the seed made as the server. */
async function signLast(db: Db, slug: string, target: string, by: string, when: string, what?: string): Promise<void> {
  const rows = must(await db.from('brain_changes').select('id').eq('institution_id', institutionId(slug)).eq('target', target).order('at', { ascending: false }).limit(1), 'History');
  const row = rows[0];
  if (!row) return;
  must(await db.from('brain_changes').update({ by, at: when, ...(what ? { what } : {}) }).eq('id', row.id), 'History');
}

/** One sample Brain: started, its details, what Drishti found and what the team did with it, its facts, the checklist and Ready. */
export async function seedBrain(db: Db, sample: SampleBrain, user: (email: string) => string): Promise<{ facts: number; found: number }> {
  const institution = institutionId(sample.slug);
  must(await db.from('brains').insert({ institution_id: institution, status: 'onboarding', started_at: at(sample.started.on, 10), started_by: user(sample.started.by) }), 'start');

  let found = 0;
  if (sample.prefill) {
    const items = await foundItems(db, institution);
    found = items.length;
    if (items.length) {
      must(
        await db.from('brain_items').insert(
          items.map((item, index) => ({
            institution_id: institution,
            kind: item.kind,
            fields: item.fields as unknown as Json,
            to_confirm: true,
            source: 'drishti' as const,
            source_url: item.sourceUrl,
            found_at: item.foundAt,
            created_at: at(sample.started.on, 10, index + 1),
            updated_at: at(sample.started.on, 10, index + 1),
            checked_at: at(sample.started.on, 10, index + 1),
          })),
        ),
        'what Drishti found',
      );
    }
  }

  for (const change of sample.details) await changeDetails(db, sample.slug, change, user);

  for (const outcome of sample.outcomes) {
    const rows = must(await db.from('brain_items').select('id, kind, fields, source_url').eq('institution_id', institution).eq('to_confirm', true), 'what Drishti found');
    const row = rows.find((entry) => {
      const fields = entry.fields as { target?: string; label?: string };
      return fields.target === outcome.match || fields.label === outcome.match || (entry.source_url ?? '').includes(outcome.match);
    });
    if (!row) continue;
    const when = at(outcome.on, 11);
    if (outcome.outcome === 'confirmed' && row.kind !== 'found') {
      must(await db.from('brain_items').update({ to_confirm: false, updated_at: when, updated_by: user(outcome.by), checked_at: when, checked_by: user(outcome.by) }).eq('id', row.id), 'confirm');
      continue;
    }
    // What Drishti found for the details is the details' fact in History (private.found_target).
    const target = row.kind === 'found' ? ((row.fields as { target: string }).target.replace(/:(fees|page|approvals)$/, '')) : `item:${row.id}`;
    if (outcome.details && row.kind === 'found') {
      // As close_found_item does it: the details get the value, and the closing line says it, alone.
      const programKey = target.startsWith('program:') ? (sample.details.find((change) => change.programKey && programId(sample.slug, change.programKey) === target.slice(8))?.programKey ?? null) : null;
      await changeDetails(db, sample.slug, { programKey, details: outcome.details, by: outcome.by, on: outcome.on, hour: 11 }, user);
      const own = must(await db.from('brain_changes').select('id').eq('institution_id', institution).eq('target', target).eq('kind', 'details').order('at', { ascending: false }).limit(1), 'History');
      if (own[0]) must(await db.from('brain_changes').delete().eq('id', own[0].id), 'History');
    }
    must(await db.from('brain_items').delete().eq('id', row.id), 'close');
    await signLast(db, sample.slug, target, user(outcome.by), when, outcome.outcome);
  }

  for (const [index, entry] of sample.facts.entries()) {
    const when = at(entry.on, entry.hour ?? 10, index % 50);
    const by = user(entry.by);
    const fields =
      entry.kind === 'placement_list'
        ? ({ ...entry.fields, programId: entry.fields.programId ? programId(sample.slug, entry.fields.programId) : null } satisfies BrainFields['placement_list'])
        : entry.fields;
    must(
      await db.from('brain_items').insert({
        institution_id: institution,
        kind: entry.kind,
        fields: fields as unknown as Json,
        source: entry.by.endsWith('@admitlabs.example') ? 'team' : 'college',
        via_help: entry.viaHelp ?? false,
        created_at: when,
        created_by: by,
        updated_at: when,
        updated_by: by,
        checked_at: when,
        checked_by: by,
      }),
      `the ${entry.kind}`,
    );
  }

  for (const step of sample.steps) {
    must(await db.from('brain_steps').insert({ institution_id: institution, step: step.step, done_at: at(step.on, 18), done_by: user(step.by) }), 'the checklist');
  }

  for (const check of sample.checks) {
    const target = check.programKey ? `program:${programId(sample.slug, check.programKey)}` : 'about';
    const fact = check.programKey ? `${target}:${check.group}` : 'about';
    const when = at(check.on, 17);
    must(await db.from('brain_checks').upsert({ institution_id: institution, fact, checked_at: when, checked_by: user(check.by) }), 'a check');
    must(await db.from('brain_changes').insert({ institution_id: institution, at: when, by: user(check.by), what: 'checked', target, field: check.programKey ? check.group : null }), 'a check');
  }

  if (sample.ready) {
    must(await db.from('brains').update({ status: 'ready', ready_at: at(sample.ready.on, 17), ready_by: user(sample.ready.by) }).eq('institution_id', institution), 'Ready');
  }
  return { facts: sample.facts.length, found };
}
