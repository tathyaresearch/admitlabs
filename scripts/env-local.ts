// Writes .env.local (git-ignored) from `supabase status` for Drishti's local stack.
// Uses the anon and service role keys, which are signed with Drishti's own signing key,
// so they are unique to Drishti and do not work against any other local stack.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertDrishtiLocal, drishtiSigningKeyId, fail, jwtHeader, readStatus, ROOT } from './lib/local.ts';

const status = readStatus();
assertDrishtiLocal(status.API_URL);

const kid = drishtiSigningKeyId();
for (const [name, key] of [
  ['anon', status.ANON_KEY],
  ['service role', status.SERVICE_ROLE_KEY],
] as const) {
  const header = jwtHeader(key);
  if (header.alg !== 'ES256' || !kid || header.kid !== kid) {
    fail(`The ${name} key is not signed with Drishti's own signing key. Run \`npm run db:stop\`, then \`npm run db:start\`.`);
  }
}

const lines = [
  '# Written by `npm run env:local` from `supabase status` (project: drishti).',
  '# Local development only. Git-ignored. Never put real service keys here.',
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  `DRISHTI_MAILPIT_URL=${status.MAILPIT_URL ?? status.INBUCKET_URL ?? 'http://127.0.0.1:55324'}`,
  '',
];

writeFileSync(join(ROOT, '.env.local'), lines.join('\n'), 'utf8');
console.log(`Wrote .env.local for ${status.API_URL} (keys signed with Drishti's own key).`);
