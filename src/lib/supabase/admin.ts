// Supabase with the service key, for the few server-side jobs that write on behalf of the
// system: saving an Audit the scoring engine produced. Never import this into a client
// component. The key is not a NEXT_PUBLIC variable, so it never reaches the browser.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('The service key is not set. Run `npm run env:local`, then restart `npm run dev`.');
  }
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
