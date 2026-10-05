// Subscribe now and Renew now (C2): what the owner can ask for now, for which period (Monthly or
// 3 months), and the request already sent.
// The database decides again when the request is made (ask_for_paid), and turns away anything
// else. Price and terms never change here. Payment is completed with the team until online
// payment is set up (README, Before launch).

import { cache } from 'react';
import { DEFAULT_PAID_MONTHS, paidAskKind, parsePaidMonths, type PaidAskKind, type PaidMonths } from '@/domain/tiers';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export interface PaidAskState {
  /** What the button asks for now; null when there is nothing to ask (Client, or Paid with longer to go). */
  kind: PaidAskKind | null;
  /** When the open request for it was sent, if there is one. */
  askedAt: string | null;
  /** The period the open request asked for. */
  askedMonths: PaidMonths | null;
  /** The period picked first: on renewal the plan's own, otherwise 3 months. */
  pick: PaidMonths;
  /** The owner, signed in as themselves: only they ask. */
  canAsk: boolean;
  /** Where the AdmitLabs team writes back. */
  email: string;
}

export const loadPaidAsk = cache(async (viewer: InstitutionViewer): Promise<PaidAskState> => {
  const kind = paidAskKind(viewer.plan, new Date());
  const canAsk = viewer.membership.role === 'owner' && !viewer.viewingAs;
  const pick = kind === 'continue_paid' ? (viewer.plan?.paidMonths ?? DEFAULT_PAID_MONTHS) : DEFAULT_PAID_MONTHS;
  if (!kind) return { kind, askedAt: null, askedMonths: null, pick, canAsk, email: viewer.email };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('open_paid_ask', { p_institution: viewer.membership.institution.id });
  if (error) throw new Error(`Could not load the request for Paid: ${error.message}`);
  const open = (data ?? []).find((row) => row.kind === kind);
  return { kind, askedAt: open?.asked_at ?? null, askedMonths: parsePaidMonths(open?.paid_months), pick, canAsk, email: viewer.email };
});
