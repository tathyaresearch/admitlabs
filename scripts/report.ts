// Makes monthly summaries and reports by hand: the way to trigger the report run for testing (spec
// sections 11, 12, 24 and 25). Uses the same path as the schedule and the seed.
//
//   npm run report -- --due                                    every report due today
//   npm run report -- --due --date 2026-10-01                  every report due on that day
//   npm run report -- --due --date 2026-10-01 --dry-run        list what is due, make nothing
//   npm run report -- --institution <slug> --month 2026-09     make (or make again) one report
//   ... --out report.pdf                                       also save a copy of the PDF here
//   ... --preview --out report.pdf                             render only: nothing stored or recorded
//   npm run report -- --institution <slug> --month 2026-09 --approve
//                                                              Approve and send a waiting summary
//
// Due means: a claimed institution on Paid or Client on that day, with an Audit for last month
// and no report for it yet. Reports are made on the 1st for the month just ended. With Review first
// on, a new summary and its report wait in the team's To review; sent automatically, the summary
// goes by email to the local test inbox as it is made.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { istDate } from '../src/domain/dates.ts';
import { formatDate, formatMonth, plural } from '../src/domain/format.ts';
import { approveReport, canMakeYet, makeReport, renderMonth, reportsDue, ReportJobError, type MadeMonth } from '../src/report/jobs.ts';
import { ReportLoadError } from '../src/report/load.ts';
import { reportDayOf } from '../src/report/schedule.ts';
import { institutionBySlug, serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

const { values } = parseArgs({
  options: {
    due: { type: 'boolean', default: false },
    institution: { type: 'string' },
    month: { type: 'string' },
    date: { type: 'string' },
    out: { type: 'string' },
    preview: { type: 'boolean', default: false },
    approve: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) fail(`--date must look like 2026-10-01, got "${values.date}"`);
if (values.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month)) fail(`--month must look like 2026-09, got "${values.month}"`);
const db = serviceClient();

const size = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** "waits in To review", or "sent to 3 people". */
const outcome = (made: MadeMonth) => (made.review === 'waiting' ? 'waits in To review' : `approved, the summary sent to ${plural(made.emails?.sent ?? 0, 'person', 'people')}`);

async function main(): Promise<void> {
  if (values.due) {
    const now = values.date ? istDate(values.date, 7) : new Date();
    const { month, due } = await reportsDue(db, now);
    console.log(`\nReports due on ${formatDate(now)}, for ${formatMonth(month)}: ${due.length ? plural(due.length, 'report', 'reports') : 'none'}`);
    for (const institution of due) {
      if (values['dry-run']) {
        console.log(`  ${institution.name}: due`);
        continue;
      }
      const made = await makeReport(db, institution.id, month, now, { notify: true });
      console.log(`  ${institution.name}: ${plural(made.pages, 'page', 'pages')}, ${size(made.size)}, saved as ${made.path}, ${outcome(made)}`);
    }
    console.log('');
    return;
  }

  if (values.institution) {
    if (!values.month) fail('Say which month: --institution <slug> --month 2026-09');
    const institution = await institutionBySlug(db, values.institution);
    if (values.approve) {
      const { data: report, error } = await db.from('reports').select('id, review').eq('institution_id', institution.id).eq('month', `${values.month}-01`).maybeSingle();
      if (error) fail(`Could not read the report: ${error.message}`);
      if (!report) fail(`${institution.name} has no report for ${formatMonth(values.month)}.`);
      const { emails } = await approveReport(db, report.id);
      console.log(`
${institution.name}, ${formatMonth(values.month)}: approved, the summary sent to ${plural(emails?.sent ?? 0, 'person', 'people')}.
`);
      return;
    }
    // Made on the 1st after the month by default, or on --date; never later than now.
    const planned = values.date ? istDate(values.date, 7) : reportDayOf(values.month);
    const madeAt = planned.getTime() > Date.now() ? new Date() : planned;
    if (!canMakeYet(values.month, madeAt)) fail(`${formatMonth(values.month)} has not started yet.`);
    const saved = values.preview ? null : await makeReport(db, institution.id, values.month, madeAt, { notify: true });
    const made = saved ?? (await renderMonth(db, institution.id, values.month, madeAt));
    const where = saved ? `, saved as ${saved.path}, ${outcome(saved)}` : ', not saved (preview)';
    console.log(`\n${institution.name}, ${formatMonth(values.month)}: ${plural(made.pages, 'page', 'pages')}, ${size(made.size)}${where}.`);
    if (values.out) {
      writeFileSync(resolve(values.out), made.pdf);
      console.log(`A copy is at ${resolve(values.out)}.`);
    }
    console.log('');
    return;
  }

  fail('Say what to run: --due (with --date and --dry-run if you like), or --institution <slug> --month 2026-09.');
}

try {
  await main();
} catch (error) {
  if (error instanceof ReportJobError || error instanceof ReportLoadError) fail(error.message);
  throw error;
}
