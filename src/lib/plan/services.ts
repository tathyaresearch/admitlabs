// "Want us to do it for you?" (the sidebar's services card, Free and Paid): when the institution's
// open request to talk to AdmitLabs was sent, if there is one. The database sends one at most.

import { cache } from 'react';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

/** Shown on Free and Paid, to the institution's own people: never a Client, never the team in view as. */
export function showsServicesCard(viewer: Pick<InstitutionViewer, 'tier' | 'viewingAs'>): boolean {
  return viewer.tier !== 'client' && !viewer.viewingAs;
}

export const loadServicesAsk = cache(async (viewer: InstitutionViewer): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('open_services_ask', { p_institution: viewer.membership.institution.id });
  if (error) throw new Error(`Could not load the request to AdmitLabs: ${error.message}`);
  return data ?? null;
});
