// Demand for any region and program nobody needed before, straight away, so the Demand page is
// never empty after a signup or a new program (no alerts). The save carries on if it does not
// finish; the monthly pull catches up. Server only: it uses the service key.

import { DemandJobError, firstPulls } from '@/demand/jobs';
import { createAdminClient } from '@/lib/supabase/admin';

export async function pullDemandFirst(institutionId: string): Promise<void> {
  try {
    await firstPulls(createAdminClient(), institutionId, new Date());
  } catch (error) {
    if (!(error instanceof DemandJobError)) throw error;
    console.error(`The first Demand pull did not finish: ${error.message}`);
  }
}
