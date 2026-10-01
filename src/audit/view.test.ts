import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate, monthKey } from '../domain/dates.ts';
import { itemPoints, rankFixes } from '../domain/scoring/rank.ts';
import { recordFor, stored } from './testing.ts';
import {
  fixAdvice,
  historyByMonth,
  monthScore,
  overviewView,
  panelLines,
  pillarChecks,
  pointsEarnedText,
  pointsFraction,
  pointsToGainText,
  programView,
  rowSummary,
  scoresByMonth,
  type ItemPart,
} from './view.ts';

// The Audit screens' view model, from records built on sample data.

describe('the all-programs view', () => {
  test('Northbank on Free: the top 3 each way, with their details; the rest results only', async () => {
    const { record, names, type } = await recordFor('northbank-college', '2026-09-10', ['bba']);
    const view = overviewView(stored(record, { freeDetails: true }), { institutionType: type, programNames: names });
    assert.equal(view.scores.overall, 46);
    assert.equal(view.label, 'Needs work');
    assert.deepEqual(view.working.slice(0, 3).map((item) => item.name), ['Google search', 'Instagram', 'Review rating']);
    assert.deepEqual(view.fixes.slice(0, 3).map((item) => [item.name, pointsToGainText(item.points)]), [
      ['Placement proof', 'Could add up to 7 points'],
      ['Fees shown', 'Could add up to 6 points'],
      ['Google profile', 'Could add up to 5 points'],
    ]);
    assert.ok(view.fixes.slice(0, 3).every((item) => item.parts.every((part) => part.detail !== null) && item.difficulty !== null));
    // Beyond the top 3 fixes, details stay hidden, except for checks already open as a top 3 strength.
    const topStrengths = new Set(view.working.slice(0, 3).map((item) => item.key));
    for (const item of view.fixes.slice(3)) {
      const open = item.parts.every((part) => part.detail !== null);
      assert.equal(open, topStrengths.has(item.key), item.name);
    }
    assert.equal(view.fixes.length, 17);
    assert.equal(view.firstAudit, true);
  });

  test('Eastgate on Paid: grouped fixes across 5 programs, with the same points as the engine', async () => {
    const { record, evaluation, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const view = overviewView(stored(record), { institutionType: type, programNames: names });
    assert.equal(view.scores.overall, 73);
    assert.equal(view.fixes.length, evaluation.fixes.length);
    view.fixes.forEach((item, index) => {
      const engine = evaluation.fixes[index];
      assert.equal(item.key, engine?.key);
      assert.equal(item.parts.length, engine?.outcomes.length);
      assert.ok(Math.abs(item.points - itemPoints(engine as never, 5)) < 1e-9, item.name);
    });
    const grouped = view.fixes.find((item) => item.parts.length > 1);
    assert.ok(grouped && grouped.parts.every((part) => part.programName));
  });

  test('area by area: 17 checks in 3 pillars; program checks show each program', async () => {
    const { record, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const view = overviewView(stored(record), { institutionType: type, programNames: names });
    assert.deepEqual(view.areas.map((area) => [area.pillar, area.rows.length]), [
      ['discovered', 6],
      ['trusted', 5],
      ['chosen', 6],
    ]);
    const search = view.areas[0]?.rows.find((row) => row.key === 'google_search');
    assert.equal(search?.parts.length, 5);
    assert.deepEqual(search?.parts.map((part) => part.programName), ['B.Sc Data Analytics', 'B.Sc Nursing', 'BBA', 'BCA', 'MBA']);
    assert.equal(view.areas[0]?.rows.find((row) => row.key === 'instagram_activity')?.parts.length, 1);
  });

  test('one line per check: a single result, or "varies by program" with the average points', async () => {
    const { record, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const view = overviewView(stored(record), { institutionType: type, programNames: names });
    const rows = view.areas.flatMap((area) => area.rows);
    const instagram = rows.find((row) => row.key === 'instagram_activity');
    assert.deepEqual(instagram?.summary, { kind: 'single', result: 'strong', points: 25, maxPoints: 25 });
    const search = rows.find((row) => row.key === 'google_search');
    assert.equal(search?.summary.kind, 'varies');
    const average = (search?.parts ?? []).reduce((sum, part) => sum + part.points, 0) / 5;
    assert.ok(search?.summary.kind === 'varies' && Math.abs(search.summary.points - average) < 1e-9);
    assert.deepEqual(rowSummary([]), { kind: 'none' });

    const { record: free, names: freeNames } = await recordFor('northbank-college', '2026-09-10', ['bba']);
    const freeView = overviewView(stored(free, { freeDetails: true }), { institutionType: 'college', programNames: freeNames });
    assert.ok(freeView.areas.flatMap((area) => area.rows).every((row) => row.summary.kind === 'single'), 'one program never varies');
  });

  test('change flags: a first Audit, and programs that changed', async () => {
    const { record, names, type } = await recordFor('northbank-college', '2026-09-10', ['bba']);
    const changed = overviewView(stored(record, { previousAuditId: 'earlier' }), { institutionType: type, programNames: names });
    assert.deepEqual([changed.firstAudit, changed.programsChanged], [false, true]);
  });
});

describe('the one-program view', () => {
  test('Eastgate MBA: its own score, its checks plus shared ones, ranked for that program', async () => {
    const { record, evaluation, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const mba = [...names.entries()].find(([, name]) => name === 'MBA')?.[0] as string;
    const view = programView(stored(record), mba, { institutionType: type, programNames: names });
    assert.ok(view);
    const engineRow = evaluation.programs.find((program) => program.programId === mba);
    assert.equal(view.scores.overall, engineRow?.overall);
    assert.equal(view.areas.flatMap((area) => area.rows).reduce((sum, row) => sum + row.parts.length, 0), 17);
    const own = evaluation.outcomes.filter((outcome) => outcome.programId === null || outcome.programId === mba);
    const expected = rankFixes(own, 1, () => 'medium').map((item) => item.key);
    assert.equal(view.fixes.length, expected.length);
    assert.ok(view.fixes.every((item) => item.points > 0));
    assert.equal(programView(stored(record), 'not-a-program', { institutionType: type, programNames: names }), null);
  });
});

describe('each pillar at a glance', () => {
  test('Eastgate: one result per check (its weakest program), how many are Strong, and the weakest', async () => {
    const { record, names, type } = await recordFor('eastgate-university', '2026-09-15');
    const pillars = pillarChecks(overviewView(stored(record), { institutionType: type, programNames: names }));
    assert.deepEqual(
      pillars.map((pillar) => [pillar.pillar, pillar.checks.length, pillar.strong, pillar.weakest?.name, pillar.weakest?.result]),
      [
        ['discovered', 6, 2, 'AI answers', 'missing'],
        ['trusted', 5, 1, 'Placement proof', 'missing'],
        ['chosen', 6, 1, 'Admission steps', 'weak'],
      ],
    );
    // Google search is Strong for two programs and Weak for one: the check counts as Weak.
    assert.equal(pillars[0]?.checks.find((check) => check.key === 'google_search')?.result, 'weak');
  });

  test('a tie on the result goes to the check that could add the most', async () => {
    const { record, names, type } = await recordFor('northbank-college', '2026-09-10', ['bba']);
    const view = overviewView(stored(record, { freeDetails: true }), { institutionType: type, programNames: names });
    const trusted = pillarChecks(view).find((pillar) => pillar.pillar === 'trusted');
    // Three Trusted checks are Weak; placement proof could add the most of them.
    assert.equal(trusted?.checks.filter((check) => check.result === 'weak').length, 3);
    assert.equal(trusted?.weakest?.key, 'placement_proof');
    assert.equal(trusted?.strong, 0);
  });

  test('every check Strong: no weakest', () => {
    const row = (key: 'google_search' | 'youtube') => ({
      key,
      name: key,
      looksAt: '',
      pillar: 'discovered' as const,
      level: 'institution' as const,
      parts: [{ result: 'strong' as const }] as unknown as ItemPart[],
      summary: { kind: 'none' as const },
    });
    const [discovered] = pillarChecks({ areas: [{ pillar: 'discovered', rows: [row('google_search'), row('youtube')] }], fixes: [] });
    assert.equal(discovered?.strong, 2);
    assert.equal(discovered?.weakest, null);
  });
});

describe('history and wording', () => {
  test('all four scores by month: the latest Audit that month', () => {
    const scores = (overall: number) => ({ overall, discovered: overall + 1, trusted: overall - 1, chosen: overall });
    assert.deepEqual(
      scoresByMonth(
        [
          { runAt: istDate('2026-09-15', 10).toISOString(), scores: scores(70) },
          { runAt: istDate('2026-08-15', 10).toISOString(), scores: scores(66) },
          { runAt: istDate('2026-09-20', 10).toISOString(), scores: scores(73) },
        ],
        (runAt) => monthKey(new Date(runAt)),
      ),
      [
        { month: '2026-08', scores: scores(66) },
        { month: '2026-09', scores: scores(73) },
      ],
    );
  });

  test('one point per month: the latest Audit that month', () => {
    const points = historyByMonth(
      [
        { runAt: istDate('2026-09-15', 10).toISOString(), scores: { overall: 70 } },
        { runAt: istDate('2026-08-15', 10).toISOString(), scores: { overall: 66 } },
        { runAt: istDate('2026-09-20', 10).toISOString(), scores: { overall: 73 } },
      ],
      (runAt) => monthKey(new Date(runAt)),
    );
    assert.deepEqual(points, [
      { month: '2026-08', score: 66 },
      { month: '2026-09', score: 73 },
    ]);
  });

  test('a report month shows the latest score up to that month and the change since the month before', () => {
    const points = [
      { month: '2026-06', score: 58 },
      { month: '2026-08', score: 61 },
      { month: '2026-09', score: 64 },
    ];
    assert.deepEqual(monthScore(points, '2026-09'), { score: 64, change: 3, since: '2026-08' });
    // No Audit in July: the July report shows June's score, with nothing before it to compare.
    assert.deepEqual(monthScore(points, '2026-07'), { score: 58, change: null, since: null });
    assert.deepEqual(monthScore(points, '2026-08'), { score: 61, change: 3, since: '2026-06' });
    assert.equal(monthScore(points, '2026-05'), null);
    assert.equal(monthScore([], '2026-09'), null);
  });

  test('points wording: whole numbers on screen, halves round up', () => {
    assert.equal(pointsToGainText(0.3), 'Could add less than 1 point');
    assert.equal(pointsToGainText(0.5), 'Could add up to 1 point');
    assert.equal(pointsToGainText(5.83), 'Could add up to 6 points');
    assert.equal(pointsEarnedText(7.5, 25), '8 of 25 points');
    assert.equal(pointsEarnedText(18, 30), '18 of 30 points');
    assert.equal(pointsFraction(7.5, 25), '8/25');
    assert.equal(pointsFraction(4.5, 15), '5/15');
    assert.equal(pointsFraction(15.83, 25), '16/25');
  });
});

describe('the check panel', () => {
  const part = (programName: string | null, result: ItemPart['result'], points: number, extra: Partial<ItemPart> = {}): ItemPart => ({
    checkId: `${programName ?? 'all'}-${result}`,
    programId: programName,
    programName,
    result,
    previousResult: null,
    points,
    maxPoints: 30,
    checkedAt: '2026-09-01T04:30:00Z',
    detail: null,
    ...extra,
  });

  test('one line per program; Strong programs share one line, after the rest', () => {
    const lines = panelLines([part('BBA', 'strong', 30), part('MBA', 'weak', 9), part('BCA', 'strong', 30)]);
    assert.deepEqual(
      lines.map((line) => [line.programs, line.result, line.points]),
      [
        [['MBA'], 'weak', 9],
        [['BBA', 'BCA'], 'strong', 30],
      ],
    );
  });

  test('a Strong program that moved keeps its own line, with what it was', () => {
    const lines = panelLines([part('BBA', 'strong', 30, { previousResult: 'okay' }), part('BCA', 'strong', 30)]);
    assert.deepEqual(
      lines.map((line) => [line.programs, line.previousResult]),
      [
        [['BBA'], 'okay'],
        [['BCA'], null],
      ],
    );
  });

  test('a check on the whole institution is one line with no program', () => {
    assert.deepEqual(panelLines([part(null, 'okay', 15)]).map((line) => [line.programs, line.result]), [[[], 'okay']]);
  });

  test('how to fix is said once when every program needs the same', () => {
    const detail = (howToFix: string | null, difficulty: 'easy' | 'medium' | 'hard' | null) => ({ finding: 'Found', whyItMatters: null, howToFix, difficulty, sourceUrl: 'https://example.edu' });
    assert.deepEqual(fixAdvice([part('BBA', 'weak', 9, { detail: detail('Add the fees.', 'easy') }), part('MBA', 'weak', 9, { detail: detail('Add the fees.', 'medium') })]), [
      { text: 'Add the fees.', programs: [], difficulty: 'medium' },
    ]);
    assert.deepEqual(
      fixAdvice([
        part('BBA', 'weak', 9, { detail: detail('Add the BBA fees.', 'easy') }),
        part('MBA', 'okay', 20, { detail: detail('Add the MBA placements.', 'hard') }),
        part('BCA', 'strong', 30, { detail: detail(null, null) }),
      ]),
      [
        { text: 'Add the BBA fees.', programs: ['BBA'], difficulty: 'easy' },
        { text: 'Add the MBA placements.', programs: ['MBA'], difficulty: 'hard' },
      ],
    );
    assert.deepEqual(fixAdvice([part('BBA', 'strong', 30)]), []);
  });
});
