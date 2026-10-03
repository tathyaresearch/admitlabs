// "Ask for Paid", or "Ask to continue Paid", with its state loaded on the server (once per
// request), ready to drop into any card, panel or notice that offers Paid.

import { askForPaidAction } from '@/app/(dashboard)/actions';
import type { InstitutionViewer } from '@/lib/auth/guards';
import { loadPaidAsk } from '@/lib/plan/ask';
import { AskPaid } from './AskPaid';

export async function PaidAction({
  viewer,
  variant,
  size,
  note,
}: {
  viewer: InstitutionViewer;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  note?: boolean | 'short';
}) {
  const state = await loadPaidAsk(viewer);
  return <AskPaid state={state} onAsk={askForPaidAction} variant={variant} size={size} note={note} />;
}
