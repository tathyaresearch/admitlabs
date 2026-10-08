// Start onboarding's pre-fill (spec section 26), read from the database: the college's latest
// signals and the findings of its latest approved Audit, turned into what Drishti found
// (src/brain/prefill.ts). The team's action and the seed share it. Framework free.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types.ts';
import { loadBrain } from './load.ts';
import { prefill, type FoundItem, type PrefillFinding, type PrefillSignal } from './prefill.ts';

type Db = SupabaseClient<Database>;

export async function foundItems(db: Db, institutionId: string): Promise<FoundItem[]> {
  const brain = await loadBrain(db, institutionId);
  if (!brain) return [];
  const [signals, audit] = await Promise.all([
    db.from('signals').select('check_key, program_id, value, source_url, fetched_at').eq('institution_id', institutionId).order('fetched_at', { ascending: false }).limit(400),
    db.from('audits').select('id').eq('institution_id', institutionId).in('kind', ['free', 'paid', 'client']).eq('review', 'approved').order('run_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (signals.error) throw new Error(`Could not read the signals: ${signals.error.message}`);
  const findings = audit.data ? await db.from('audit_findings').select('place, kind, source_name, source_url, checked_at').eq('audit_id', audit.data.id) : { data: [], error: null };
  // The latest signal for each check and program (approvals keep the official record's apart).
  const latest = new Map<string, PrefillSignal>();
  for (const row of signals.data ?? []) {
    const official = row.check_key === 'approvals' && (row.value as { source?: string } | null)?.source === 'official';
    const key = `${row.check_key}:${row.program_id ?? ''}:${official ? 'official' : ''}`;
    if (!latest.has(key)) latest.set(key, { checkKey: row.check_key, programId: row.program_id, value: row.value, sourceUrl: row.source_url, fetchedAt: row.fetched_at });
  }
  return prefill({
    programs: brain.programs,
    details: brain.details,
    signals: [...latest.values()],
    findings: (findings.data ?? []).map((row): PrefillFinding => ({ place: row.place as PrefillFinding['place'], kind: row.kind, sourceName: row.source_name, sourceUrl: row.source_url, checkedAt: row.checked_at })),
    knownUrls: new Set(brain.items.flatMap((item) => (item.kind === 'link' ? [item.fields.url] : []))),
  });
}
