// Runs Audits by hand: the way to trigger any scheduled run for testing (spec section 11).
// Uses the same path as the app and the seed, with mock providers in this build.
//
//   npm run audit -- --institution northbank-college               one Audit now, on its plan
//   npm run audit -- --institution riverbend-college --kind team   a team Audit of a prospect
//   npm run audit -- --due                                         every scheduled Audit due today
//   npm run audit -- --due --date 2026-10-15                       everything due on that day
//   npm run audit -- --due --date 2026-10-15 --dry-run             list what is due, run nothing

import { parseArgs } from 'node:util';
import { AuditRunError, dueAudits, runAudit } from '../src/audit/run.ts';
import { istDate } from '../src/domain/dates.ts';
import { formatDate } from '../src/domain/format.ts';
import { scoreLabel } from '../src/domain/scores.ts';
import { AUDIT_TRIGGERS, type AuditTrigger } from '../src/domain/types.ts';
import { writeRivalActions } from '../src/rivals/jobs.ts';
import { institutionBySlug, serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

const { values } = parseArgs({
  options: {
    institution: { type: 'string' },
    kind: { type: 'string' },
    trigger: { type: 'string' },
    date: { type: 'string' },
    due: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) fail(`--date must look like 2026-10-15, got "${values.date}"`);
const asOf = values.date ? istDate(values.date, 10) : new Date();
const db = serviceClient();

const KIND_WORDS: Record<string, string> = { free: 'Free', paid: 'Paid', client: 'Client', team: 'Team', rival: 'Rival' };

async function main(): Promise<void> {
  if (values.due) {
    const due = await dueAudits(db, asOf);
    console.log(`\n${due.length ? due.length : 'No'} scheduled ${due.length === 1 ? 'Audit' : 'Audits'} due on ${formatDate(asOf)}.`);
    for (const item of due) {
      if (values['dry-run']) {
        console.log(`  ${item.name}: ${KIND_WORDS[item.tier]} Audit due`);
        continue;
      }
      const result = await runAudit(db, { institutionId: item.institutionId, asOf, trigger: 'scheduled' });
      console.log(`  ${item.name}: ${KIND_WORDS[result.kind]} Audit saved, score ${result.overall} (${scoreLabel(result.overall)})`);
      // The monthly Rivals 3 things to do follow the institution's own Audit (Paid and Client).
      if ((await writeRivalActions(db, item.institutionId, asOf)) > 0) console.log(`    Rivals 3 things to do updated`);
    }
    console.log('');
    return;
  }

  if (!values.institution) fail('Say which institution (--institution <slug>), or run everything due with --due.');
  const kind = values.kind;
  if (kind !== undefined && kind !== 'team' && kind !== 'rival') fail('--kind can be team or rival. Leave it out for the institution\'s own Audit.');
  const trigger = (values.trigger ?? 'manual') as AuditTrigger;
  if (!AUDIT_TRIGGERS.includes(trigger)) fail(`--trigger can be ${AUDIT_TRIGGERS.join(', ')}.`);

  const institution = await institutionBySlug(db, values.institution);
  const result = await runAudit(db, { institutionId: institution.id, asOf, trigger, kind });
  console.log(
    `\n${institution.name}: ${KIND_WORDS[result.kind]} Audit saved for ${formatDate(asOf)}.` +
      `\n  Score ${result.overall} (${scoreLabel(result.overall)}), ${result.programs} ${result.programs === 1 ? 'program' : 'programs'}, ${result.signals} signals.\n`,
  );
}

try {
  await main();
} catch (error) {
  if (error instanceof AuditRunError) fail(error.message);
  throw error;
}
