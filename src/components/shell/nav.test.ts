import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { INSTITUTION_NAV, institutionNav, itemActive, LEADS_MOBILE_PRIMARY, MOBILE_PRIMARY, teamHome, teamMobilePrimary, teamNav } from './nav.ts';

describe('the dashboard menu', () => {
  test('Leads sits after Demand for an institution with Leads, and nowhere for the rest', () => {
    assert.deepEqual(
      institutionNav(true)[0]?.items.map((item) => item.href),
      ['/', '/audit', '/rivals', '/demand', '/leads', '/reports'],
    );
    assert.equal(institutionNav(false), INSTITUTION_NAV);
    assert.ok(!INSTITUTION_NAV.flatMap((section) => section.items).some((item) => item.href === '/leads'));
  });

  test('Brain sits after Leads for a Client', () => {
    assert.deepEqual(
      institutionNav(true, true)[0]?.items.map((item) => item.href),
      ['/', '/audit', '/rivals', '/demand', '/leads', '/brain', '/reports'],
    );
    assert.ok(!institutionNav(true)[0]?.items.some((item) => item.href === '/brain'));
  });

  test('a Client’s phone bar has Leads in place of Demand', () => {
    assert.deepEqual(LEADS_MOBILE_PRIMARY, ['/', '/audit', '/rivals', '/leads']);
    assert.deepEqual(MOBILE_PRIMARY, ['/', '/audit', '/rivals', '/demand']);
  });
});

describe('the team menu by access level (spec section 27)', () => {
  const hrefs = (role: 'admin' | 'team' | 'client_manager') => teamNav(role)[0]?.items.map((item) => item.href);

  test('Admin: Audit, Enquiries, Institutions, Clients, Team', () => {
    assert.deepEqual(hrefs('admin'), ['/team/review', '/team/enquiries', '/team', '/team/clients', '/team/users']);
    assert.deepEqual(teamNav('admin')[0]?.items.map((item) => item.label), ['Audit', 'Enquiries', 'Institutions', 'Clients', 'Team']);
  });

  test('Team member: the same without Team', () => {
    assert.deepEqual(hrefs('team'), ['/team/review', '/team/enquiries', '/team', '/team/clients']);
  });

  test('Client manager: their Enquiries and Clients only, starting at Clients', () => {
    assert.deepEqual(hrefs('client_manager'), ['/team/enquiries', '/team/clients']);
    assert.equal(teamHome('client_manager'), '/team/clients');
    assert.equal(teamHome('team'), '/team');
    assert.deepEqual(teamMobilePrimary('client_manager'), ['/team/enquiries', '/team/clients']);
  });

  test('Audit lights up on each of its tabs; no Client Brain item', () => {
    const audit = teamNav('team')[0]?.items.find((item) => item.label === 'Audit');
    assert.ok(audit);
    for (const path of ['/team/review', '/team/review/abc', '/team/bulk', '/team/bulk/run', '/team/ads']) assert.ok(itemActive(path, audit), path);
    assert.ok(!itemActive('/team', audit));
    assert.ok(!teamNav('admin')[0]?.items.some((item) => /brain/i.test(item.href) || /brain/i.test(item.label)));
  });

  test('a Client manager’s Clients item lights up on their Client pages', () => {
    const clients = teamNav('client_manager')[0]?.items.find((item) => item.href === '/team/clients');
    assert.ok(clients && itemActive('/team/institutions/abc/brain', clients));
  });
});
