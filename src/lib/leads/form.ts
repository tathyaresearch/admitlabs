// What a tracking link's enquiry form needs (spec section 23), from lead_form(), which anyone may
// call: it holds no student's data. Server only: the form's start is signed with a server secret.

import { readStart, signStart } from '@/leads/token';
import { createClient } from '@/lib/supabase/server';

export interface LeadForm {
  linkId: string;
  college: string;
  /** Null for a general form, where the student picks the course. */
  programId: string | null;
  programName: string | null;
  programs: Array<{ id: string; name: string }>;
  open: boolean;
  closedReason: 'archived' | 'not_client' | null;
}

export async function loadLeadForm(code: string): Promise<LeadForm | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('lead_form', { p_code: code });
  if (error) throw new Error(`Could not load the enquiry form: ${error.message}`);
  const row = data?.[0];
  if (!row) return null;
  const programs = Array.isArray(row.programs)
    ? row.programs.flatMap((entry) => (entry && typeof entry === 'object' && 'id' in entry && 'name' in entry ? [{ id: String(entry.id), name: String(entry.name) }] : []))
    : [];
  return {
    linkId: row.link_id,
    college: row.institution_name,
    programId: row.program_id,
    programName: row.program_name,
    programs,
    open: row.open,
    closedReason: row.closed_reason === 'archived' || row.closed_reason === 'not_client' ? row.closed_reason : null,
  };
}

function secret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('The service key is not set. Run `npm run env:local`, then restart `npm run dev`.');
  return key;
}

/** The token the form carries: when it was shown, signed. */
export function formStartToken(now = Date.now()): string {
  return signStart(now, secret());
}

/** When the form was shown, if the token is the server's own. */
export function readFormStart(token: string): number | null {
  return readStart(token, secret());
}
