import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LISTED_PROGRAMS } from '../config/programs.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import type { DemandItemValue } from './signals.ts';
import { collect } from './collect.ts';
import { demandFixture, localize, mentionTopics, placeWords } from './mock/demand-bank.ts';
import { getAnalysisProvider } from './registry.ts';
import type { Target, WatchedInstitution } from './types.ts';

const SEPTEMBER = istDate('2026-09-28', 6);

async function items(target: Target, asOf = SEPTEMBER): Promise<Array<DemandItemValue & { sourceUrl: string }>> {
  return (await collect(target, asOf, {})).flatMap((signal) => (signal.key === 'demand_item' ? [{ ...signal.value, sourceUrl: signal.sourceUrl }] : []));
}

describe('mock Demand wording fits the region', () => {
  test('the fixtures are written for Guwahati and Assam; other places get their own names', () => {
    const text = 'Which BBA colleges in Guwahati have real placements? The best in Assam.';
    assert.equal(localize(text, placeWords('city', 'Guwahati', 'Assam')), text);
    assert.equal(localize(text, placeWords('city', 'Jorhat', 'Assam')), 'Which BBA colleges in Jorhat have real placements? The best in Assam.');
    assert.equal(localize(text, placeWords('state', 'Assam', 'Assam')), 'Which BBA colleges in Assam have real placements? The best in Assam.');
    assert.equal(localize(text, placeWords('india', 'India', null)), 'Which BBA colleges in India have real placements? The best in India.');
    assert.equal(localize(text, placeWords('city', 'Pune', 'Maharashtra')), 'Which BBA colleges in Pune have real placements? The best in Maharashtra.');
  });

  test('outside Assam an idea never asks for Assamese, and the word is never mangled', () => {
    const idea = 'Explain the Class 12 subjects BCA needs, in Assamese, in under a minute.';
    assert.equal(localize(idea, placeWords('city', 'Pune', 'Maharashtra')), 'Explain the Class 12 subjects BCA needs, in under a minute.');
    assert.equal(localize(idea, placeWords('city', 'Guwahati', 'Assam')), idea);
    assert.equal(localize('Answer "which college is good for BBA" in Assamese, with a real day in class.', placeWords('city', 'Pune', 'Maharashtra')), 'Answer "which college is good for BBA", with a real day in class.');
  });

  test('a pull in another state: its own place names, Hindi instead of Assamese, originals only where the wording is unchanged', async () => {
    const found = await items({ kind: 'region', scope: 'city', region: 'Pune', state: 'Maharashtra', programKey: 'bba' });
    const questions = found.filter((item) => item.kind === 'question');
    assert.equal(questions.length, 5);
    assert.ok(questions.some((item) => item.text.includes('Pune')));
    assert.ok(questions.every((item) => !item.text.includes('Guwahati')));
    assert.ok(questions.every((item) => item.language !== 'as'));
    for (const question of questions) {
      if (question.text.includes('Pune')) assert.equal(question.originalText, null, question.text);
    }
  });
});

describe('every listed program has Demand, not only the sample ones', () => {
  test('a fixture for each: 3 rising, 2 falling, 5 questions, the usual five worries and one new, 5 ideas', () => {
    for (const program of LISTED_PROGRAMS) {
      const fixture = demandFixture(program.key);
      assert.ok(fixture, program.name);
      assert.equal(fixture.rising.length, 3, program.name);
      assert.equal(fixture.falling.length, 2, program.name);
      assert.equal(fixture.questions.length, 5, program.name);
      assert.equal(fixture.worries.length, 6, program.name);
      assert.equal(fixture.worries.filter((worry) => worry.theme === 'new').length, 1, program.name);
      assert.equal(fixture.ideas.length, 5, program.name);
      for (const text of [...fixture.rising, ...fixture.falling, ...fixture.questions, ...fixture.worries, ...fixture.ideas].map((entry) => entry.text)) {
        assert.equal(hasDashes(text), false, text);
      }
    }
    assert.equal(demandFixture('not-a-program'), undefined);
  });

  test('a program outside the sample gets a full pull and ideas built on its questions', async () => {
    const target: Target = { kind: 'region', scope: 'city', region: 'Jorhat', state: 'Assam', programKey: 'pgdm' };
    const found = await items(target);
    for (const kind of ['rising', 'falling', 'question', 'worry', 'season'] as const) assert.ok(found.some((item) => item.kind === kind), kind);
    const questions = found
      .filter((item) => item.kind === 'question')
      .map((item) => ({ text: item.text, sourceUrl: item.sourceUrl, questionIndex: Number(item.meta.questionIndex) }));
    const ideas = await getAnalysisProvider({}).contentIdeas({ programKey: 'pgdm', region: { scope: 'city', region: 'Jorhat', state: 'Assam' }, questions });
    assert.equal(ideas.length, 5);
    assert.ok(ideas.every((idea) => questions.some((question) => question.text === idea.basedOn)));
  });
});

describe('months after September drift, with the odd big spike', () => {
  const target: Target = { kind: 'region', scope: 'city', region: 'Guwahati', state: 'Assam', programKey: 'bba' };

  test('the same month always gives the same pull', async () => {
    const october = istDate('2026-10-28', 6);
    assert.deepEqual(await items(target, october), await items(target, october));
  });

  test('later months move, and across programs and a year some trend spikes', async () => {
    const september = (await items(target)).filter((item) => item.kind === 'rising').map((item) => item.changePct);
    const october = (await items(target, istDate('2026-10-28', 6))).filter((item) => item.kind === 'rising').map((item) => item.changePct);
    assert.notDeepEqual(october, september);
    let spikes = 0;
    for (const programKey of ['bba', 'bca', 'mba', 'bcom', 'nursing']) {
      for (let month = 10; month <= 21; month += 1) {
        const date = istDate(`${2026 + Math.floor((month - 1) / 12)}-${String(((month - 1) % 12) + 1).padStart(2, '0')}-28`, 6);
        const rising = (await items({ ...target, programKey }, date)).filter((item) => item.kind === 'rising');
        spikes += rising.filter((item) => (item.changePct ?? 0) >= 40).length;
      }
    }
    assert.ok(spikes > 0);
  });
});

describe('grouped mentions of any watched institution', () => {
  const watched: WatchedInstitution = {
    id: 'new-college',
    slug: 'riverside-college-new',
    name: 'Riverside College',
    type: 'college',
    city: 'Jorhat',
    state: 'Assam',
    programKey: 'bba',
  };

  test('topics and counts about the institution, filed under its program, in its city and state', async () => {
    const inState = await items({ kind: 'region', scope: 'state', region: 'Assam', state: 'Assam', programKey: 'bba', watch: [watched] });
    const mentions = inState.filter((item) => item.kind === 'mention');
    assert.equal(mentions.length, mentionTopics(watched.slug, watched.type).length);
    assert.ok(mentions.every((item) => item.about?.id === 'new-college' && item.sentiment !== null));
    assert.ok(mentions.some((item) => item.sentiment === 'positive') && mentions.some((item) => item.sentiment === 'negative'));
  });

  test('never under another program, another place, or All India', async () => {
    const otherProgram = await items({ kind: 'region', scope: 'state', region: 'Assam', state: 'Assam', programKey: 'bca', watch: [watched] });
    const otherCity = await items({ kind: 'region', scope: 'city', region: 'Guwahati', state: 'Assam', programKey: 'bba', watch: [watched] });
    const india = await items({ kind: 'region', scope: 'india', region: 'India', state: null, programKey: 'bba', watch: [watched] });
    for (const found of [otherProgram, otherCity, india]) assert.equal(found.filter((item) => item.kind === 'mention').length, 0);
  });

  test('never a person: grouped topics only', () => {
    for (const type of ['college', 'university', 'skilling'] as const) {
      for (const topic of mentionTopics(`someone-${type}`, type)) {
        assert.doesNotMatch(topic.text, /@\w/);
        assert.equal(hasDashes(topic.text), false);
      }
    }
  });
});
