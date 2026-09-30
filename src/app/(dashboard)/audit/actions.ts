'use server';

// Paid's extra refresh: once each calendar month (India time), owner only. Checked here on
// the server and again inside record_audit(), so the limit holds whatever the page shows.

import { revalidatePath } from 'next/cache';
import { AuditRunError, RefreshUsedError, runAudit } from '@/audit/run';
import { formatDate } from '@/domain/format';
import { refreshResetsOn } from '@/domain/schedule';
import { writeRivalActions } from '@/rivals/jobs';
import { getViewer } from '@/lib/auth/viewer';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RefreshState {
  status: 'idle' | 'done' | 'error';
  message: string | null;
}

export async function refreshAuditAction(): Promise<RefreshState> {
  const viewer = await getViewer();
  if (!viewer?.membership || viewer.membership.role !== 'owner') {
    return { status: 'error', message: 'Only the owner of this account can refresh the Audit.' };
  }
  if (viewer.tier !== 'paid') {
    return {
      status: 'error',
      message: viewer.tier === 'client' ? 'Your AdmitLabs team refreshes your Audit whenever it is needed.' : 'An extra refresh comes with Paid.',
    };
  }

  const now = new Date();
  const admin = createAdminClient();
  try {
    await runAudit(admin, { institutionId: viewer.membership.institution.id, asOf: now, trigger: 'manual', createdBy: viewer.userId });
    // The Rivals 3 things to do are built on the latest Audit, so they follow the refresh.
    await writeRivalActions(admin, viewer.membership.institution.id, now);
  } catch (error) {
    if (error instanceof RefreshUsedError) {
      return { status: 'error', message: `This month's extra refresh has been used. It comes back on ${formatDate(refreshResetsOn(now))}.` };
    }
    if (error instanceof AuditRunError) return { status: 'error', message: error.message };
    throw error;
  }

  revalidatePath('/', 'layout');
  return { status: 'done', message: 'Your Audit has been refreshed.' };
}
