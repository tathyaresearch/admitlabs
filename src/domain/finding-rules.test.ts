import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checkFixKey, findingFixKey, parseFixKey } from './fix-key.ts';
import { findingEffort, findingHasFix, findingImpact, findingIsGood, REPEATED_COMPLAINT, type FindingFacts } from './finding-rules.ts';

const finding = (kind: FindingFacts['kind'], extra: Partial<FindingFacts> = {}): FindingFacts => ({
  place: kind === 'listing' || kind === 'news' || kind === 'directory' ? 'other' : 'people',
  kind,
  repeats: 1,
  listing: null,
  ...extra,
});

describe('findings: what has something to do, and how much it matters (spec 7.7)', () => {
  test('an open question, a complaint and a listing to correct have a fix; good news and a right listing do not', () => {
    assert.equal(findingHasFix(finding('unanswered')), true);
    assert.equal(findingHasFix(finding('bad')), true);
    assert.equal(findingHasFix(finding('listing', { listing: 'old_details' })), true);
    assert.equal(findingHasFix(finding('directory', { listing: 'missing' })), true);
    assert.equal(findingHasFix(finding('listing')), false);
    assert.equal(findingHasFix(finding('good')), false);
    assert.equal(findingHasFix(finding('news')), false);
  });

  test('impact: the same complaint 3 times or more is High; an open question Medium; a missing listing Low', () => {
    assert.equal(findingImpact(finding('bad', { repeats: REPEATED_COMPLAINT })), 'high');
    assert.equal(findingImpact(finding('bad', { repeats: 2 })), 'medium');
    assert.equal(findingImpact(finding('unanswered')), 'medium');
    assert.equal(findingImpact(finding('listing', { listing: 'old_details' })), 'medium');
    assert.equal(findingImpact(finding('listing', { listing: 'missing_courses' })), 'medium');
    assert.equal(findingImpact(finding('listing', { listing: 'missing' })), 'low');
    assert.equal(findingImpact(finding('good')), null);
  });

  test('replying or correcting a listing is quick; nothing to do has no effort', () => {
    assert.equal(findingEffort(finding('unanswered')), 'easy');
    assert.equal(findingEffort(finding('news')), null);
  });

  test("what's good: praise, a news story, a listing that is right", () => {
    assert.equal(findingIsGood(finding('good')), true);
    assert.equal(findingIsGood(finding('news')), true);
    assert.equal(findingIsGood(finding('listing')), true);
    assert.equal(findingIsGood(finding('listing', { listing: 'old_details' })), false);
    assert.equal(findingIsGood(finding('bad')), false);
  });
});

describe('which fix a request is about', () => {
  test('a check or a finding, and back', () => {
    assert.equal(checkFixKey('easy_enquiry'), 'check:easy_enquiry');
    assert.equal(findingFixKey('eastgate-reddit-hostel-fees'), 'finding:eastgate-reddit-hostel-fees');
    assert.deepEqual(parseFixKey('check:fees_shown'), { kind: 'check', checkKey: 'fees_shown' });
    assert.deepEqual(parseFixKey('finding:a:b'), { kind: 'finding', findingKey: 'a:b' });
    assert.equal(parseFixKey('check:not_a_check'), null);
    assert.equal(parseFixKey('finding:'), null);
    assert.equal(parseFixKey('anything'), null);
  });
});
