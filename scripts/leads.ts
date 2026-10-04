// Leads by hand (spec sections 11 and 23): the daily job that deletes every enquiry past its
// college's keeping time (6, 12 or 24 months, chosen in Settings, Leads; 12 to start), for good.
// The same path the scheduler will use.
//
//   npm run leads -- --purge                     delete them now
//   npm run leads -- --purge --date 2027-09-01   as if it were that day (India time)

import { parseArgs } from 'node:util';
import { istDate } from '../src/domain/dates.ts';
import { formatDate, plural } from '../src/domain/format.ts';
import { LeadsJobError, purgeOldLeads } from '../src/leads/jobs.ts';
import { serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

const { values } = parseArgs({
  options: {
    purge: { type: 'boolean', default: false },
    date: { type: 'string' },
  },
});

if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) fail(`--date must look like 2027-09-01, got "${values.date}"`);
if (!values.purge) fail('Say what to run: --purge (with --date if you like).');
const asOf = values.date ? istDate(values.date, 2) : new Date();

try {
  const deleted = await purgeOldLeads(serviceClient(), asOf);
  console.log(`\n${formatDate(asOf)}: ${deleted ? `${plural(deleted, 'enquiry', 'enquiries')} past their keeping time deleted for good` : 'no enquiry is past its keeping time'}.\n`);
} catch (error) {
  if (error instanceof LeadsJobError) fail(error.message);
  throw error;
}
