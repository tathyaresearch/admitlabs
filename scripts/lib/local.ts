// Safety rails for scripts: they only ever talk to Drishti's own local Supabase.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DRISHTI_API_PORT = '55321';
export const SIGNING_KEYS_PATH = join(ROOT, 'supabase', 'signing_keys.json');

export function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Refuse anything that is not Drishti's local Supabase API (never a hosted project, never another local stack). */
export function assertDrishtiLocal(url: string | undefined): URL {
  if (!url) fail('NEXT_PUBLIC_SUPABASE_URL is not set. Run `npm run env:local` after `npm run db:start`.');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail(`Not a valid URL: ${url}`);
  }
  const localHost = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  if (!localHost || parsed.port !== DRISHTI_API_PORT) {
    fail(`Refusing to use ${url}. Drishti scripts only talk to Drishti's local Supabase at http://127.0.0.1:${DRISHTI_API_PORT}.`);
  }
  return parsed;
}

/** Run the Supabase CLI against this repo's project (supabase/config.toml, project_id "drishti"). */
export function runSupabase(args: readonly string[]): { stdout: string; stderr: string; status: number } {
  const windows = process.platform === 'win32';
  // On Windows the CLI is a .cmd shim, so it needs a shell. Arguments are fixed strings from our own code.
  const result = windows
    ? spawnSync(['supabase', ...args].join(' '), { cwd: ROOT, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 })
    : spawnSync('supabase', [...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) fail(`Could not run the Supabase CLI: ${result.error.message}`);
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status ?? 1 };
}

export interface LocalStatus {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
  MAILPIT_URL?: string;
  INBUCKET_URL?: string;
  STUDIO_URL?: string;
  DB_URL?: string;
}

export function readStatus(): LocalStatus {
  const { stdout, status } = runSupabase(['status', '-o', 'json']);
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (status !== 0 || start < 0 || end <= start) fail('Drishti\'s local Supabase is not running. Start it with `npm run db:start`.');
  const parsed = JSON.parse(stdout.slice(start, end + 1)) as Partial<LocalStatus>;
  if (!parsed.API_URL || !parsed.ANON_KEY || !parsed.SERVICE_ROLE_KEY) fail('`supabase status` did not report the API URL and keys.');
  return parsed as LocalStatus;
}

/** The key id of Drishti's own signing key, so we can check the API keys were signed with it. */
export function drishtiSigningKeyId(): string | null {
  if (!existsSync(SIGNING_KEYS_PATH)) return null;
  const keys = JSON.parse(readFileSync(SIGNING_KEYS_PATH, 'utf8')) as Array<{ kid?: string }>;
  return keys[0]?.kid ?? null;
}

export function jwtHeader(token: string): { alg?: string; kid?: string } {
  const [header] = token.split('.');
  if (!header) return {};
  try {
    return JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as { alg?: string; kid?: string };
  } catch {
    return {};
  }
}
