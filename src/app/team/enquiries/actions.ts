'use server';

// Enquiries: any team user marks one handled, or new again. The database function checks the
// team role again.

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/app/team/institutions/[id]/actions';

const reply = (previous: ActionState, status: ActionState['status'], message: string | null): ActionState => ({ status, message, attempt: previous.attempt + 1 });

export async function setEnquiryHandledAction(enquiryId: string, handled: boolean, previous: ActionState): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return reply(previous, 'error', 'Only the AdmitLabs team changes enquiries.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_enquiry_handled', { p_enquiry: enquiryId, p_handled: handled });
  if (error) return reply(previous, 'error', 'That did not save. Try again.');
  revalidatePath('/team/enquiries');
  return reply(previous, 'done', handled ? 'Marked as handled.' : 'Marked as new.');
}
