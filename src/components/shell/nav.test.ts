import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { INSTITUTION_NAV, institutionNav, LEADS_MOBILE_PRIMARY, MOBILE_PRIMARY } from './nav.ts';

describe('the dashboard menu', () => {
  test('Leads sits after Demand for an institution with Leads, and nowhere for the rest', () => {
    assert.deepEqual(
      institutionNav(true)[0]?.items.map((item) => item.href),
      ['/', '/audit', '/rivals', '/demand', '/leads', '/reports'],
    );
    assert.equal(institutionNav(false), INSTITUTION_NAV);
    assert.ok(!INSTITUTION_NAV.flatMap((section) => section.items).some((item) => item.href === '/leads'));
  });

  test('a Client’s phone bar has Leads in place of Demand', () => {
    assert.deepEqual(LEADS_MOBILE_PRIMARY, ['/', '/audit', '/rivals', '/leads']);
    assert.deepEqual(MOBILE_PRIMARY, ['/', '/audit', '/rivals', '/demand']);
  });
});
