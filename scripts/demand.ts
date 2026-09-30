// Runs Demand pulls by hand: the way to trigger the monthly pull for testing (spec section 11).
// Uses the same path as the app and the seed, with mock providers in this build.
//
//   npm run demand -- --due                                everything due today
//   npm run demand -- --due --date 2026-10-28              everything due on that day
//   npm run demand -- --due --date 2026-10-28 --dry-run    list what is due, run nothing
//   npm run demand -- --first --institution <slug>         any first pulls a new institution needs
//
// Due means: every region and program an institution that has signed up needs (its city, its
// state and All India, for each of its programs) without a pull for the month yet. From the 28th
// that is this month; before it, last month. Big spikes in a city alert the Paid and Client
// institutions there.

import { parseArgs } from 'node:util';
import { DemandJobError, demandPullsDue, firstPulls, runDuePulls } from '../src/demand/jobs.ts';
import { regionLabel } from '../src/demand/regions.ts';
import { istDate } from '../src/domain/dates.ts';
import { formatDate, formatMonth, plural } from '../src/domain/format.ts';
import { institutionBySlug, serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

const { values } = parseArgs({
  options: {
    due: { type: 'boolean', default: false },
    first: { type: 'boolean', default: false },
    institution: { type: 'string' },
    date: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) fail(`--date must look like 2026-10-28, got "${values.date}"`);
const asOf = values.date ? istDate(values.date, 6) : new Date();
const db = serviceClient();

async function main(): Promise<void> {
  if (values.due) {
    const { month, due } = await demandPullsDue(db, asOf);
    console.log(`\nDemand pulls due on ${formatDate(asOf)}, for ${formatMonth(month)}: ${due.length ? plural(due.length, 'pull', 'pulls') : 'none'}`);
    if (values['dry-run']) {
      for (const pull of due) console.log(`  ${regionLabel(pull)}, ${pull.programKey}: due`);
      console.log('');
      return;
    }
    for (const result of await runDuePulls(db, asOf)) {
      const spikes = result.spikes.length ? `; ${plural(result.spikes.length, 'spike', 'spikes')}: ${result.spikes.join(' ')}` : '';
      console.log(`  ${regionLabel(result.pull)}, ${result.pull.programKey}: ${plural(result.items, 'grouped item', 'grouped items')}${spikes}`);
    }
    console.log('');
    return;
  }
  if (values.first) {
    if (!values.institution) fail('Say which institution: --first --institution <slug>');
    const institution = await institutionBySlug(db, values.institution);
    const pulled = await firstPulls(db, institution.id, asOf);
    console.log(`\n${institution.name}: ${pulled ? `${plural(pulled, 'first pull', 'first pulls')} done` : 'every region and program it needs was already pulled'}.\n`);
    return;
  }
  fail('Say what to run: --due (with --date and --dry-run if you like), or --first --institution <slug>.');
}

try {
  await main();
} catch (error) {
  if (error instanceof DemandJobError) fail(error.message);
  throw error;
}
