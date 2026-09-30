// Runs the providers by hand and stores the Audit signals they return. The first piece of
// "trigger any scheduled run by hand" (spec section 11). Uses mock providers in this build.
//
//   npm run collect -- --institution northbank-college --month 2026-10
//   npm run collect -- --institution all --month 2026-10 --day 1 --dry-run

import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { istDate } from '../src/domain/dates.ts';
import { CHECK_KEYS, type CheckKey } from '../src/domain/types.ts';
import type { Database, Json } from '../src/lib/supabase/database.types.ts';
import { collect } from '../src/providers/collect.ts';
import type { AnySignal, InstitutionRef } from '../src/providers/types.ts';
import { assertDrishtiLocal, fail } from './lib/local.ts';

const { values } = parseArgs({
  options: {
    institution: { type: 'string' },
    month: { type: 'string' },
    day: { type: 'string', default: '15' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const target = values.institution ?? fail('Say which institution: --institution <slug> or --institution all');
const month = values.month ?? fail('Say which month: --month YYYY-MM');
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail(`--month must look like 2026-10, got "${month}"`);
const day = String(values.day).padStart(2, '0');
if (!/^(0[1-9]|[12]\d|3[01])$/.test(day)) fail(`--day must be 1 to 31, got "${values.day}"`);
const asOf = istDate(`${month}-${day}`, 10);
const dryRun = values['dry-run'] === true;

const url = assertDrishtiLocal(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail('SUPABASE_SERVICE_ROLE_KEY is not set. Run `npm run env:local`.');
const db = createClient<Database>(url.origin, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const CHECK_KEY_SET: ReadonlySet<string> = new Set(CHECK_KEYS);
type CheckSignal = Extract<AnySignal, { key: CheckKey }>;
const isCheckSignal = (signal: AnySignal): signal is CheckSignal => CHECK_KEY_SET.has(signal.key);

let query = db.from('institutions').select('id, slug, name, type, city, state, website, instagram, youtube, other_links, programs(id, name, program_key)').order('slug');
if (target !== 'all') query = query.eq('slug', target);
const { data: institutions, error } = await query;
if (error) fail(`Could not read institutions: ${error.message}`);
if (!institutions?.length) fail(`No institution found for "${target}".`);

let total = 0;
for (const row of institutions) {
  const links = (row.other_links ?? {}) as { facebook?: string; linkedin?: string };
  const institution: InstitutionRef = {
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
    programKeys: row.programs.flatMap((program) => (program.program_key ? [program.program_key] : [])),
  };

  const found = [
    ...(await collect({ kind: 'institution', institution }, asOf)),
    ...(
      await Promise.all(
        row.programs.map((program) => collect({ kind: 'program', institution, program: { id: program.id, name: program.name, programKey: program.program_key } }, asOf)),
      )
    ).flat(),
  ].filter(isCheckSignal);

  if (!dryRun && found.length) {
    const { error: insertError } = await db.from('signals').insert(
      found.map((signal) => ({
        institution_id: row.id,
        program_id: signal.programId,
        provider: signal.provider,
        check_key: signal.key,
        value: JSON.parse(JSON.stringify(signal.value)) as Json,
        source_url: signal.sourceUrl,
        fetched_at: signal.fetchedAt,
      })),
    );
    if (insertError) fail(`Could not store signals for ${row.slug}: ${insertError.message}`);
  }
  total += found.length;
  console.log(`${row.slug.padEnd(28)} ${String(found.length).padStart(3)} signals${dryRun ? ' (dry run, not stored)' : ''}`);
}

console.log(`\n${dryRun ? 'Would store' : 'Stored'} ${total} signals checked on ${month}-${day}. Scores from these arrive with the Audit engine in Phase 2.`);
