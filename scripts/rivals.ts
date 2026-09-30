// Runs rival work by hand: the way to trigger any scheduled rival run for testing (spec section
// 11). Uses the same path as the app and the seed, with mock providers in this build.
//
//   npm run rivals -- --due                                  everything due today
//   npm run rivals -- --due --date 2026-10-05                everything due on that day
//   npm run rivals -- --due --date 2026-10-05 --dry-run      list what is due, run nothing
//   npm run rivals -- --check --institution silverline-college      one weekly check of a rival now
//   npm run rivals -- --actions --institution eastgate-university   rebuild one 3 things to do
//
// Due means: a rival Audit for every tracked rival without one since the 1st of the month; the
// weekly check (moves, with alerts, and best content) for every rival not yet checked this week;
// and the Rivals 3 things to do for every Paid or Client institution without this month's list.

import { parseArgs } from 'node:util';
import { AuditRunError } from '../src/audit/run.ts';
import { istDate } from '../src/domain/dates.ts';
import { formatDate, plural } from '../src/domain/format.ts';
import {
  checkRival,
  rivalActionsDue,
  rivalAuditsDue,
  rivalChecksDue,
  RivalJobError,
  runRivalAudit,
  writeRivalActions,
} from '../src/rivals/jobs.ts';
import { mondayOf } from '../src/rivals/schedule.ts';
import { institutionBySlug, serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

const { values } = parseArgs({
  options: {
    due: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    actions: { type: 'boolean', default: false },
    institution: { type: 'string' },
    date: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) fail(`--date must look like 2026-10-05, got "${values.date}"`);
const asOf = values.date ? istDate(values.date, 10) : new Date();
const dryRun = values['dry-run'];
const db = serviceClient();

/** Runs one piece of work; a known failure is reported and the rest carry on. */
async function attempt<T>(work: () => Promise<T>): Promise<T | string> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof RivalJobError || error instanceof AuditRunError) return `could not run: ${error.message}`;
    throw error;
  }
}

async function due(): Promise<void> {
  console.log(`\nRival work due on ${formatDate(asOf)}:`);

  const audits = await rivalAuditsDue(db, asOf);
  console.log(`\n  Rival Audits (monthly, on the 1st): ${audits.length ? plural(audits.length, 'rival', 'rivals') : 'none due'}`);
  for (const rival of audits) {
    if (dryRun) {
      console.log(`    ${rival.name}: due`);
      continue;
    }
    const result = await attempt(() => runRivalAudit(db, rival.id, asOf));
    console.log(`    ${rival.name}: ${typeof result === 'number' ? `scored ${result}` : result}`);
  }

  const checks = await rivalChecksDue(db, asOf);
  console.log(`\n  Weekly check for the week of ${formatDate(istDate(mondayOf(asOf)))}: ${checks.length ? plural(checks.length, 'rival', 'rivals') : 'none due'}`);
  for (const rival of checks) {
    if (dryRun) {
      console.log(`    ${rival.name}: due`);
      continue;
    }
    const result = await attempt(() => checkRival(db, rival.id, asOf, { notify: true }));
    if (typeof result === 'string') {
      console.log(`    ${rival.name}: ${result}`);
      continue;
    }
    console.log(`    ${rival.name}: ${result.newMoves ? `${plural(result.newMoves, 'new move', 'new moves')}, alerts sent` : 'no new moves'}; ${plural(result.posts, 'best post', 'best posts')} kept`);
  }

  const actions = await rivalActionsDue(db, asOf);
  console.log(`\n  Rivals 3 things to do (Paid and Client): ${actions.length ? plural(actions.length, 'institution', 'institutions') : 'none due'}`);
  for (const institution of actions) {
    if (dryRun) {
      console.log(`    ${institution.name}: due`);
      continue;
    }
    const written = await attempt(() => writeRivalActions(db, institution.id, asOf));
    console.log(`    ${institution.name}: ${typeof written === 'number' ? `${plural(written, 'thing', 'things')} to do written` : written}`);
  }
  console.log('');
}

async function main(): Promise<void> {
  if (values.due) return due();
  if (!values.institution) fail('Run everything due with --due, or name an institution with --check or --actions.');
  const institution = await institutionBySlug(db, values.institution);
  if (values.check) {
    const result = await checkRival(db, institution.id, asOf, { notify: true });
    console.log(`\n${institution.name}: checked for ${formatDate(asOf)}. ${plural(result.newMoves, 'new move', 'new moves')}, ${plural(result.posts, 'best post', 'best posts')} kept.\n`);
    return;
  }
  if (values.actions) {
    const written = await writeRivalActions(db, institution.id, asOf);
    console.log(`\n${institution.name}: ${written ? `${plural(written, 'thing', 'things')} to do written for this month` : 'nothing written (Free, or no rivals yet)'}.\n`);
    return;
  }
  fail('Say what to run: --due, --check or --actions.');
}

try {
  await main();
} catch (error) {
  if (error instanceof RivalJobError || error instanceof AuditRunError) fail(error.message);
  throw error;
}
