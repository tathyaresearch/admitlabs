// The team's Audit (spec section 27): one menu item, three tabs. To review shows how many wait.

import { waitingCount } from '@/audit/review-jobs';
import { LinkTabs } from '@/components/ui/LinkTabs';
import { createClient } from '@/lib/supabase/server';

export async function AuditTabs({ current }: { current: 'review' | 'bulk' | 'ads' }) {
  const waiting = await waitingCount(await createClient());
  return (
    <LinkTabs
      label="Audit"
      tabs={[
        { href: '/team/review', label: 'To review', count: waiting || undefined, current: current === 'review' },
        { href: '/team/bulk', label: 'Bulk Audit', current: current === 'bulk' },
        { href: '/team/ads', label: 'Rival ads', current: current === 'ads' },
      ]}
    />
  );
}
