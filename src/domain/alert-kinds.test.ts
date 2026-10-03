import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from './copy.ts';
import { ALERT_FILTER_LABELS, ALERT_FILTERS, alertFilter, alertLinkText } from './alert-kinds.ts';

describe('alerts by what they are about', () => {
  test('each kind of alert has its filter', () => {
    assert.equal(alertFilter('audit_ready'), 'audit');
    assert.equal(alertFilter('rival_move'), 'rivals');
    assert.equal(alertFilter('demand_spike'), 'students');
    assert.equal(alertFilter('report_ready'), 'reports');
    assert.equal(alertFilter('plan_reminder'), 'plan');
    assert.equal(alertFilter('plan_ended'), 'plan');
    assert.equal(alertFilter('something_new'), null);
  });

  test('each link says where it goes', () => {
    assert.equal(alertLinkText('audit_ready', '/#changed'), 'See what changed');
    assert.equal(alertLinkText('audit_ready', '/audit'), 'See your Audit');
    assert.equal(alertLinkText('rival_move', '/rivals/abc'), 'See the move');
    assert.equal(alertLinkText('demand_spike', '/demand'), 'See what students search for');
    assert.equal(alertLinkText('report_ready', '/reports'), 'See the report');
    assert.equal(alertLinkText('plan_reminder', '/plan'), 'See your plan');
  });

  test('plain words, no dashes', () => {
    for (const filter of ALERT_FILTERS) assert.equal(hasDashes(ALERT_FILTER_LABELS[filter]), false);
  });
});
