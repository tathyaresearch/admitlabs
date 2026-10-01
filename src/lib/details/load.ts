// Loads what an institution added about itself and its programs (Settings, "Added by you"), as
// the signed-in user: row level security returns them to members and the team only, never to a
// rival. Never used by the Audit.

import { cache } from 'react';
import { institutionDetailsFromRow, programDetailsFromRow, type InstitutionDetails, type ProgramDetails } from '@/domain/details';
import { createClient } from '@/lib/supabase/server';

export interface AddedDetails {
  institution: InstitutionDetails;
  /** By program id. Programs with nothing added are left out. */
  programs: ReadonlyMap<string, ProgramDetails>;
}

export const loadAddedDetails = cache(async (institutionId: string): Promise<AddedDetails> => {
  const supabase = await createClient();
  const [institution, programs] = await Promise.all([
    supabase.from('institution_details').select('*').eq('institution_id', institutionId).maybeSingle(),
    supabase.from('program_details').select('*').eq('institution_id', institutionId),
  ]);
  if (institution.error) throw new Error(`Could not load your details: ${institution.error.message}`);
  if (programs.error) throw new Error(`Could not load your program details: ${programs.error.message}`);
  return {
    institution: institutionDetailsFromRow(institution.data),
    programs: new Map((programs.data ?? []).map((row) => [row.program_id, programDetailsFromRow(row)])),
  };
});
