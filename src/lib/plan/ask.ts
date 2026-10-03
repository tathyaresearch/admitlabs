// Asking AdmitLabs for Paid (C2): what the owner can ask for now, and the request already sent.
// The database decides again when the request is made (ask_for_paid), and turns away anything
// else. Price and terms never change here, and nothing is paid online.

import { cache } from 'react';
import { paidAskKind, type PaidAskKind } from '@/domain/tiers';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export interface PaidAskState {
  /** What the button asks for now; null when there is nothing to ask (Client, or Paid with longer to go). */
  kind: PaidAskKind | null;
  /** When the open request for it was sent, if there is one. */
  askedAt: string | null;
  /** The owner, signed in as themselves: only they ask. */
  canAsk: boolean;
  /** Where the AdmitLabs team writes back. */
  email: string;
}

export const loadPaidAsk = cache(async (viewer: InstitutionViewer): Promise<PaidAskState> => {
  const kind = paidAskKind(viewer.plan, new Date());
  const canAsk = viewer.membership.role === 'owner' && !viewer.viewingAs;
  if (!kind) return { kind, askedAt: null, canAsk, email: viewer.email };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('open_paid_ask', { p_institution: viewer.membership.institution.id });
  if (error) throw new Error(`Could not load the request for Paid: ${error.message}`);
  const open = (data ?? []).find((row) => row.kind === kind);
  return { kind, askedAt: open?.asked_at ?? null, canAsk, email: viewer.email };
});
