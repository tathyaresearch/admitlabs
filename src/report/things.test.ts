import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { FixView } from '../audit/places.ts';
import type { ItemPart, ListItem } from '../audit/view.ts';
import type { PickedIdea } from '../demand/picks.ts';
import { hasDashes } from '../domain/copy.ts';
import type { CheckKey, CheckResult, Impact, Place } from '../domain/types.ts';
import { byImpact, checkFixTitle, fixThing, freeThings, pickThing, threeThings, type MonthPick, type RivalLesson, type ThingsInput } from './things.ts';

// "Do these 3 things this month" (spec 13 and 24): one fix from the Audit, one lesson from rivals,
// one of Make these 3, ordered by impact; Free keeps its top 3 fixes.

function fix(rank: number, checkKey: CheckKey | null, impact: Impact, extra: Partial<FixView> = {}): FixView {
  const place: Place = extra.place ?? (checkKey === 'review_rating' || checkKey === 'google_profile' ? 'google' : checkKey ? 'website' : 'people');
  return {
    id: checkKey ? `check:${checkKey}` : `finding:thread-${rank}`,
    kind: checkKey ? 'check' : 'finding',
    rank,
    title: `Fix ${checkKey ?? 'the thread'}`,
    place,
    label: checkKey ? checkKey.replace('_', ' ') : 'Reddit, complaint',
    checkKey,
    findingKey: checkKey ? null : `thread-${rank}`,
    findingKind: checkKey ? null : 'bad',
    impact,
    effort: 'easy',
    programs: [],
    results: [],
    found: [],
    why: 'It matters to a student.',
    advice: [{ programs: [], steps: ['Do it.'] }],
    readyFix: null,
    open: true,
    ...extra,
  };
}

function idea(title: string, extra: Partial<PickedIdea> = {}): PickedIdea {
  return {
    title,
    text: `${title} The longer brief.`,
    why: 'Asked about 96 times in Guwahati this month. Your BBA page does not answer it yet.',
    hook: 'A hook.',
    points: ['One point.'],
    format: 'reel',
    effort: 'medium',
    topic: 'placements',
    programName: 'BBA',
    programKey: 'bba',
    region: 'Guwahati',
    basedOn: 'Which BBA colleges in Guwahati have real placements?',
    asked: 96,
    askedOn: 'question',
    language: 'en',
    trend: null,
    trendWord: null,
    sourceUrl: 'https://quora.example/q',
    platform: 'quora',
    foundAt: '2026-09-28T00:30:00.000Z',
    ...extra,
  };
}

const FIXES: FixView[] = [
  fix(1, 'fees_shown', 'medium', { title: 'Show your full BBA and MBA fees', label: 'Fees', programs: ['BBA', 'MBA'] }),
  fix(2, 'review_rating', 'medium', { title: 'Reply to every Google review', label: 'Reviews and rating' }),
  fix(3, null, 'high', { title: 'Reply to the hostel fee thread on Reddit' }),
];

const LESSONS: RivalLesson[] = [
  { text: 'Show your full BBA fees', detail: 'Highfield University is ahead of you here.', checkKey: 'fees_shown', rivalId: 'highfield', effort: null, month: '2026-09' },
  { text: "Learn from Silverline College's top post", detail: 'It reached 48,200 views.', checkKey: null, rivalId: 'silverline', effort: 'medium', month: '2026-09' },
  { text: 'Reply to every Google review', detail: 'Northbank College is ahead of you here.', checkKey: 'review_rating', rivalId: 'northbank', effort: null, month: '2026-09' },
];

const PICKS: MonthPick[] = [
  { month: '2026-09', rank: 1, idea: idea('Last year’s BBA placements, one student per reel') },
  { month: '2026-09', rank: 2, idea: idea('Your nursing council recognition, with the link', { format: 'page', programName: 'B.Sc Nursing' }) },
];

const NAMES = new Map([
  ['highfield', 'Highfield University'],
  ['silverline', 'Silverline College'],
  ['northbank', 'Northbank College'],
]);

const base: ThingsInput = { fixes: FIXES, lessons: LESSONS, picks: PICKS, rivalNames: NAMES };

describe('3 things to do this month', () => {
  test('the top fix, the top lesson on another check and the first of Make these 3', () => {
    const things = threeThings(base);
    assert.deepEqual(
      things.map((thing) => [thing.source, thing.title]),
      [
        ['audit', 'Show your full BBA and MBA fees'],
        ['rivals', "Learn from Silverline College's top post"],
        ['demand', 'Last year’s BBA placements, one student per reel'],
      ],
    );
    // The first lesson was about fees too, so it is skipped rather than said twice.
    assert.equal(things[1]?.rivalId, 'silverline');
  });

  test('ordered by impact: High first, an idea (no impact) last', () => {
    // The thread is the top fix; the lesson about fees carries the fees fix's Medium.
    const things = threeThings({ ...base, fixes: [FIXES[2] as FixView, ...FIXES.slice(0, 2)] });
    assert.deepEqual(
      things.map((thing) => [thing.source, thing.impact]),
      [
        ['audit', 'high'],
        ['rivals', 'medium'],
        ['demand', null],
      ],
    );
    const order = byImpact([
      { source: 'demand', impact: null, name: 'idea' },
      { source: 'audit', impact: 'low', name: 'small fix' },
      { source: 'rivals', impact: 'high', name: 'lesson' },
      { source: 'audit', impact: 'high', name: 'big fix' },
    ] as const);
    assert.deepEqual(
      order.map((thing) => thing.name),
      ['big fix', 'lesson', 'small fix', 'idea'],
    );
  });

  test('each says where it comes from, with its place and check, or the rival, or the format and program', () => {
    const [fixed, lesson, made] = threeThings(base);
    assert.equal(fixed?.label, 'Website · Fees');
    assert.equal(lesson?.label, 'Learned from Silverline College');
    assert.equal(made?.label, 'Reel · BBA');
  });

  test('a lesson about a check carries that check’s fix: its impact, effort and programs', () => {
    const things = threeThings({ ...base, fixes: [FIXES[1] as FixView, FIXES[0] as FixView], lessons: [LESSONS[0] as RivalLesson], picks: [] });
    const lesson = things.find((thing) => thing.source === 'rivals');
    assert.deepEqual(
      [lesson?.checkKey, lesson?.impact, lesson?.effort, lesson?.programs],
      ['fees_shown', 'medium', 'easy', ['BBA', 'MBA']],
    );
  });

  test('an idea: how often its question was asked in place of an impact, the rest of why as its detail, and what Mark as made keeps', () => {
    const thing = pickThing(PICKS[0] as MonthPick);
    assert.equal(thing.weight, 'Asked about 96 times in Guwahati this month.');
    assert.equal(thing.detail, 'Your BBA page does not answer it yet.');
    assert.deepEqual(thing.mark, { thing: 'Last year’s BBA placements, one student per reel The longer brief.', month: '2026-09' });
    assert.equal(thing.impact, null);
  });

  test('a fix is marked by its id; a lesson by its words and month', () => {
    const [fixed, lesson] = threeThings(base);
    assert.equal(fixed?.fixId, 'check:fees_shown');
    assert.equal(fixed?.mark, null);
    assert.deepEqual(lesson?.mark, { thing: "Learn from Silverline College's top post", month: '2026-09' });
  });

  test('with no rivals or no picks yet, the next fix fills in; never two about the same check', () => {
    assert.deepEqual(
      threeThings({ ...base, lessons: [] }).map((thing) => [thing.source, thing.checkKey]),
      [
        ['audit', 'fees_shown'],
        ['audit', 'review_rating'],
        ['demand', null],
      ],
    );
    const things = threeThings({ ...base, fixes: FIXES.slice(0, 1), lessons: [LESSONS[0] as RivalLesson, LESSONS[2] as RivalLesson], picks: [] });
    assert.deepEqual(
      things.map((thing) => [thing.source, thing.checkKey]),
      [
        ['audit', 'fees_shown'],
        ['rivals', 'review_rating'],
      ],
    );
  });

  test('nothing to go on yet: an empty list, never made up', () => {
    assert.deepEqual(threeThings({ ...base, fixes: [], lessons: [], picks: [] }), []);
  });

  test('Free: its top 3 fixes, in the Audit’s order', () => {
    assert.deepEqual(
      freeThings(FIXES).map((thing) => thing.title),
      FIXES.map((item) => item.title),
    );
    assert.equal(freeThings(FIXES, 2).length, 2);
    assert.equal(fixThing(FIXES[2] as FixView).label, 'What people say · Reddit, complaint');
  });

  test('plain words only: no dashes anywhere', () => {
    for (const thing of threeThings(base)) {
      for (const text of [thing.title, thing.label, thing.detail, thing.weight ?? '']) assert.equal(hasDashes(text), false, text);
    }
  });
});

describe('a check’s fix by name, for the team’s view of a prospect', () => {
  function part(programName: string | null, result: CheckResult): ItemPart {
    return { checkId: `${programName}-${result}`, programId: programName, programName, result, previousResult: null, points: 0, maxPoints: 20, checkedAt: '2026-09-15T04:30:00.000Z', detail: null };
  }
  const item = (key: CheckKey, parts: ItemPart[]): ListItem => ({ rank: 1, key, name: key, pillar: 'chosen', parts, strength: null, difficulty: 'medium', points: 5 });

  test('named for its programs, and "your programs" past three', () => {
    assert.equal(checkFixTitle(item('fees_shown', [part('BBA', 'missing'), part('MBA', 'okay')]), 'college'), 'Show your full BBA and MBA fees');
    assert.equal(checkFixTitle(item('google_search', ['BBA', 'BCA', 'MBA', 'B.Com'].map((name) => part(name, 'weak'))), 'college'), 'Get found when students search for your programs');
    assert.equal(checkFixTitle(item('review_rating', [part(null, 'missing')]), 'college'), 'Get your first Google reviews');
  });
});
