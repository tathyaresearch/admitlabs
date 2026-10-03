import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ItemPart, ListItem } from '../audit/view.ts';
import type { DemandRow, IdeaRow } from '../demand/view.ts';
import { hasDashes } from '../domain/copy.ts';
import type { CheckKey, CheckResult } from '../domain/types.ts';
import { byPoints, threeThings, type RivalLesson, type ThingsInput } from './things.ts';

function part(programName: string | null, result: CheckResult, points: number, maxPoints: number, howToFix = `Fix it for ${programName ?? 'everyone'}.`): ItemPart {
  return {
    checkId: `${programName}-${result}`,
    programId: programName,
    programName,
    result,
    previousResult: null,
    points,
    maxPoints,
    checkedAt: '2026-09-15T04:30:00.000Z',
    detail: { finding: 'Found.', whyItMatters: 'It matters.', howToFix, fixSteps: [howToFix], difficulty: 'medium', sourceUrl: 'https://site.example/page' },
  };
}

function fix(rank: number, key: CheckKey, points: number, parts: ItemPart[]): ListItem {
  return { rank, key, name: key, pillar: 'chosen', parts, strength: null, difficulty: 'medium', points };
}

function idea(text: string, question: Partial<DemandRow> | null = { text: 'What is the fee?', count: 72, language: 'en' }): IdeaRow {
  return {
    key: text,
    text,
    programName: 'BBA',
    month: '2026-09',
    format: 'post',
    effort: 'easy',
    question: question ? ({ id: 'q', programKey: 'bba', programName: 'BBA', month: '2026-09', kind: 'question', rank: 1, changePct: null, sourceUrl: 'https://quora.example/q', foundAt: '', meta: {}, text: '', count: 0, language: 'en', ...question } as DemandRow) : null,
    sourceUrl: 'https://quora.example/q',
  };
}

const FIXES: ListItem[] = [
  fix(1, 'fees_shown', 7.4, [part('BBA', 'missing', 0, 20, 'Put the full BBA fee on the BBA page.'), part('MBA', 'okay', 12, 20, 'Add the MBA hostel fee.')]),
  fix(2, 'review_rating', 3.2, [part(null, 'okay', 10, 15, 'Reply to every review.')]),
  fix(3, 'youtube', 1.1, [part(null, 'weak', 3, 10, 'Post one video a month.')]),
];

const LESSONS: RivalLesson[] = [
  { text: 'Show your full BBA fees', detail: 'Highfield University is ahead of you here.', checkKey: 'fees_shown', rivalId: 'highfield', effort: null, month: '2026-09' },
  { text: "Learn from Silverline College's top post", detail: 'It reached 48,200 views.', checkKey: null, rivalId: 'silverline', effort: 'medium', month: '2026-09' },
  { text: 'Reply to every Google review', detail: 'Northbank College is ahead of you here.', checkKey: 'review_rating', rivalId: 'northbank', effort: null, month: '2026-09' },
];

const IDEAS: IdeaRow[] = [idea('Post one clear BBA fee breakdown in a single image.'), idea('Show last year’s BBA placements.')];

const base: ThingsInput = { institutionType: 'college', place: 'Guwahati', fixes: FIXES, lessons: LESSONS, ideas: IDEAS };

describe('3 things to do this month', () => {
  test('the biggest Audit fix, the top Rivals lesson on another check, and the top content idea', () => {
    const things = threeThings(base);
    assert.deepEqual(
      things.map((thing) => [thing.source, thing.title]),
      [
        ['audit', 'Show your full BBA and MBA fees'],
        ['rivals', "Learn from Silverline College's top post"],
        ['demand', 'Post one clear BBA fee breakdown in a single image.'],
      ],
    );
    // The first lesson was about fees too, so it is skipped rather than said twice.
    assert.equal(things[1]?.rivalId, 'silverline');
  });

  test('the fix says what it could add, with the advice for the program that has the most to gain', () => {
    const [first] = threeThings(base);
    assert.equal(first?.detail, 'Could add up to 7 points. Put the full BBA fee on the BBA page.');
    assert.equal(first?.checkKey, 'fees_shown');
  });

  test('the idea names the question it answers, how often it was asked and where', () => {
    const things = threeThings({ ...base, ideas: [idea('Answer the fee question.', { text: 'What is the total fee for BBA?', count: 84, language: 'hi' })] });
    assert.equal(things[2]?.detail, 'Built on a question asked about 84 times in Guwahati, in Hindi: “What is the total fee for BBA?”');
    assert.equal(threeThings({ ...base, ideas: [idea('Film a class.', null)] })[2]?.detail, 'For students of BBA.');
  });

  test('with no rivals or no Demand yet, the next fix fills in', () => {
    assert.deepEqual(
      threeThings({ ...base, lessons: [] }).map((thing) => [thing.source, thing.checkKey]),
      [
        ['audit', 'fees_shown'],
        ['audit', 'review_rating'],
        ['demand', null],
      ],
    );
    assert.deepEqual(
      threeThings({ ...base, ideas: [] }).map((thing) => [thing.source, thing.title]),
      [
        ['audit', 'Show your full BBA and MBA fees'],
        ['audit', 'Reply to every Google review'],
        ['rivals', "Learn from Silverline College's top post"],
      ],
    );
  });

  test('never two things about the same check, even when that leaves fewer than three', () => {
    const things = threeThings({ ...base, fixes: FIXES.slice(0, 1), lessons: [LESSONS[0] as RivalLesson, LESSONS[2] as RivalLesson], ideas: [] });
    assert.deepEqual(
      things.map((thing) => [thing.source, thing.checkKey]),
      [
        ['audit', 'fees_shown'],
        ['rivals', 'review_rating'],
      ],
    );
  });

  test('every check Strong: the lessons and ideas carry the list, still in order of where they come from', () => {
    const things = threeThings({ ...base, fixes: [] });
    assert.deepEqual(
      things.map((thing) => thing.source),
      ['rivals', 'rivals', 'demand'],
    );
    assert.equal(things[0]?.title, 'Show your full BBA fees');
  });

  test('nothing to go on yet: an empty list, never made up', () => {
    assert.deepEqual(threeThings({ ...base, fixes: [], lessons: [], ideas: [] }), []);
  });

  test('more than three programs read as "your programs", and program checks without names still read well', () => {
    const many = fix(1, 'google_search', 5, ['BBA', 'BCA', 'MBA', 'B.Com'].map((name) => part(name, 'weak', 5, 25)));
    assert.equal(threeThings({ ...base, fixes: [many] })[0]?.title, 'Get found when students search for your programs');
    const three = fix(1, 'program_page', 5, ['BBA', 'BCA', 'MBA'].map((name) => part(name, 'weak', 5, 15)));
    assert.equal(threeThings({ ...base, fixes: [three] })[0]?.title, 'Give BBA, BCA and MBA each a page of its own');
  });

  test('each thing carries what Home shows beside it', () => {
    const [fixed, lesson, made] = threeThings(base);
    assert.deepEqual(
      [fixed?.points, fixed?.effort, fixed?.programs, fixed?.month],
      [7.4, 'medium', ['BBA', 'MBA'], null],
    );
    // A lesson about a post has no points; its effort comes from the analysis provider.
    assert.deepEqual(
      [lesson?.points, lesson?.effort, lesson?.programs, lesson?.month],
      [null, 'medium', [], '2026-09'],
    );
    assert.deepEqual(
      [made?.points, made?.effort, made?.format, made?.question, made?.programs, made?.month],
      [null, 'easy', 'post', { text: 'What is the fee?', count: 72, language: 'en' }, ['BBA'], '2026-09'],
    );
  });

  test('a lesson about a check carries the points and the effort of that check’s fix', () => {
    const things = threeThings({ ...base, fixes: [FIXES[1] as ListItem], lessons: [LESSONS[0] as RivalLesson], ideas: [] });
    const lesson = things.find((thing) => thing.source === 'rivals');
    assert.deepEqual(
      [lesson?.checkKey, lesson?.points, lesson?.effort],
      ['fees_shown', null, null],
    );
    const fees = threeThings({ ...base, fixes: [FIXES[1] as ListItem, FIXES[2] as ListItem, FIXES[0] as ListItem], lessons: [LESSONS[0] as RivalLesson], ideas: [] });
    assert.deepEqual(
      fees.map((thing) => [thing.source, thing.checkKey, thing.points, thing.effort, thing.programs]),
      [
        ['audit', 'review_rating', 3.2, 'medium', []],
        ['audit', 'youtube', 1.1, 'medium', []],
        ['rivals', 'fees_shown', 7.4, 'medium', ['BBA', 'MBA']],
      ],
    );
  });

  test('a fix title fits what was found: no reviews yet means getting the first ones', () => {
    const none = fix(1, 'review_rating', 8.3, [part(null, 'missing', 0, 25, 'Ask your happy students for a review.')]);
    assert.equal(threeThings({ ...base, fixes: [none], lessons: [], ideas: [] })[0]?.title, 'Get your first Google reviews');
  });

  test("Home's order: by the points each could add, the ones without points after, in their place", () => {
    const order = byPoints([
      { name: 'idea', points: null },
      { name: 'small fix', points: 1.2 },
      { name: 'lesson', points: null },
      { name: 'big fix', points: 7.4 },
    ]);
    assert.deepEqual(
      order.map((thing) => thing.name),
      ['big fix', 'small fix', 'idea', 'lesson'],
    );
  });

  test('plain words only: no dashes anywhere', () => {
    for (const thing of threeThings(base)) {
      assert.equal(hasDashes(thing.title), false, thing.title);
      assert.equal(hasDashes(thing.detail), false, thing.detail);
    }
  });
});
