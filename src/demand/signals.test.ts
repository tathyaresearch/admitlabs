import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { DemandKind, Language } from '../domain/types.ts';
import { hasTooLittle } from './items.ts';
import { demandSignals, ideaWhy, offeredBy, programSources, thisMonth, thisMonthKey, type DemandProgram, type PullFacts, type RegionRows } from './signals.ts';
import type { DemandRow } from './view.ts';

let next = 0;
function row(programKey: string, kind: DemandKind, text: string, extra: Partial<DemandRow> = {}): DemandRow {
  next += 1;
  return {
    id: `row-${next}`,
    programKey,
    programName: programKey,
    month: '2026-09',
    kind,
    text,
    language: 'en' as Language,
    count: null,
    changePct: null,
    rank: null,
    sourceUrl: `https://reddit.example/${next}`,
    foundAt: '2026-09-28T00:30:00.000Z',
    meta: {},
    ...extra,
  };
}

const BBA: DemandProgram = { id: 'p-bba', name: 'BBA', programKey: 'bba' };
const MBA: DemandProgram = { id: 'p-mba', name: 'MBA', programKey: 'mba' };
const pull = (tooLittle = false): PullFacts => ({ month: '2026-09', pulledAt: '2026-09-28T00:30:00.000Z', tooLittle });

const CITY_ROWS: DemandRow[] = [
  row('bba', 'rising', 'BBA in Business Analytics', { changePct: 38, count: 1300, meta: { platform: 'trends', countKind: 'searches', countSource: 'https://keywords.example/a', course: true } }),
  row('bba', 'rising', 'Integrated BBA and MBA', { changePct: 14, meta: { platform: 'trends', course: true } }),
  row('bba', 'rising', 'Weekend BBA options', { changePct: 8, meta: { platform: 'trends' } }),
  row('bba', 'falling', 'General BBA with no specialisation', { changePct: -12, meta: { platform: 'trends' } }),
  row('bba', 'falling', 'Data entry jobs', { changePct: -21, meta: { platform: 'trends', course: false } }),
  row('bba', 'topic', 'What is the total fee for BBA in Guwahati?', { count: 140, language: 'hi', meta: { topic: 'fees', platform: 'youtube' } }),
  row('bba', 'topic', 'Which BBA colleges in Guwahati have real placements?', { count: 60, meta: { topic: 'placements', platform: 'quora' } }),
  row('bba', 'question', 'What is the total fee for BBA in Guwahati?', { count: 81, language: 'hi', meta: { topic: 'fees', platform: 'youtube' } }),
  row('bba', 'question', 'Is the BBA fee paid every semester?', { count: 30, meta: { topic: 'fees', platform: 'reddit' } }),
  row('bba', 'question', 'Does any BBA college waive the fee?', { count: 12, meta: { topic: 'fees', platform: 'reddit' } }),
  row('bba', 'question', 'Which college is good for BBA in Guwahati?', { count: 74, language: 'as', meta: { topic: 'other', platform: 'instagram' } }),
  row('bba', 'content', 'Placement stories', { meta: { format: 'reel', level: 'high', contentIndex: 0, platform: 'instagram' } }),
  row('bba', 'content', 'Fee breakdowns', { meta: { format: 'post', level: 'high', contentIndex: 1, platform: 'instagram' } }),
  row('bba', 'best_month', 'March to June', { meta: { months: [3, 4, 5, 6], platform: 'trends' } }),
  row('bba', 'idea', 'Post one clear BBA fee breakdown.', { rank: 2, meta: { title: 'Your full BBA fee in one image', hook: '“Every rupee at {institution}.”', points: ['Tuition', 'Hostel'], basedOn: 'What is the total fee for BBA in Guwahati?', topic: 'fees', format: 'post', effort: 'easy' } }),
  row('bba', 'idea', 'Answer which college is good for BBA.', { rank: 1, meta: { title: 'Which college is good for BBA?', basedOn: 'Which college is good for BBA in Guwahati?', topic: 'other', format: 'reel', effort: 'medium' } }),
  row('bba', 'idea', 'Show the placements.', { rank: 3, meta: { title: 'Placements, one student per reel', basedOn: 'Which BBA colleges in Guwahati have real placements?', topic: 'placements', trend: 'BBA in Business Analytics', format: 'reel', effort: 'medium' } }),
  // The city has too little for MBA: the state fills in.
  row('mba', 'question', 'Is there an evening MBA?', { count: 4, meta: { topic: 'other' } }),
];
const STATE_ROWS: DemandRow[] = [
  row('bba', 'rising', 'BBA in the state', { changePct: 20 }),
  row('mba', 'rising', 'MBA in Business Analytics', { changePct: 42, meta: { platform: 'trends' } }),
  row('mba', 'content', 'Placement stories', { meta: { format: 'reel', level: 'most', contentIndex: 0, platform: 'instagram' } }),
  row('mba', 'topic', 'What is the MBA fee with hostel?', { count: 300, meta: { topic: 'fees', platform: 'quora' } }),
];

const city: RegionRows = { region: 'Guwahati', rows: CITY_ROWS, pulls: new Map([['bba', pull()], ['mba', pull(true)]]) };
const state: RegionRows = { region: 'Assam', rows: STATE_ROWS, pulls: new Map([['bba', pull()], ['mba', pull()]]) };

describe('where each program comes from (spec 9.2)', () => {
  test('the city, or the state when the city has too little or nothing', () => {
    const sources = programSources([BBA, MBA], city, state);
    assert.deepEqual(
      sources.map((source) => [source.program.name, source.scope, source.region]),
      [
        ['BBA', 'city', 'Guwahati'],
        ['MBA', 'state', 'Assam'],
      ],
    );
    assert.ok(sources[1]?.rows.every((entry) => entry.programName === 'MBA' && entry.text !== 'Is there an evening MBA?'));
    // No city pull at all: the state's. Neither: nothing for that program.
    assert.equal(programSources([MBA], { ...city, pulls: new Map() }, state)[0]?.scope, 'state');
    assert.deepEqual(programSources([MBA], { ...city, pulls: new Map() }, { ...state, pulls: new Map() }), []);
    // Too little but no state pull yet: the city's, rather than nothing.
    assert.equal(programSources([MBA], city, { ...state, pulls: new Map() })[0]?.scope, 'city');
  });

  test('too little: no search trends, or too few questions counted', () => {
    assert.equal(hasTooLittle([{ kind: 'rising', count: null }, { kind: 'topic', count: 25 }]), false);
    assert.equal(hasTooLittle([{ kind: 'topic', count: 400 }]), true, 'no search trends');
    assert.equal(hasTooLittle([{ kind: 'falling', count: null }, { kind: 'topic', count: 8 }, { kind: 'topic', count: 11 }]), true, '19 questions');
    // No topics: the questions are counted instead.
    assert.equal(hasTooLittle([{ kind: 'rising', count: null }, { kind: 'question', count: 12 }, { kind: 'question', count: 9 }]), false);
  });
});

describe('the Demand page', () => {
  const view = demandSignals(programSources([BBA, MBA], city, state), ['BBA', 'MBA', 'MBA in Business Analytics']);

  test('says which programs the state fills in for, and the newest month', () => {
    assert.deepEqual(view.filledIn, ['MBA']);
    assert.equal(view.month, '2026-09');
    assert.equal(view.pulledAt, '2026-09-28T00:30:00.000Z');
  });

  test('programs rising, fastest first, then falling, steepest first, each with its word', () => {
    assert.deepEqual(
      view.trends.map((trend) => [trend.text, trend.word]),
      [
        ['MBA in Business Analytics', 'Rising fast'],
        ['BBA in Business Analytics', 'Rising'],
        ['Integrated BBA and MBA', 'Rising'],
        ['Weekend BBA options', 'Steady'],
        ['Data entry jobs', 'Falling'],
        ['General BBA with no specialisation', 'Falling'],
      ],
    );
  });

  test('a number only when the keyword tool counted searches (spec 9.5)', () => {
    const counted = view.trends.find((trend) => trend.text === 'BBA in Business Analytics');
    assert.equal(counted?.searches, 1300);
    assert.equal(counted?.searchesUrl, 'https://keywords.example/a');
    assert.ok(view.trends.filter((trend) => trend.text !== 'BBA in Business Analytics').every((trend) => trend.searches === null));
  });

  test('courses asked for that you do not offer: rising courses not in your programs', () => {
    assert.deepEqual(
      view.notOffered.map((trend) => trend.text),
      ['BBA in Business Analytics', 'Integrated BBA and MBA'],
    );
    assert.equal(view.trends.find((trend) => trend.text === 'MBA in Business Analytics')?.offered, true);
    // A career or a skill is never a course you could offer.
    assert.equal(view.trends.find((trend) => trend.text === 'Data entry jobs')?.course, false);
  });

  test('what students ask about each program: topics with their share, then each topic’s top questions', () => {
    const bba = view.asks.find((asks) => asks.programName === 'BBA');
    assert.equal(bba?.asked, 200);
    assert.deepEqual(
      bba?.topics.map((topic) => [topic.label, topic.count, topic.share]),
      [
        ['Fees', 140, 0.7],
        ['Placements', 60, 0.3],
      ],
    );
    // The topic's top question first (counted on its own too: 81), then the next asked most.
    assert.deepEqual(
      bba?.topics[0]?.questions.map((question) => [question.text, question.count, question.language]),
      [
        ['What is the total fee for BBA in Guwahati?', 81, 'hi'],
        ['Is the BBA fee paid every semester?', 30, 'en'],
      ],
    );
    // A top question never counted on its own carries no number.
    assert.equal(bba?.topics[1]?.questions[0]?.count, null);
    assert.deepEqual(
      bba?.other.map((question) => question.text),
      ['Which college is good for BBA in Guwahati?'],
    );
    assert.equal(view.asks.find((asks) => asks.programName === 'MBA')?.region, 'Assam');
  });

  test('what gets attention: one row per topic and format, at its highest level, with every program', () => {
    assert.deepEqual(
      view.attention.map((item) => [item.text, item.format, item.level, item.programs]),
      [
        ['Placement stories', 'reel', 'most', ['BBA', 'MBA']],
        ['Fee breakdowns', 'post', 'high', ['BBA']],
      ],
    );
  });

  test('the best months to post, for each program', () => {
    assert.deepEqual(
      view.bestMonths.map((months) => [months.programName, months.months, months.text]),
      [['BBA', [3, 4, 5, 6], 'March to June']],
    );
  });

  test('ideas, asked most first, each with its question, how often it was asked, and its search', () => {
    assert.deepEqual(
      view.ideas.map((idea) => [idea.title, idea.asked, idea.askedOn]),
      [
        ['Your full BBA fee in one image', 81, 'question'],
        ['Which college is good for BBA?', 74, 'question'],
        ['Placements, one student per reel', 60, 'topic'],
      ],
    );
    const fees = view.ideas[0];
    assert.equal(fees?.hook, '“Every rupee at {institution}.”');
    assert.deepEqual(fees?.points, ['Tuition', 'Hostel']);
    assert.equal(fees?.language, 'hi');
    assert.equal(fees?.platform, 'youtube');
    assert.deepEqual(view.ideas[2]?.trend, { text: 'BBA in Business Analytics', word: 'Rising' });
  });

  test('why an idea, in a line', () => {
    const [fees, , placements] = view.ideas;
    assert.ok(fees && placements);
    assert.equal(ideaWhy(fees), 'Asked about 81 times in Guwahati this month.');
    assert.equal(ideaWhy(placements), 'BBA placements came up in about 60 questions in Guwahati this month.');
    assert.equal(ideaWhy({ ...placements, asked: null, askedOn: null }), 'Searches for “BBA in Business Analytics” are rising in Guwahati.');
    assert.equal(ideaWhy({ ...placements, asked: null, askedOn: null, trend: null }), '');
  });

  test('where it was found, by name, in a fixed order, and in which languages', () => {
    assert.deepEqual(view.platforms, ['trends', 'keywords', 'reddit', 'quora', 'youtube', 'instagram']);
    assert.deepEqual(view.languages, ['as', 'en', 'hi']);
  });

  test('this month, for what is still rising', () => {
    const now = thisMonth(programSources([BBA, MBA], city, state));
    // A question and its topic can share their words: each is counted on its own.
    assert.equal(now.questions.get(thisMonthKey('bba', 'What is the total fee for BBA in Guwahati?')), 81);
    assert.equal(now.topics.get(thisMonthKey('bba', 'What is the total fee for BBA in Guwahati?')), 140);
    assert.equal(now.rising.get(thisMonthKey('mba', 'MBA in Business Analytics')), 'Rising fast');
    assert.equal(now.rising.get(thisMonthKey('bba', 'Weekend BBA options')), 'Steady');
  });
});

describe('a course is one of your programs by its name', () => {
  test('every word of the course in one program name', () => {
    assert.equal(offeredBy('MBA in Business Analytics', ['MBA (Business Analytics)']), true);
    assert.equal(offeredBy('BBA in Business Analytics', ['BBA', 'MBA']), false);
    assert.equal(offeredBy('B.Sc Nursing', ['B.Sc Nursing']), true);
    assert.equal(offeredBy('Integrated BBA and MBA', ['BBA', 'MBA']), false);
    assert.equal(offeredBy('', ['BBA']), false);
  });
});
