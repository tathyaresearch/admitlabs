// A service-key client for scripts, locked to Drishti's own local Supabase.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database.types.ts';
import { assertDrishtiLocal, fail } from './local.ts';

export function serviceClient(): SupabaseClient<Database> {
  const url = assertDrishtiLocal(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail('SUPABASE_SERVICE_ROLE_KEY is not set. Run `npm run env:local`.');
  return createClient<Database>(url.origin, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function institutionBySlug(db: SupabaseClient<Database>, slug: string): Promise<{ id: string; name: string }> {
  const { data, error } = await db.from('institutions').select('id, name').eq('slug', slug).maybeSingle();
  if (error) fail(`Could not read institutions: ${error.message}`);
  if (!data) fail(`No institution with the slug "${slug}".`);
  return data;
}
