// Supabase for Server Components, Server Actions and Route Handlers. It acts as the signed-in
// user, so row level security decides what comes back.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, requireSupabaseConfig } from '../env';
import type { Database } from './database.types';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseConfig();
  return createServerClient<Database>(url, anonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set cookies. The proxy refreshes sessions instead.
        }
      },
    },
  });
}
