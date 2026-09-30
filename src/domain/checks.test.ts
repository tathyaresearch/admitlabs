import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CHECKS, checkLooksAt, checkName, checksForLevel, checksForPillar, getCheck } from './checks.ts';
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

  test('approvals means skilling recognition for skilling institutes', () => {
    assert.equal(checkName('approvals', 'skilling'), 'Skilling recognition');
    assert.equal(checkName('approvals', 'college'), 'Approvals');
    assert.match(checkLooksAt('approvals', 'university'), /NIRF, NAAC, AICTE, UGC/);
    assert.equal(checkName('page_speed', 'skilling'), 'Page speed');
  });

  test('unknown keys throw', () => {
    assert.throws(() => getCheck('not_a_check' as never));
  });
});
