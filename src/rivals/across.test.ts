import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CHECKS, getCheck } from '../domain/checks.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';
import { checksAcross, leadSentence, type AcrossRow, type AcrossSide } from './across.ts';
import { compareChecks, type CheckScore } from './compare.ts';

let next = 0;
function score(key: CheckKey, result: CheckResult, points: number, maxPoints: number, program: string | null = null): CheckScore {
  next += 1;
  return {
    checkId: `check-${next}`,
    key,
    pillar: getCheck(key).pillar,
    programKey: program ? program.toLowerCase() : null,
    programName: program,
    result,
    points,
    maxPoints,
    checkedAt: '2026-09-01T04:30:00.000Z',
    finding: null,
    sourceUrl: null,
  };
}

const YOU: AcrossSide = { id: 'you', name: 'Eastgate University', you: true };
const SILVERLINE: AcrossSide = { id: 'silverline', name: 'Silverline College', you: false };
const HIGHFIELD: AcrossSide = { id: 'highfield', name: 'Highfield University', you: false };
const NORTHBANK: AcrossSide = { id: 'northbank', name: 'Northbank College', you: false };
const SIDES = [YOU, SILVERLINE, HIGHFIELD, NORTHBANK];

const row = (rows: AcrossRow[], key: CheckKey) => {
  const found = rows.find((candidate) => candidate.key === key);
  assert.ok(found, `no row for ${key}`);
  return found;
};

// Yours: Instagram Okay (10 of 20), YouTube Strong, fees for BBA Okay and BCA Weak.
const yours = [
  score('instagram_activity', 'okay', 10, 20),
  score('youtube', 'strong', 10, 10),
  score('fees_shown', 'okay', 6, 10, 'BBA'),
  score('fees_shown', 'weak', 3, 10, 'BCA'),
];

function across(rivals: Array<[AcrossSide, CheckScore[]]>): AcrossRow[] {
  return checksAcross(
    YOU,
    rivals.map(([side, theirs]) => ({ side, comparisons: compareChecks(yours, theirs) })),
  );
}

describe('check by check across all your rivals', () => {
  test('every check, in the spec order, with you and each rival', () => {
    const rows = across([
      [SILVERLINE, [score('instagram_activity', 'strong', 20, 20)]],
      [HIGHFIELD, []],
    ]);
    assert.deepEqual(
      rows.map((item) => item.key),
      CHECKS.map((check) => check.key),
    );
    const instagram = row(rows, 'instagram_activity');
    assert.deepEqual(Object.keys(instagram.cells), ['you', 'silverline', 'highfield']);
    assert.equal(instagram.cells.highfield?.summary.kind, 'none', 'not checked for them');
  });

  test('a rival leads when its own comparison says it leads you, the furthest ahead named', () => {
    const rows = across([
      [SILVERLINE, [score('instagram_activity', 'strong', 20, 20)]],
      [HIGHFIELD, [score('instagram_activity', 'okay', 14, 20)]],
      [NORTHBANK, [score('instagram_activity', 'weak', 4, 20)]],
    ]);
    const instagram = row(rows, 'instagram_activity');
    assert.equal(instagram.lead, 'rival');
    assert.deepEqual(instagram.leaders, ['silverline']);
    assert.equal(leadSentence(instagram, SIDES), 'Silverline College leads here.');
  });

  test('two rivals level at the top both lead', () => {
    const rows = across([
      [SILVERLINE, [score('instagram_activity', 'strong', 20, 20)]],
      [HIGHFIELD, [score('instagram_activity', 'strong', 20, 20)]],
    ]);
    const instagram = row(rows, 'instagram_activity');
    assert.deepEqual(instagram.leaders, ['silverline', 'highfield']);
    assert.equal(leadSentence(instagram, SIDES), 'Silverline College and Highfield University lead here.');
  });

  test('ahead of every rival: you lead', () => {
    const rows = across([
      [SILVERLINE, [score('youtube', 'weak', 3, 10)]],
      [HIGHFIELD, [score('youtube', 'missing', 0, 10)]],
    ]);
    const youtube = row(rows, 'youtube');
    assert.equal(youtube.lead, 'you');
    assert.deepEqual(youtube.leaders, []);
    assert.equal(leadSentence(youtube, SIDES), 'You lead every rival here.');
  });

  test('level with one rival and ahead of the rest, or level with all', () => {
    const one = row(
      across([
        [SILVERLINE, [score('youtube', 'strong', 10, 10)]],
        [HIGHFIELD, [score('youtube', 'weak', 3, 10)]],
      ]),
      'youtube',
    );
    assert.equal(one.lead, 'level');
    assert.equal(leadSentence(one, [YOU, SILVERLINE, HIGHFIELD]), 'You are level with Silverline College here.');

    const all = row(
      across([
        [SILVERLINE, [score('youtube', 'strong', 10, 10)]],
        [HIGHFIELD, [score('youtube', 'strong', 10, 10)]],
      ]),
      'youtube',
    );
    assert.equal(all.lead, 'level');
    assert.equal(leadSentence(all, [YOU, SILVERLINE, HIGHFIELD]), 'You are level with Silverline College and Highfield University here.');
  });

  test('your result covers every program compared with any rival, the weakest named', () => {
    const rows = across([
      [SILVERLINE, [score('fees_shown', 'strong', 10, 10, 'BBA')]],
      [HIGHFIELD, [score('fees_shown', 'okay', 6, 10, 'BCA')]],
    ]);
    const fees = row(rows, 'fees_shown');
    assert.deepEqual(fees.programs, ['BBA', 'BCA']);
    assert.equal(fees.cells.you?.parts.length, 2);
    const summary = fees.cells.you?.summary;
    assert.equal(summary?.kind, 'varies');
    if (summary?.kind === 'varies') assert.equal(summary.weakest.programName, 'BCA');
    // Silverline is ahead on BBA, Highfield ahead on BCA: the one further ahead leads.
    assert.equal(fees.lead, 'rival');
    assert.deepEqual(fees.leaders, ['silverline']);
  });

  test('before your own Audit, nothing is compared', () => {
    const rows = checksAcross(YOU, [{ side: SILVERLINE, comparisons: [] }]);
    const instagram = row(rows, 'instagram_activity');
    assert.equal(instagram.lead, 'unknown');
    assert.equal(instagram.cells.you, null);
    assert.equal(instagram.cells.silverline, null);
    assert.equal(leadSentence(instagram, SIDES), 'Not compared yet. It shows once both sides have been checked.');
  });
});
