import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DEMAND_RULES } from './demand.ts';
import { entitlement } from './entitlements.ts';
import { SCHEDULES } from './schedules.ts';

describe('Demand rules', () => {
  test('a big spike is a rise of 40% or more (approved to start, adjustable here)', () => {
    assert.equal(DEMAND_RULES.spikeMinChangePct, 40);
  });

  test('shared pulls monthly on the 28th, and Make these 3 (spec 9.4)', () => {
    assert.equal(DEMAND_RULES.pullDay, 28);
    assert.equal(DEMAND_RULES.picks, 3);
  });

  test('honest numbers in words: Rising fast from 40%, Rising from 10% (spec 9.5, adjustable here)', () => {
    assert.equal(DEMAND_RULES.risingFastMinPct, 40);
    assert.equal(DEMAND_RULES.risingMinPct, 10);
  });

  test('matches what each plan sees and gets (spec sections 10 and 11)', () => {
    assert.equal(entitlement('demand_make_three', 'free').text, 'The first one, for its program');
    assert.equal(entitlement('demand_make_three', 'paid').text, 'All 3');
    assert.equal(entitlement('demand_programs', 'free').limit, 1);
    assert.equal(entitlement('demand_programs', 'client').access, 'full');
    assert.equal(entitlement('demand_everything_else', 'free').access, 'placeholder');
    assert.equal(SCHEDULES.free.demandSpikeAlerts, false);
    assert.equal(SCHEDULES.paid.demandSpikeAlerts, true);
    assert.equal(SCHEDULES.client.demandSpikeAlerts, true);
    assert.equal(SCHEDULES.free.demandEveryMonths, 1);
  });
});
