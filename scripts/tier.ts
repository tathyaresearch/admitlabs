// Switches a local institution's tier, so one institution can be checked on Free, Paid and
// Client. In the product only Admin sets tiers (the team screens arrive in Phase 6).
// A plan that starts today runs its first Audit straight away, covering every program.
//
//   npm run tier -- --institution northbank-college --tier paid                 Paid from today, 3 months
//   npm run tier -- --institution northbank-college --tier paid --months 1      Paid from today, Monthly
//   npm run tier -- --institution northbank-college --tier paid --from 2026-06-01   a 3-month Paid plan that ended on 1 Sep
//   npm run tier -- --institution northbank-college --tier client
//   npm run tier -- --institution northbank-college --tier free

import { parseArgs } from 'node:util';
import { runAudit } from '../src/audit/run.ts';
import { istDate } from '../src/domain/dates.ts';
import { formatDate } from '../src/domain/format.ts';
import { DEFAULT_PAID_MONTHS, effectiveTier, paidPlanEndsAt, parsePaidMonths } from '../src/domain/tiers.ts';
import { TIER_LABELS, TIERS, type Tier } from '../src/domain/types.ts';
import { writeRivalActions } from '../src/rivals/jobs.ts';
import { ADMIN_EMAIL } from '../src/sample/institutions.ts';
import { institutionBySlug, serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

const { values } = parseArgs({
  options: {
    institution: { type: 'string' },
    tier: { type: 'string' },
    from: { type: 'string' },
    months: { type: 'string' },
  },
});

if (!values.institution) fail('Say which institution: --institution <slug>');
const tier = values.tier as Tier;
if (!TIERS.includes(tier)) fail('Say which tier: --tier free, paid or client');
if (values.from && !/^\d{4}-\d{2}-\d{2}$/.test(values.from)) fail(`--from must look like 2026-10-15, got "${values.from}"`);
const months = values.months === undefined ? DEFAULT_PAID_MONTHS : parsePaidMonths(values.months);
if (!months) fail(`--months must be 1 or 3, got "${values.months}"`);

const db = serviceClient();
const institution = await institutionBySlug(db, values.institution);
const { data: plan, error } = await db.from('plans').select('starts_at').eq('institution_id', institution.id).maybeSingle();
if (error) fail(`Could not read the plan: ${error.message}`);
if (!plan) fail(`${institution.name} has not signed up, so it has no plan to change.`);

const { data: admins } = await db.auth.admin.listUsers();
const admin = admins?.users.find((user) => user.email === ADMIN_EMAIL)?.id ?? null;

const startsAt = values.from ? istDate(values.from, 10) : tier === 'free' ? new Date(plan.starts_at) : new Date();
const paidMonths = tier === 'paid' ? months : null;
const endsAt = paidMonths ? paidPlanEndsAt(startsAt, paidMonths) : null;
const update = await db
  .from('plans')
  .update({ tier, starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, paid_months: paidMonths, set_by: admin })
  .eq('institution_id', institution.id);
if (update.error) fail(`Could not change the plan: ${update.error.message}`);

const now = effectiveTier({ tier, startsAt, endsAt }, new Date());
console.log(`\n${institution.name} is now on ${TIER_LABELS[tier]}${paidMonths ? ` (${paidMonths === 1 ? 'Monthly' : `${paidMonths} months`})` : ''}: from ${formatDate(startsAt)}, ${endsAt ? `to ${formatDate(endsAt)}` : 'no end date'}.`);
console.log(`It counts as ${TIER_LABELS[now]} today.${now === 'free' && tier !== 'free' ? ' The plan has ended or not started yet.' : ''}`);

// The day a Paid or Client plan starts, its first Audit runs (spec section 11: the monthly run
// date is the plan start date).
if (now !== 'free' && !values.from) {
  const result = await runAudit(db, { institutionId: institution.id, asOf: new Date(), trigger: 'scheduled', createdBy: admin });
  console.log(`First ${TIER_LABELS[now]} Audit saved: score ${result.overall}, ${result.programs} ${result.programs === 1 ? 'program' : 'programs'}.`);
  const actions = await writeRivalActions(db, institution.id, new Date());
  if (actions) console.log(`Rivals 3 things to do written for this month (${actions}).`);
}
console.log('');
