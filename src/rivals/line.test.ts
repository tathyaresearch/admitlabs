import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getCheck } from '../domain/checks.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';
import { writeRivalLine } from '../providers/mock/rival-actions.ts';
import { checkScoresOf, sampleAuditChain, sampleRivals } from '../sample/world.ts';
import { compareChecks, type CheckScore } from './compare.ts';
import { lineFacts } from './line.ts';

// The month's one line (spec 8.4): who is ahead of you on the most checks, and on what.

let next = 0;
function score(key: CheckKey, result: CheckResult, points: number, maxPoints = 10): CheckScore {
  next += 1;
  return { checkId: `check-${next}`, key, pillar: getCheck(key).pillar, programKey: null, programName: null, result, points, maxPoints, checkedAt: '2026-09-01T04:30:00.000Z', finding: null, sourceUrl: null };
}

describe('the facts behind the line', () => {
  test('the rival ahead on the most checks, and the two where it leads by the most', async () => {
    const own = (await sampleAuditChain('eastgate-university', 'own', '2026-09-15')).at(-1);
    assert.ok(own);
    const rivals = await sampleRivals('eastgate-university', '2026-09-15');
    const facts = lineFacts(
      rivals.flatMap((rival) => (rival.audit ? [{ id: rival.id, name: rival.name, overall: rival.audit.record.overall, comparisons: compareChecks(checkScoresOf(own), checkScoresOf(rival.audit)) }] : [])),
    );
    assert.equal(facts?.kind, 'ahead');
    if (facts?.kind !== 'ahead') return;
    assert.equal(facts.rival.name, 'Silverline College');
    assert.deepEqual(facts.checks, ['placement_proof', 'instagram_activity']);
    assert.equal(facts.checksAhead, 5);
  });

  test('the most checks ahead wins, then the higher score, then the name', () => {
    const yours = [score('instagram_activity', 'weak', 3), score('youtube', 'weak', 3), score('fees_shown', 'weak', 3)];
    const alpha = [score('instagram_activity', 'strong', 10), score('youtube', 'weak', 3), score('fees_shown', 'weak', 3)];
    const beta = [score('instagram_activity', 'okay', 6), score('youtube', 'okay', 6), score('fees_shown', 'weak', 3)];
    const facts = lineFacts([
      { id: 'a', name: 'Alpha', overall: 80, comparisons: compareChecks(yours, alpha) },
      { id: 'b', name: 'Beta', overall: 60, comparisons: compareChecks(yours, beta) },
    ]);
    assert.deepEqual(facts, { kind: 'ahead', rival: { id: 'b', name: 'Beta' }, checks: ['instagram_activity', 'youtube'], checksAhead: 2 });
    const level = lineFacts([
      { id: 'a', name: 'Alpha', overall: 60, comparisons: compareChecks(yours, beta) },
      { id: 'b', name: 'Beta', overall: 70, comparisons: compareChecks(yours, beta) },
    ]);
    assert.equal(level?.kind === 'ahead' ? level.rival.name : null, 'Beta');
  });

  test('nobody ahead anywhere, or nothing to compare yet', () => {
    const yours = [score('instagram_activity', 'strong', 10)];
    assert.deepEqual(lineFacts([{ id: 'a', name: 'Alpha', overall: 50, comparisons: compareChecks(yours, [score('instagram_activity', 'weak', 3)]) }]), { kind: 'none' });
    assert.equal(lineFacts([]), null);
    assert.equal(lineFacts([{ id: 'a', name: 'Alpha', overall: 50, comparisons: compareChecks([], []) }]), null);
  });
});

describe('the line, as the writer writes it', () => {
  test('who is ahead and on what, in one sentence', () => {
    assert.equal(
      writeRivalLine({ institutionType: 'university', city: 'Guwahati', allLocal: true, facts: { kind: 'ahead', rival: { id: 's', name: 'Silverline College' }, checks: ['placement_proof', 'instagram_activity'], checksAhead: 5 } }),
      'This month, Silverline College is ahead on placement proof and Instagram.',
    );
    assert.equal(
      writeRivalLine({ institutionType: 'skilling', city: 'Tezpur', allLocal: false, facts: { kind: 'ahead', rival: { id: 'p', name: 'Pinegrove Skills Hub' }, checks: ['approvals'], checksAhead: 1 } }),
      'This month, Pinegrove Skills Hub is ahead on showing their skilling recognition.',
    );
  });

  test('nobody ahead: the city, unless a rival is from a Nearby city', () => {
    assert.equal(writeRivalLine({ institutionType: 'college', city: 'Guwahati', allLocal: true, facts: { kind: 'none' } }), 'This month, no rival in Guwahati is ahead of you on any check.');
    assert.equal(writeRivalLine({ institutionType: 'skilling', city: 'Tezpur', allLocal: false, facts: { kind: 'none' } }), 'This month, none of your rivals is ahead of you on any check.');
  });
});
