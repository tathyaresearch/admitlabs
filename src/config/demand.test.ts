import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DEMAND_RULES } from './demand.ts';
import { entitlement } from './entitlements.ts';
import { SCHEDULES } from './schedules.ts';

describe('Demand rules', () => {
  test('a big spike is a rise of 40% or more (approved to start, adjustable here)', () => {
    assert.equal(DEMAND_RULES.spikeMinChangePct, 40);
  });

  test('shared pulls monthly on the 28th, 5 top questions and 5 content ideas (spec 9.4)', () => {
    assert.equal(DEMAND_RULES.pullDay, 28);
    assert.equal(DEMAND_RULES.topQuestions, 5);
    assert.equal(DEMAND_RULES.contentIdeas, 5);
  });

  test('matches what each plan sees and gets (spec sections 10 and 11)', () => {
    assert.equal(entitlement('demand_rising_trend', 'free').access, 'full');
    assert.equal(entitlement('demand_everything_else', 'free').access, 'placeholder');
    assert.equal(entitlement('demand_mentions', 'free').access, 'none');
    assert.equal(entitlement('demand_mentions', 'paid').access, 'full');
    assert.equal(SCHEDULES.free.demandSpikeAlerts, false);
    assert.equal(SCHEDULES.paid.demandSpikeAlerts, true);
    assert.equal(SCHEDULES.client.demandSpikeAlerts, true);
    assert.equal(SCHEDULES.free.demandEveryMonths, 1);
  });
});
