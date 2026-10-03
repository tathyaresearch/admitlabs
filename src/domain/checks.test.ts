import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CHECKS,
  INSTITUTION_CHECK_KEYS,
  PROGRAM_CHECK_KEYS,
  checkAction,
  checkLooksAt,
  checkName,
  checksForLevel,
  checksForPillar,
  compareChecks,
  getCheck,
  isProgramCheck,
} from './checks.ts';
import { CHECK_KEYS } from './types.ts';

describe('check catalogue (spec 7.2)', () => {
  test('has all 17 checks, once each, in spec order', () => {
    assert.deepEqual(
      CHECKS.map((check) => check.key),
      [...CHECK_KEYS],
    );
  });

  test('pillars hold 6, 5 and 6 checks', () => {
    assert.equal(checksForPillar('discovered').length, 6);
    assert.equal(checksForPillar('trusted').length, 5);
    assert.equal(checksForPillar('chosen').length, 6);
  });

  test('program level checks match the spec', () => {
    assert.deepEqual(
      checksForLevel('program').map((check) => check.key).sort(),
      ['admission_steps', 'ai_answers', 'fees_shown', 'google_search', 'placement_proof', 'program_page'],
    );
    assert.equal(checksForLevel('institution').length, 11);
  });

  test('the program and institution key lists agree with the catalogue', () => {
    assert.deepEqual([...PROGRAM_CHECK_KEYS].sort(), checksForLevel('program').map((check) => check.key).sort());
    assert.deepEqual([...INSTITUTION_CHECK_KEYS], checksForLevel('institution').map((check) => check.key));
    for (const key of CHECK_KEYS) assert.equal(isProgramCheck(key), getCheck(key).level === 'program', key);
  });

  test('checks sort by pillar, then in spec order', () => {
    const shuffled = [...CHECK_KEYS].reverse();
    assert.deepEqual(shuffled.sort(compareChecks), [...CHECK_KEYS]);
  });

  test('approvals means skilling recognition for skilling institutes', () => {
    assert.equal(checkName('approvals', 'skilling'), 'Skilling recognition');
    assert.equal(checkName('approvals', 'college'), 'Approvals');
    assert.match(checkLooksAt('approvals', 'university'), /NIRF, NAAC, AICTE, UGC/);
    assert.equal(checkName('page_speed', 'skilling'), 'Page speed');
  });

  test('what to do about a check, in a few words, naming the programs when given', () => {
    assert.equal(checkAction('fees_shown', ['BBA', 'MBA'], 'college'), 'Show your full BBA and MBA fees');
    assert.equal(checkAction('fees_shown', [], 'college'), 'Show your full fees');
    assert.equal(checkAction('program_page', [], 'college'), 'Give each program a page of its own');
    assert.equal(checkAction('google_search', ['BBA', 'BCA', 'MBA'], 'college'), 'Get found when students search for BBA, BCA and MBA');
    assert.equal(checkAction('approvals', [], 'skilling'), 'Show your skilling recognition on your website');
    for (const key of CHECK_KEYS) {
      for (const programs of [[], ['BBA']]) {
        const action = checkAction(key, programs, 'college');
        assert.ok(action.length > 0 && !/your programs fees|  /.test(action), action);
      }
    }
  });

  test('when nothing was found, the action is the first step', () => {
    assert.equal(checkAction('review_rating', [], 'college', 'missing'), 'Get your first Google reviews');
    assert.equal(checkAction('review_rating', [], 'college', 'okay'), 'Reply to every Google review');
    assert.equal(checkAction('google_profile', [], 'skilling', 'missing'), 'Set up your Google profile');
    assert.equal(checkAction('youtube', [], 'college', 'missing'), 'Start a YouTube channel');
    assert.equal(checkAction('youtube', [], 'college', 'weak'), 'Post a short YouTube video each month');
    // Where the usual action already fits a first step, it stays.
    assert.equal(checkAction('fees_shown', ['BBA'], 'college', 'missing'), 'Show your full BBA fees');
    assert.equal(checkAction('approvals', [], 'skilling', 'missing'), 'Show your skilling recognition on your website');
  });

  test('unknown keys throw', () => {
    assert.throws(() => getCheck('not_a_check' as never));
  });
});
