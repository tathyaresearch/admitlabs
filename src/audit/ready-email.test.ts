import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { PAID_PRICE_LINE } from '../domain/tiers.ts';
import { auditReadyEmail, auditReadySubject, type AuditReadyInput } from './ready-email.ts';

// Free's Audit ready email (spec section 24): the three words, the top 3 fixes each with Let
// AdmitLabs fix this, the way to the Audit and Subscribe now. Each button opens the dashboard.

const INPUT: AuditReadyInput = {
  institution: 'Northbank College',
  program: 'BBA',
  city: 'Guwahati',
  words: [
    { name: 'Discovered', score: 52, word: 'Okay', note: 'Up from Weak in June' },
    { name: 'Trusted', score: 47, word: 'Okay', note: 'Do they believe you?' },
    { name: 'Chosen', score: 61, word: 'Okay', note: 'Is it easy to pick you?' },
  ],
  fixes: [
    { title: 'Show your full BBA fees', meta: 'Website, Fees · Impact High · Effort Quick', url: 'http://localhost:3000/audit?fix=check%3Afees_shown' },
    { title: 'Publish your BBA placement results', meta: 'Website, Placements · Impact High · Effort Medium', url: 'http://localhost:3000/audit?fix=check%3Aplacement_proof' },
    { title: 'Build up your Google profile and reviews', meta: 'Google, Google profile · Impact High · Effort Medium', url: 'http://localhost:3000/audit?fix=check%3Agoogle_profile' },
  ],
  first: false,
  reviewed: true,
  auditUrl: 'http://localhost:3000/#changed',
  planUrl: 'http://localhost:3000/plan',
  nextAuditOn: '10 Dec 2026',
};

describe('the Audit ready email', () => {
  test('the subject: a first free Audit, or a new one, with the three words', () => {
    assert.equal(auditReadySubject(INPUT), 'Your new free Audit is ready: Discovered 52/100 (Okay), Trusted 47/100 (Okay), Chosen 61/100 (Okay)');
    assert.equal(auditReadySubject({ ...INPUT, first: true }), 'Your free Audit is ready: Discovered 52/100 (Okay), Trusted 47/100 (Okay), Chosen 61/100 (Okay)');
  });

  test('the top 3 fixes, each with Let AdmitLabs fix this opening its panel in the dashboard', () => {
    const email = auditReadyEmail(INPUT, ['owner@northbank-college.example']);
    assert.equal(email.kind, 'audit_ready');
    for (const fix of INPUT.fixes) {
      assert.ok(email.text.includes(fix.title), fix.title);
      assert.ok(email.text.includes(`Let AdmitLabs fix this: ${fix.url}`), fix.url);
    }
    assert.ok(email.html.includes('href="http://localhost:3000/audit?fix=check%3Afees_shown"'));
  });

  test('See what changed (or See your Audit, the first time), Subscribe now at the one price, and the next free Audit', () => {
    const email = auditReadyEmail(INPUT, ['owner@northbank-college.example']);
    assert.match(email.text, /See what changed: http:\/\/localhost:3000\/#changed/);
    assert.match(email.text, /Subscribe now: http:\/\/localhost:3000\/plan/);
    assert.ok(email.text.includes('₹9,999 + GST per month, or ₹24,999 + GST for 3 months, no auto-renew.'));
    assert.ok(email.text.includes(`${PAID_PRICE_LINE}, no auto-renew.`));
    assert.ok(email.text.includes('Your next free Audit comes on 10 Dec 2026.'));
    const first = auditReadyEmail({ ...INPUT, first: true, auditUrl: 'http://localhost:3000/audit' }, ['owner@northbank-college.example']);
    assert.match(first.text, /See your Audit: http:\/\/localhost:3000\/audit/);
  });

  test('says the AdmitLabs team looked it over only when it did', () => {
    assert.match(auditReadyEmail(INPUT, []).text, /The AdmitLabs team looked it over before it came to you\./);
    assert.doesNotMatch(auditReadyEmail({ ...INPUT, reviewed: false }, []).text, /looked it over/);
  });

  test('nothing to fix says so kindly; no dashes anywhere', () => {
    const none = auditReadyEmail({ ...INPUT, fixes: [] }, []);
    assert.match(none.text, /Nothing needs fixing right now\. Keep it that way\./);
    for (const email of [auditReadyEmail(INPUT, []), none]) {
      assert.equal(hasDashes(email.text), false);
      assert.equal(hasDashes(email.subject), false);
    }
  });
});
