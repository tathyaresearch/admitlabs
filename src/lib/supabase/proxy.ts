// Keeps the Supabase session fresh on every request (called from src/proxy.ts).

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, supabaseConfig } from '../env';
import type { Database } from './database.types';

export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; userId: string | null }> {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  if (!config) return { response, userId: null };

  const supabase = createServerClient<Database>(config.url, config.anonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Nothing may run between creating the client and this call (Supabase guidance for SSR).
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return { response, userId: typeof sub === 'string' ? sub : null };
}
