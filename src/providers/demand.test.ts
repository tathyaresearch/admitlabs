import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LISTED_PROGRAMS } from '../config/programs.ts';
import { pulledItems } from '../demand/items.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { monthSpanWords } from '../domain/format.ts';
import { ASK_TOPICS } from '../domain/types.ts';
import type { DemandItemValue } from './signals.ts';
import { collect } from './collect.ts';
import { demandFixture, localize, placeWords } from './mock/demand-bank.ts';
import { getAnalysisProvider } from './registry.ts';
import type { Target } from './types.ts';

const SEPTEMBER = istDate('2026-09-28', 6);
const GUWAHATI_BBA: Target = { kind: 'region', scope: 'city', region: 'Guwahati', state: 'Assam', programKey: 'bba' };

async function items(target: Target, asOf = SEPTEMBER): Promise<Array<DemandItemValue & { sourceUrl: string }>> {
  return (await collect(target, asOf, {})).flatMap((signal) => (signal.key === 'demand_item' ? [{ ...signal.value, sourceUrl: signal.sourceUrl }] : []));
}

describe('mock Demand wording fits the region', () => {
  test('the fixtures are written for Guwahati and Assam; other places get their own names', () => {
    const text = 'Which BBA colleges in Guwahati have real placements? The best in Assam.';
    assert.equal(localize(text, placeWords('city', 'Guwahati', 'Assam')), text);
    assert.equal(localize(text, placeWords('city', 'Jorhat', 'Assam')), 'Which BBA colleges in Jorhat have real placements? The best in Assam.');
    assert.equal(localize(text, placeWords('state', 'Assam', 'Assam')), 'Which BBA colleges in Assam have real placements? The best in Assam.');
    assert.equal(localize(text, placeWords('city', 'Pune', 'Maharashtra')), 'Which BBA colleges in Pune have real placements? The best in Maharashtra.');
  });

  test('outside Assam an idea never asks for Assamese, and the words are never mangled', () => {
    const pune = placeWords('city', 'Pune', 'Maharashtra');
    assert.equal(localize('Explain the Class 12 subjects BCA needs, in Assamese, in under a minute.', pune), 'Explain the Class 12 subjects BCA needs, in under a minute.');
    assert.equal(localize('Answer "which college is good for BBA" in Assamese, with a real day in class.', pune), 'Answer "which college is good for BBA", with a real day in class.');
    assert.equal(localize('Weekend batch timings, in Assamese', pune), 'Weekend batch timings');
    assert.equal(localize('BBA without Maths? Answered in Assamese', pune), 'BBA without Maths?');
    assert.equal(localize('Weekend batch timings, in Assamese', placeWords('city', 'Guwahati', 'Assam')), 'Weekend batch timings, in Assamese');
  });

  test('a pull in another state: its own place names, Hindi instead of Assamese, originals only where the wording is unchanged', async () => {
    const found = await items({ kind: 'region', scope: 'city', region: 'Pune', state: 'Maharashtra', programKey: 'bba' });
    const questions = found.filter((item) => item.kind === 'question');
    assert.equal(questions.length, 5);
    assert.ok(questions.some((item) => item.text.includes('Pune')));
    assert.ok(found.every((item) => !item.text.includes('Guwahati')));
    assert.ok(found.every((item) => item.language !== 'as'));
    for (const question of questions) {
      if (question.text.includes('Pune')) assert.equal(question.originalText, null, question.text);
    }
  });
});

describe('every listed program has Demand, not only the sample ones', () => {
  test('a fixture for each: 3 rising, 2 falling, 5 questions, the five topics, what gets attention, best months and 5 ideas', () => {
    for (const program of LISTED_PROGRAMS) {
      const fixture = demandFixture(program.key);
      assert.ok(fixture, program.name);
      assert.equal(fixture.rising.length, 3, program.name);
      assert.equal(fixture.falling.length, 2, program.name);
      assert.equal(fixture.questions.length, 5, program.name);
      assert.deepEqual(fixture.topics.map((topic) => topic.topic).sort(), ASK_TOPICS.filter((topic) => topic !== 'other').sort(), program.name);
      assert.ok(fixture.content.length >= 3, program.name);
      assert.ok(fixture.bestMonths.length > 0 && fixture.bestMonths.every((month) => month >= 1 && month <= 12), program.name);
      assert.equal(fixture.ideas.length, 5, program.name);
      for (const idea of fixture.ideas) {
        assert.ok(idea.points.length >= 3 && idea.points.length <= 4, `${program.name}: ${idea.title}`);
        assert.ok(idea.question !== undefined || idea.topic !== undefined, `${program.name}: ${idea.title} stands on a question`);
        assert.ok(idea.hook.length > 0);
      }
      const words = [
        ...fixture.rising.map((entry) => entry.text),
        ...fixture.falling.map((entry) => entry.text),
        ...fixture.questions.map((entry) => entry.text),
        ...fixture.topics.map((entry) => entry.question.text),
        ...fixture.content.map((entry) => entry.text),
        ...fixture.ideas.flatMap((idea) => [idea.title, idea.text, idea.hook, ...idea.points]),
      ];
      for (const text of words) assert.equal(hasDashes(text), false, text);
    }
    assert.equal(demandFixture('not-a-program'), undefined);
  });

  test('a program outside the sample gets a full pull and ideas built on what students asked', async () => {
    const target: Target = { kind: 'region', scope: 'city', region: 'Pune', state: 'Maharashtra', programKey: 'pgdm' };
    const { items: found, basis } = pulledItems(await collect(target, SEPTEMBER, {}));
    for (const kind of ['rising', 'falling', 'question', 'topic', 'content', 'best_month'] as const) assert.ok(found.some((item) => item.kind === kind), kind);
    const ideas = await getAnalysisProvider({}).contentIdeas({ programKey: 'pgdm', region: { scope: 'city', region: 'Pune', state: 'Maharashtra' }, ...basis });
    assert.equal(ideas.length, 5);
    const asked = [...basis.questions.map((question) => question.text), ...basis.topics.map((topic) => topic.text)];
    assert.ok(ideas.every((idea) => asked.includes(idea.basedOn)));
    assert.ok(ideas.every((idea) => idea.points.length >= 3 && idea.hook.length > 0 && idea.title.length > 0));
    // The rising search behind an idea is one found in the same pull.
    assert.ok(ideas.some((idea) => idea.trend !== null));
    assert.ok(ideas.every((idea) => idea.trend === null || basis.rising.some((trend) => trend.text === idea.trend)));
  });
});

describe('honest numbers (spec 9.5)', () => {
  test('a search trend gives a change, never a count; the keyword tool counts searches for some of them', async () => {
    const raw = await items(GUWAHATI_BBA);
    assert.ok(raw.filter((item) => item.kind === 'rising' || item.kind === 'falling').every((item) => item.count === null && item.changePct !== null));
    const { items: pulled } = pulledItems(await collect(GUWAHATI_BBA, SEPTEMBER, {}));
    const rising = pulled.filter((item) => item.kind === 'rising');
    // The first two rising trends get searches a month from the keyword tool; the third has no count.
    assert.deepEqual(
      rising.map((item) => [item.text, item.count !== null, item.meta.countKind ?? null]),
      [
        ['BBA in Business Analytics', true, 'searches'],
        ['BBA in Aviation Management', true, 'searches'],
        ['Integrated BBA and MBA', false, null],
      ],
    );
    assert.ok(rising.filter((item) => item.count !== null).every((item) => typeof item.meta.countSource === 'string'));
  });

  test('questions and topics carry the questions counted, each with its source', async () => {
    const { items: pulled } = pulledItems(await collect(GUWAHATI_BBA, SEPTEMBER, {}));
    const asked = pulled.filter((item) => item.kind === 'question' || item.kind === 'topic');
    assert.ok(asked.length >= 10);
    assert.ok(asked.every((item) => item.count !== null && item.count > 0 && item.meta.countKind === 'asked'));
    assert.ok(asked.every((item) => item.sourceUrl.startsWith('https://') && item.sourceUrl.includes('.example')));
    // Quora and forum questions come through the search tool, but keep their own platform.
    assert.ok(pulled.some((item) => item.meta.platform === 'quora'));
    assert.ok(pulled.every((item) => item.meta.platform !== 'search'));
  });

  test('what students ask about each program: fees, placements, scholarships, hostel and careers, ranked by how often', async () => {
    const { items: pulled } = pulledItems(await collect(GUWAHATI_BBA, SEPTEMBER, {}));
    const topics = pulled.filter((item) => item.kind === 'topic').sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    assert.deepEqual(
      topics.map((item) => item.meta.topic),
      ['fees', 'placements', 'careers', 'hostel', 'scholarships'],
    );
  });

  test('the best months to post come with their words', async () => {
    const best = (await items(GUWAHATI_BBA)).find((item) => item.kind === 'best_month');
    assert.equal(best?.text, 'March to June');
    assert.deepEqual(best?.meta.months, [3, 4, 5, 6]);
    assert.equal(monthSpanWords([11, 12, 1, 2]), 'November to February');
    assert.equal(monthSpanWords([4, 5, 6, 10]), 'April to June, and October');
    assert.equal(monthSpanWords([10]), 'October');
  });
});

describe('a small city is thin, and its state fills in (spec 9.2)', () => {
  const tezpur: Target = { kind: 'region', scope: 'city', region: 'Tezpur', state: 'Assam', programKey: 'digital-marketing' };

  test('Tezpur: a few questions with small counts, but no search trends, counts or what gets attention', async () => {
    const found = await items(tezpur);
    assert.equal(found.filter((item) => ['rising', 'falling', 'best_month', 'content'].includes(item.kind)).length, 0);
    const questions = found.filter((item) => item.kind === 'question');
    assert.ok(questions.length > 0);
    assert.ok(questions.every((item) => (item.count ?? 0) < 10));
  });

  test('Assam has the full picture for the same program', async () => {
    const found = await items({ kind: 'region', scope: 'state', region: 'Assam', state: 'Assam', programKey: 'digital-marketing' });
    for (const kind of ['rising', 'falling', 'question', 'topic', 'content', 'best_month'] as const) assert.ok(found.some((item) => item.kind === kind), kind);
  });
});

describe('months after September drift, with the odd big spike', () => {
  test('the same month always gives the same pull', async () => {
    const october = istDate('2026-10-28', 6);
    assert.deepEqual(await items(GUWAHATI_BBA, october), await items(GUWAHATI_BBA, october));
  });

  test('later months move, and across programs and a year some trend spikes', async () => {
    const september = (await items(GUWAHATI_BBA)).filter((item) => item.kind === 'rising').map((item) => item.changePct);
    const october = (await items(GUWAHATI_BBA, istDate('2026-10-28', 6))).filter((item) => item.kind === 'rising').map((item) => item.changePct);
    assert.notDeepEqual(october, september);
    let spikes = 0;
    for (const programKey of ['bba', 'bca', 'mba', 'bcom', 'nursing']) {
      for (let month = 10; month <= 21; month += 1) {
        const date = istDate(`${2026 + Math.floor((month - 1) / 12)}-${String(((month - 1) % 12) + 1).padStart(2, '0')}-28`, 6);
        const rising = (await items({ ...GUWAHATI_BBA, programKey }, date)).filter((item) => item.kind === 'rising');
        spikes += rising.filter((item) => (item.changePct ?? 0) >= 40).length;
      }
    }
    assert.ok(spikes > 0);
  });
});

describe('grouped only, never a person (spec 9.6)', () => {
  test('no item names or links a person, and none is about an institution', async () => {
    for (const programKey of ['bba', 'mba', 'nursing', 'data-analytics']) {
      for (const item of await items({ ...GUWAHATI_BBA, programKey })) {
        assert.doesNotMatch(item.text, /@\w/);
        assert.equal(item.about, null);
        assert.equal(item.sentiment, null);
        assert.equal(hasDashes(item.text), false, item.text);
      }
    }
  });
});
