// Creates Drishti's local JWT signing key (supabase/signing_keys.json, git-ignored) if it is
// missing. Sessions are then signed with a key that belongs to Drishti alone.

import { existsSync, writeFileSync } from 'node:fs';
import { fail, runSupabase, SIGNING_KEYS_PATH } from './lib/local.ts';

if (existsSync(SIGNING_KEYS_PATH)) {
  console.log('Drishti signing key found.');
} else {
  const { stdout, status } = runSupabase(['gen', 'signing-key', '--algorithm', 'ES256']);
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (status !== 0 || start < 0 || end <= start) fail('Could not generate a signing key with the Supabase CLI.');
  const jwk = JSON.parse(stdout.slice(start, end + 1)) as { kty?: string; alg?: string; d?: string };
  if (jwk.kty !== 'EC' || jwk.alg !== 'ES256' || !jwk.d) fail('The Supabase CLI returned an unexpected signing key.');
  writeFileSync(SIGNING_KEYS_PATH, JSON.stringify([jwk]), 'utf8');
  console.log('Created Drishti\'s local signing key at supabase/signing_keys.json (git-ignored).');
}
