import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';
import { lastMonthSummary, openLine, parsePickedIdea, pickThree, pickWhy, stillRising, type Answers, type PickedIdea } from './picks.ts';
import { thisMonthKey, type DemandProgram, type IdeaView } from './signals.ts';
import { lastMonthLine } from './text.ts';

const BBA: DemandProgram = { id: 'p-bba', name: 'BBA', programKey: 'bba' };
const MBA: DemandProgram = { id: 'p-mba', name: 'MBA', programKey: 'mba' };
const BCA: DemandProgram = { id: 'p-bca', name: 'BCA', programKey: 'bca' };

let next = 0;
function idea(program: DemandProgram, title: string, asked: number | null, extra: Partial<IdeaView> = {}): IdeaView {
  next += 1;
  return {
    key: `idea-${next}`,
    month: '2026-09',
    program,
    region: 'Guwahati',
    title,
    text: `${title}, the brief.`,
    hook: '“A hook at {institution}.”',
    points: ['One', 'Two', 'Three'],
    format: 'reel',
    effort: 'easy',
    topic: 'other',
    basedOn: `${title}?`,
    asked,
    askedOn: asked === null ? null : 'question',
    language: 'en',
    trend: null,
    sourceUrl: `https://quora.example/${next}`,
    foundAt: '2026-09-28T00:30:00.000Z',
    platform: 'quora',
    rank: next,
    ...extra,
  };
}

const answers = (entries: Array<[DemandProgram, CheckKey, CheckResult]>): Answers => {
  const map = new Map<string, Map<CheckKey, CheckResult>>();
  for (const [program, check, result] of entries) map.set(program.id, (map.get(program.id) ?? new Map()).set(check, result));
  return map;
};

const IDEAS: IdeaView[] = [
  idea(BBA, 'BBA fees in one image', 140, { topic: 'fees' }),
  idea(BBA, 'BBA placements', 120, { topic: 'placements' }),
  idea(MBA, 'MBA fees with hostel', 96, { topic: 'fees' }),
  idea(MBA, 'MBA without CAT', 72),
  idea(BCA, 'BCA coding day', 40),
];

const pick = (input: Partial<Parameters<typeof pickThree>[0]> = {}) =>
  pickThree({ ideas: IDEAS, answers: null, freeProgramId: null, before: new Set(), institutionName: 'Eastgate University', ...input });

describe('Make these 3 (spec 9.4)', () => {
  test('asked most, one per program while programs last', () => {
    assert.deepEqual(
      pick().map((entry) => [entry.rank, entry.idea.title]),
      [
        [1, 'BBA fees in one image'],
        [2, 'MBA fees with hostel'],
        [3, 'BCA coding day'],
      ],
    );
  });

  test('fewer programs than 3: the next asked most fill in', () => {
    assert.deepEqual(
      pick({ ideas: IDEAS.filter((entry) => entry.program !== BCA) }).map((entry) => entry.idea.title),
      ['BBA fees in one image', 'MBA fees with hostel', 'BBA placements'],
    );
    assert.equal(pick({ ideas: [] }).length, 0);
  });

  test('what the website answers already goes last: a Strong check on its topic', () => {
    const picked = pick({ answers: answers([[BBA, 'fees_shown', 'strong']]) });
    assert.deepEqual(
      picked.map((entry) => entry.idea.title),
      ['BBA placements', 'MBA fees with hostel', 'BCA coding day'],
    );
  });

  test('not one picked last month while there are others, even before what the website answers', () => {
    assert.deepEqual(
      pick({ before: new Set(['BBA fees in one image, the brief.']) }).map((entry) => entry.idea.title),
      ['BBA placements', 'MBA fees with hostel', 'BCA coding day'],
    );
    assert.deepEqual(
      pick({ before: new Set(['BBA fees in one image, the brief.']), answers: answers([[BBA, 'placement_proof', 'strong']]) }).map((entry) => entry.idea.title),
      ['MBA fees with hostel', 'BCA coding day', 'BBA placements'],
    );
  });

  test('on Free the first is for its Free program, the one Free sees', () => {
    const picked = pick({ freeProgramId: MBA.id });
    assert.equal(picked[0]?.idea.title, 'MBA fees with hostel');
    assert.equal(picked[0]?.programId, MBA.id);
    assert.deepEqual(
      picked.map((entry) => entry.idea.programName),
      ['MBA', 'BBA', 'BCA'],
    );
  });

  test('kept as picked: the institution’s name in place, the brief as found, and what the next month compares with', () => {
    const [first] = pick({ ideas: [idea(BBA, 'BBA at {institution}', 58, { trend: { text: 'BBA in Business Analytics', word: 'Rising' }, points: ['Fees at {institution}'] })] });
    assert.equal(first?.idea.title, 'BBA at Eastgate University');
    assert.equal(first?.idea.hook, '“A hook at Eastgate University.”');
    assert.deepEqual(first?.idea.points, ['Fees at Eastgate University']);
    assert.equal(first?.idea.text, 'BBA at {institution}, the brief.');
    assert.equal(first?.idea.asked, 58);
    assert.equal(first?.idea.trend, 'BBA in Business Analytics');
    assert.equal(first?.idea.trendWord, 'Rising');
    assert.deepEqual(parsePickedIdea(JSON.parse(JSON.stringify(first?.idea))), first?.idea);
    assert.equal(parsePickedIdea({ title: 'No program' }), null);
  });
});

describe('why each one', () => {
  test('how often it was asked, and what the website does not answer yet', () => {
    const [fees, placements, , , coding] = IDEAS;
    assert.ok(fees && placements && coding);
    const open = answers([
      [BBA, 'fees_shown', 'okay'],
      [BBA, 'placement_proof', 'missing'],
    ]);
    assert.equal(pickWhy(fees, open), 'Asked about 140 times in Guwahati this month. Your website does not show the BBA fee clearly yet.');
    assert.equal(pickWhy(placements, open), 'Asked about 120 times in Guwahati this month. Your website does not show BBA placements with proof yet.');
    // No check for the topic, or no Audit yet: how often it was asked, then the search behind it when rising.
    assert.equal(pickWhy(coding, null), 'Asked about 40 times in Guwahati this month.');
    assert.equal(
      pickWhy({ ...coding, trend: { text: 'BCA with AI', word: 'Rising fast' } }, null),
      'Asked about 40 times in Guwahati this month. Searches for “BCA with AI” are rising fast in Guwahati.',
    );
    assert.equal(openLine('youtube', 'BBA'), null);
  });

  test('no dashes', () => {
    for (const entry of pick({ answers: answers([[BBA, 'fees_shown', 'weak']]) })) assert.equal(hasDashes(entry.idea.why), false, entry.idea.why);
  });
});

describe('after the next update: “You made 2 of 3”', () => {
  const picked = pick().map((entry) => entry.idea);
  const [fees, mbaFees, coding] = picked as [PickedIdea, PickedIdea, PickedIdea];
  const now = {
    questions: new Map([
      [thisMonthKey('mba', mbaFees.basedOn ?? ''), 120],
      [thisMonthKey('bca', coding.basedOn ?? ''), 30],
    ]),
    // A topic sharing the question's words is never compared with the question's count.
    topics: new Map([[thisMonthKey('bca', coding.basedOn ?? ''), 500]]),
    rising: new Map(),
  };

  test('still rising: asked more than when picked, or its search still rising', () => {
    assert.equal(stillRising(mbaFees, now), '“MBA fees with hostel?” (MBA)');
    assert.equal(stillRising(coding, now), null, 'asked less than when picked');
    const trend = { ...coding, trend: 'BCA with AI' };
    assert.equal(stillRising(trend, { questions: new Map(), topics: new Map(), rising: new Map([[thisMonthKey('bca', 'BCA with AI'), 'Rising fast' as const]]) }), '“BCA with AI” (BCA)');
    assert.equal(stillRising(trend, { questions: new Map(), topics: new Map(), rising: new Map([[thisMonthKey('bca', 'BCA with AI'), 'Steady' as const]]) }), null);
    // Picked on a whole topic: compared with the topic's count.
    assert.equal(stillRising({ ...coding, askedOn: 'topic' }, now), '“BCA coding day?” (BCA)');
  });

  test('how many were made, and which of the others are still rising', () => {
    const summary = lastMonthSummary(picked, (entry) => entry === fees, now);
    assert.deepEqual(summary, { made: 1, total: 3, stillRising: ['“MBA fees with hostel?” (MBA)'] });
    assert.equal(lastMonthLine('2026-08', summary.made, summary.total, summary.stillRising), 'In August you made 1 of 3. This one is still rising: “MBA fees with hostel?” (MBA).');
    assert.equal(lastMonthLine('2026-08', 3, 3, []), 'In August you made all 3.');
    assert.equal(lastMonthLine('2026-08', 0, 3, ['“A” (BBA)', '“B” (MBA)']), 'August’s 3 are still waiting to be made. These are still rising: “A” (BBA) and “B” (MBA).');
    assert.equal(lastMonthLine('2026-08', 2, 3, []), 'In August you made 2 of 3.');
  });
});
