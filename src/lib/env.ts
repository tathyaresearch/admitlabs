// Environment for the app. Local development only in this build: the values come from
// Drishti's own local Supabase (see `npm run env:local`).

/** Drishti's own auth cookie name, so it never mixes with other apps on localhost. */
export const AUTH_COOKIE_NAME = 'drishti-auth';

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requireSupabaseConfig(): { url: string; anonKey: string } {
  const config = supabaseConfig();
  if (!config) {
    throw new Error('Supabase is not set up. Run `npm run db:start`, then `npm run db:reset`, then restart `npm run dev`.');
  }
  return config;
}

export function mailpitUrl(): string {
  return process.env.DRISHTI_MAILPIT_URL ?? 'http://127.0.0.1:55324';
}
