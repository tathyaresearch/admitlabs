// The AdmitLabs team's work log for a Client (supabase/migrations/20261011120000_team_work.sql).
// Read as the signed-in user, so row level security decides who sees it: the Client's own
// people while the service is active, and the team.

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { WorkEntry } from '@/team/work';

/** One institution's log, newest first (work added later first on the same day). */
export const loadWork = cache(async (institutionId: string): Promise<WorkEntry[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('team_work')
    .select('id, kind, body, work_on, link')
    .eq('institution_id', institutionId)
    .order('work_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load the work log: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, kind: row.kind, text: row.body, on: row.work_on, link: row.link }));
});
