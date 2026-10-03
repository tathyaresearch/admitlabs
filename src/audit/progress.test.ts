import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { latestByMonth, movedBetween, progressMonths, type StoredResult } from './progress.ts';

const monthOf = (runAt: string) => runAt.slice(0, 7);
const scores = (overall: number, discovered = 50, trusted = 50, chosen = 50) => ({ overall, discovered, trusted, chosen });
const NAMES = new Map([
  ['p-bba', 'BBA'],
  ['p-bca', 'BCA'],
]);

const HISTORY = [
  { id: 'a-apr', runAt: '2026-04-15T04:30:00Z', scores: scores(59, 62, 62, 53) },
  { id: 'a-may', runAt: '2026-05-15T04:30:00Z', scores: scores(61, 62, 66, 55) },
  // An extra refresh in June, then the scheduled Audit: June shows the latest.
  { id: 'a-jun-refresh', runAt: '2026-06-03T04:30:00Z', scores: scores(64) },
  { id: 'a-jun', runAt: '2026-06-15T04:30:00Z', scores: scores(69, 78, 66, 63) },
];

const CHECKS = new Map<string, StoredResult[]>([
  [
    'a-apr',
    [
      { key: 'instagram_activity', programId: null, result: 'weak' },
      { key: 'fees_shown', programId: 'p-bba', result: 'weak' },
      { key: 'fees_shown', programId: 'p-bca', result: 'weak' },
      { key: 'page_speed', programId: null, result: 'okay' },
    ],
  ],
  [
    'a-may',
    [
      { key: 'instagram_activity', programId: null, result: 'okay' },
      { key: 'fees_shown', programId: 'p-bba', result: 'okay' },
      { key: 'fees_shown', programId: 'p-bca', result: 'okay' },
      { key: 'page_speed', programId: null, result: 'weak' },
    ],
  ],
  [
    'a-jun',
    [
      { key: 'instagram_activity', programId: null, result: 'okay' },
      { key: 'fees_shown', programId: 'p-bba', result: 'strong' },
      { key: 'fees_shown', programId: 'p-bca', result: 'okay' },
      { key: 'page_speed', programId: null, result: 'weak' },
      // A program new this month has nothing to compare with.
      { key: 'fees_shown', programId: 'p-mba', result: 'missing' },
    ],
  ],
]);

describe('progress month by month', () => {
  const months = progressMonths({ history: HISTORY, monthOf, checks: CHECKS, names: NAMES, type: 'college', rivals: null });

  test("one row for each month, its latest Audit, oldest first", () => {
    assert.deepEqual(
      months.map((row) => [row.month, row.auditId, row.scores.overall]),
      [
        ['2026-04', 'a-apr', 59],
        ['2026-05', 'a-may', 61],
        ['2026-06', 'a-jun', 69],
      ],
    );
    assert.deepEqual(
      latestByMonth(HISTORY, monthOf).map(({ row }) => row.id),
      ['a-apr', 'a-may', 'a-jun'],
    );
  });

  test('the change since the month before; the first month has none', () => {
    assert.deepEqual(
      months.map((row) => row.change),
      [null, 2, 8],
    );
  });

  test('the checks that moved since the month before, up first, programs that moved together on one line', () => {
    assert.deepEqual(months[0]?.moved, []);
    assert.deepEqual(months[1]?.moved, [
      { key: 'instagram_activity', name: 'Instagram', programs: [], from: 'weak', to: 'okay' },
      { key: 'fees_shown', name: 'Fees shown', programs: ['BBA', 'BCA'], from: 'weak', to: 'okay' },
      { key: 'page_speed', name: 'Page speed', programs: [], from: 'okay', to: 'weak' },
    ]);
    assert.deepEqual(months[2]?.moved, [{ key: 'fees_shown', name: 'Fees shown', programs: ['BBA'], from: 'okay', to: 'strong' }]);
  });

  test("a program's page counts that program's checks and the institution's own", () => {
    const bca = progressMonths({ history: HISTORY, monthOf, checks: CHECKS, names: NAMES, type: 'college', programId: 'p-bca' });
    assert.deepEqual(
      bca[1]?.moved.map((line) => [line.key, line.programs]),
      [
        ['instagram_activity', []],
        ['fees_shown', ['BCA']],
        ['page_speed', []],
      ],
    );
    assert.deepEqual(bca[2]?.moved, []);
    assert.ok(bca.every((row) => row.place === null));
  });

  test('your place among the rivals scored that month, you counted in', () => {
    const rivals = [
      [
        { runAt: '2026-04-01T04:30:00Z', overall: 74 },
        { runAt: '2026-05-01T04:30:00Z', overall: 74 },
        { runAt: '2026-06-01T04:30:00Z', overall: 66 },
      ],
      [
        { runAt: '2026-05-01T04:30:00Z', overall: 52 },
        { runAt: '2026-06-01T04:30:00Z', overall: 52 },
      ],
    ];
    const placed = progressMonths({ history: HISTORY, monthOf, checks: CHECKS, names: NAMES, type: 'college', rivals });
    assert.deepEqual(
      placed.map((row) => row.place),
      [
        { rank: 2, of: 2 },
        { rank: 2, of: 3 },
        { rank: 1, of: 3 },
      ],
    );
    // No rival scored that month: no place.
    assert.equal(progressMonths({ history: HISTORY, monthOf, checks: CHECKS, names: NAMES, type: 'college', rivals: [[]] })[0]?.place, null);
  });

  test('a skilling institute reads its own check names', () => {
    const moved = movedBetween([{ key: 'approvals', programId: null, result: 'missing' }], [{ key: 'approvals', programId: null, result: 'okay' }], NAMES, 'skilling');
    assert.equal(moved[0]?.name, 'Skilling recognition');
  });
});
