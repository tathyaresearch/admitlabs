import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getCheck } from '../domain/checks.ts';
import { CHECKS } from '../domain/checks.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';
import { byStanding, compareChecks, ladder, pillarLeads, standingOf, whereTheyLead, whereYouLead, type CheckScore } from './compare.ts';

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

const find = (items: ReturnType<typeof compareChecks>, key: CheckKey) => {
  const item = items.find((candidate) => candidate.key === key);
  assert.ok(item, `no comparison for ${key}`);
  return item;
};

describe('ahead or behind, overall only', () => {
  test('from your side: a rival with a higher score is ahead of you', () => {
    assert.equal(standingOf(73, 74), 'ahead');
    assert.equal(standingOf(73, 51), 'behind');
    assert.equal(standingOf(60, 60), 'level');
  });

  test('without both scores there is no standing yet', () => {
    assert.equal(standingOf(null, 74), 'unscored');
    assert.equal(standingOf(73, null), 'unscored');
  });

  test('Free groups keep names in order, so the order never hints at a score', () => {
    const groups = byStanding([
      { name: 'Silverline College', standing: 'ahead' as const },
      { name: 'Eastgate University', standing: 'ahead' as const },
      { name: 'Highfield University', standing: 'behind' as const },
      { name: 'Loomcraft Skills Institute', standing: 'unscored' as const },
    ]);
    assert.deepEqual(
      groups.ahead.map((rival) => rival.name),
      ['Eastgate University', 'Silverline College'],
    );
    assert.deepEqual(
      groups.behind.map((rival) => rival.name),
      ['Highfield University'],
    );
    assert.equal(groups.level.length, 0);
    assert.equal(groups.unscored.length, 1);
  });
});

describe('the ladder', () => {
  const you = { id: 'you', name: 'Eastgate University', overall: 73, change: 0 };

  test('highest score first, with ranks', () => {
    const rows = ladder(you, [
      { id: 'h', name: 'Highfield University', overall: 51, change: -1 },
      { id: 's', name: 'Silverline College', overall: 74, change: 0 },
      { id: 'n', name: 'Northbank College', overall: 46, change: 1 },
    ]);
    assert.deepEqual(
      rows.map((row) => [row.id, row.rank]),
      [
        ['s', 1],
        ['you', 2],
        ['h', 3],
        ['n', 4],
      ],
    );
    assert.equal(rows.find((row) => row.you)?.id, 'you');
  });

  test('equal scores share a rank and you sit first among them', () => {
    const rows = ladder(you, [
      { id: 'a', name: 'Alpha College', overall: 73, change: null },
      { id: 'b', name: 'Beta College', overall: 80, change: null },
    ]);
    assert.deepEqual(
      rows.map((row) => [row.id, row.rank]),
      [
        ['b', 1],
        ['you', 2],
        ['a', 2],
      ],
    );
  });

  test('rivals not scored yet go last, without a rank', () => {
    const rows = ladder(you, [
      { id: 'new', name: 'New Rival', overall: null, change: null },
      { id: 'h', name: 'Highfield University', overall: 51, change: null },
    ]);
    assert.deepEqual(
      rows.map((row) => [row.id, row.rank]),
      [
        ['you', 1],
        ['h', 2],
        ['new', null],
      ],
    );
  });
});

describe('check by check', () => {
  test('every one of the 17 checks is compared, in the spec order', () => {
    const items = compareChecks([], []);
    assert.deepEqual(
      items.map((item) => item.key),
      CHECKS.map((check) => check.key),
    );
    assert.ok(items.every((item) => item.lead === 'unknown' && item.gap === 0));
  });

  test('an institution check: who leads, and the points you could add by matching them', () => {
    const items = compareChecks([score('page_speed', 'weak', 3, 10)], [score('page_speed', 'strong', 10, 10)]);
    const speed = find(items, 'page_speed');
    assert.equal(speed.lead, 'them');
    assert.equal(Math.round(speed.gap * 100) / 100, 7);
    assert.deepEqual(speed.them, { kind: 'single', result: 'strong', share: 1 });
    assert.deepEqual(speed.programs, []);
  });

  test('you lead when your share is higher, and equal results are level', () => {
    const items = compareChecks(
      [score('google_profile', 'strong', 20, 20), score('easy_enquiry', 'okay', 12, 20)],
      [score('google_profile', 'okay', 12, 20), score('easy_enquiry', 'okay', 12, 20)],
    );
    assert.equal(find(items, 'google_profile').lead, 'you');
    assert.ok(find(items, 'google_profile').gap < 0);
    assert.equal(find(items, 'easy_enquiry').lead, 'level');
  });

  test('a college and a skilling institute compare on shares, since their weights differ', () => {
    // Google profile is worth 20 for a college and 30 for a skilling institute. Both Strong: level.
    const items = compareChecks([score('google_profile', 'strong', 20, 20)], [score('google_profile', 'strong', 30, 30)]);
    assert.equal(find(items, 'google_profile').lead, 'level');
  });

  test('program checks compare only the programs both sides offer', () => {
    const items = compareChecks(
      [score('fees_shown', 'weak', 7.5, 25, 'BBA'), score('fees_shown', 'strong', 25, 25, 'MBA')],
      [score('fees_shown', 'strong', 25, 25, 'BBA'), score('fees_shown', 'missing', 0, 25, 'B.Com')],
    );
    const fees = find(items, 'fees_shown');
    assert.equal(fees.lead, 'them');
    assert.deepEqual(fees.programs, ['BBA']);
    assert.equal(fees.yourParts.length, 1);
    assert.equal(fees.theirParts.length, 1);
    assert.equal(Math.round(fees.gap * 100) / 100, 17.5);
  });

  test('with no program in common, all of each side count, and mixed results vary', () => {
    const items = compareChecks(
      [score('program_page', 'strong', 20, 20, 'MBA'), score('program_page', 'weak', 6, 20, 'BCA')],
      [score('program_page', 'okay', 12, 20, 'Hotel Management')],
    );
    const page = find(items, 'program_page');
    assert.equal(page.you.kind, 'varies');
    // The weakest program speaks for a side whose programs differ.
    assert.deepEqual(page.you.kind === 'varies' ? page.you.weakest : null, { result: 'weak', share: 0.3, programName: 'BCA' });
    assert.deepEqual(page.programs, ['BCA', 'MBA']);
    // Yours average 0.65 of the points, theirs 0.6.
    assert.equal(page.lead, 'you');
  });

  test('a check missing on one side is not compared', () => {
    const items = compareChecks([score('youtube', 'okay', 6, 10)], []);
    assert.equal(find(items, 'youtube').lead, 'unknown');
    assert.equal(find(items, 'youtube').them.kind, 'none');
  });

  test('where they lead and where you lead, biggest gap first', () => {
    const items = compareChecks(
      [score('page_speed', 'weak', 3, 10), score('fees_shown', 'weak', 7.5, 25, 'BBA'), score('google_profile', 'strong', 20, 20), score('youtube', 'strong', 10, 10)],
      [score('page_speed', 'okay', 6, 10), score('fees_shown', 'strong', 25, 25, 'BBA'), score('google_profile', 'weak', 6, 20), score('youtube', 'okay', 6, 10)],
    );
    assert.deepEqual(
      whereTheyLead(items).map((item) => item.key),
      ['fees_shown', 'page_speed'],
    );
    assert.deepEqual(
      whereYouLead(items).map((item) => item.key),
      ['google_profile', 'youtube'],
    );
  });
});

describe('pillar by pillar', () => {
  test('Eastgate against Silverline', () => {
    assert.deepEqual(pillarLeads({ overall: 73, discovered: 79, trusted: 69, chosen: 70 }, { overall: 74, discovered: 73, trusted: 72, chosen: 76 }), {
      discovered: 'you',
      trusted: 'them',
      chosen: 'them',
    });
  });
});
