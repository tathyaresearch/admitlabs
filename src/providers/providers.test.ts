import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { istDate } from '../domain/dates.ts';
import { CHECK_KEYS, RESULTS } from '../domain/types.ts';
import { sampleInstitution, toInstitutionRef, toProgramRefs } from '../sample/index.ts';
import { collect } from './collect.ts';
import { googleSearchFacts, pageSpeedFacts, reviewCountFor } from './mock/facts.ts';
import { rngFor } from './mock/random.ts';
import { getAnalysisProvider, getProvider } from './registry.ts';
import { ProviderNotConnectedError, type AnySignal, type InstitutionRef } from './types.ts';

const asOf = istDate('2026-09-15', 10);
const eastgate = sampleInstitution('eastgate-university');
const eastgateRef = toInstitutionRef(eastgate);

async function collectAll(institution: InstitutionRef, programs: ReturnType<typeof toProgramRefs>, when = asOf): Promise<AnySignal[]> {
  return [
    ...(await collect({ kind: 'institution', institution }, when)),
    ...(await Promise.all(programs.map((program) => collect({ kind: 'program', institution, program }, when)))).flat(),
  ];
}

describe('mock providers', () => {
  test('together they cover all 17 checks', async () => {
    const keys = new Set((await collectAll(eastgateRef, toProgramRefs(eastgate))).map((signal) => signal.key));
    for (const key of CHECK_KEYS) assert.ok(keys.has(key), key);
  });

  test('every signal keeps its source (a .example link) and when it was checked', async () => {
    const signals = [
      ...(await collectAll(eastgateRef, toProgramRefs(eastgate))),
      ...(await collect({ kind: 'region', scope: 'state', region: 'Assam', programKey: 'bba' }, asOf)),
    ];
    for (const signal of signals) {
      const source = new URL(signal.sourceUrl);
      assert.equal(source.protocol, 'https:', signal.sourceUrl);
      assert.ok(source.hostname.endsWith('.example'), signal.sourceUrl);
      assert.ok(!Number.isNaN(Date.parse(signal.fetchedAt)), signal.fetchedAt);
    }
  });

  test('institution checks have no program, program checks name one', async () => {
    const signals = await collectAll(eastgateRef, toProgramRefs(eastgate));
    for (const signal of signals) {
      if (signal.key === 'google_search' || signal.key === 'fees_shown' || signal.key === 'ai_answers') assert.ok(signal.programId);
      if (signal.key === 'instagram_activity' || signal.key === 'page_speed') assert.equal(signal.programId, null);
    }
  });

  test('the same inputs always give the same sample data', async () => {
    const first = await collectAll(eastgateRef, toProgramRefs(eastgate));
    const second = await collectAll(eastgateRef, toProgramRefs(eastgate));
    assert.deepEqual(first, second);
  });

  test('an institution outside the sample still gets stable, sensible facts', async () => {
    const newcomer: InstitutionRef = {
      id: '00000000-0000-4000-8000-00000000abcd',
      slug: 'new-horizon-college',
      name: 'New Horizon College',
      type: 'college',
      city: 'Nagaon',
      state: 'Assam',
      website: 'https://new-horizon-college.example',
      instagram: 'newhorizoncollege',
      youtube: null,
      otherLinks: {},
      programKeys: ['bba'],
    };
    const programs = [{ id: '00000000-0000-4000-8000-00000000abce', name: 'BBA', programKey: 'bba' }];
    const signals = await collectAll(newcomer, programs);
    const youtube = signals.find((signal) => signal.key === 'youtube');
    const socials = signals.find((signal) => signal.key === 'other_socials');
    assert.equal(youtube?.key === 'youtube' && youtube.value.exists, false, 'no channel means no YouTube');
    assert.deepEqual(socials?.key === 'other_socials' && socials.value.platforms, [], 'no links means no other socials');
    assert.deepEqual(signals, await collectAll(newcomer, programs));
  });

  test('an institution onboarded with real links still only gets .example sources', async () => {
    const real: InstitutionRef = {
      id: '00000000-0000-4000-8000-00000000abcf',
      slug: 'real-looking-college',
      name: 'Real Looking College',
      type: 'college',
      city: 'Pune',
      state: 'Maharashtra',
      website: 'https://www.real-looking-college.ac.in/',
      instagram: 'reallookingcollege',
      youtube: 'https://www.youtube.com/@reallookingcollege',
      otherLinks: { facebook: 'https://www.facebook.com/reallookingcollege', linkedin: 'https://www.linkedin.com/school/real-looking-college' },
      programKeys: ['bba'],
    };
    const programs = [{ id: '00000000-0000-4000-8000-00000000abd0', name: 'BBA', programKey: 'bba' }];
    const signals = await collectAll(real, programs);
    for (const signal of signals) assert.ok(new URL(signal.sourceUrl).hostname.endsWith('.example'), signal.sourceUrl);
    const youtube = signals.find((signal) => signal.key === 'youtube');
    const channel = youtube?.key === 'youtube' ? youtube.value.channelUrl : null;
    assert.ok(channel === null || new URL(channel).hostname.endsWith('.example'), String(channel));
    const fees = signals.find((signal) => signal.key === 'fees_shown');
    assert.equal(fees?.sourceUrl, 'https://real-looking-college-ac-in.example/programs/bba#fees');
  });

  test('switching a provider to real makes it throw until it is connected', async () => {
    const env = { DRISHTI_PROVIDER_SEARCH: 'real' };
    const program = toProgramRefs(eastgate)[0];
    assert.ok(program);
    await assert.rejects(collect({ kind: 'program', institution: eastgateRef, program }, asOf, env), ProviderNotConnectedError);
    assert.equal(getProvider('search', env).mode, 'real');
    await assert.rejects(getAnalysisProvider({ DRISHTI_PROVIDER_ANALYSIS: 'real' }).contentIdeas({ programKey: 'bba', questions: [] }));
  });
});

describe('facts land inside the band of the intended result', () => {
  const t = SCORING_V1.thresholds;

  test('google search position', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const rng = () => rngFor('band', seed);
      assert.ok((googleSearchFacts('strong', rng(), 'q').position ?? 99) <= t.google_search.strongMaxPosition);
      const okay = googleSearchFacts('okay', rng(), 'q').position ?? 0;
      assert.ok(okay > t.google_search.strongMaxPosition && okay <= t.google_search.okayMaxPosition);
      const weak = googleSearchFacts('weak', rng(), 'q').position ?? 0;
      assert.ok(weak > t.google_search.okayMaxPosition && weak <= t.google_search.weakMaxPosition);
      assert.equal(googleSearchFacts('missing', rng(), 'q').position, null);
    }
  });

  test('review counts follow each weight family', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const college = t.google_profile.college_university;
      const skilling = t.google_profile.skilling;
      assert.ok(reviewCountFor('strong', rngFor('rc', seed), 'college_university') >= college.strongMinReviews);
      const okay = reviewCountFor('okay', rngFor('rc', seed), 'skilling');
      assert.ok(okay >= skilling.okayMinReviews && okay < skilling.strongMinReviews);
      const weak = reviewCountFor('weak', rngFor('rc', seed), 'college_university');
      assert.ok(weak >= college.weakMinReviews && weak < college.okayMinReviews);
      assert.equal(reviewCountFor('missing', rngFor('rc', seed), 'skilling'), 0);
    }
  });

  test('page speed score', () => {
    for (const result of RESULTS) {
      for (let seed = 0; seed < 30; seed += 1) {
        const { loads, mobileScore } = pageSpeedFacts(result, rngFor('speed', seed));
        if (result === 'missing') assert.equal(loads, false);
        if (result === 'strong') assert.ok((mobileScore ?? 0) >= t.page_speed.strongMinScore);
        if (result === 'okay') assert.ok((mobileScore ?? 0) >= t.page_speed.okayMinScore && (mobileScore ?? 100) < t.page_speed.strongMinScore);
        if (result === 'weak') assert.ok((mobileScore ?? 100) < t.page_speed.okayMinScore);
      }
    }
  });
});

describe('mock demand', () => {
  test('a shared pull has every kind of grouped item', async () => {
    const signals = await collect({ kind: 'region', scope: 'city', region: 'Guwahati', programKey: 'bba' }, asOf);
    const kinds = new Set(signals.map((signal) => signal.key === 'demand_item' && signal.value.kind));
    for (const kind of ['rising', 'falling', 'question', 'worry', 'mention', 'season']) assert.ok(kinds.has(kind as never), kind);
  });

  test('Hindi and Assamese questions keep their original wording, English ones do not need to', async () => {
    const signals = await collect({ kind: 'region', scope: 'city', region: 'Guwahati', programKey: 'nursing' }, asOf);
    const questions = signals.flatMap((signal) => (signal.key === 'demand_item' && signal.value.kind === 'question' ? [signal.value] : []));
    assert.equal(questions.length, 5);
    for (const question of questions) {
      if (question.language === 'en') assert.equal(question.originalText, null);
      else assert.ok(question.originalText && question.originalText !== question.text);
    }
    assert.ok(questions.some((question) => question.language === 'hi'));
    assert.ok(questions.some((question) => question.language === 'as'));
  });

  test('state and India pulls count more than the city', async () => {
    const count = async (scope: 'city' | 'state' | 'india', region: string) =>
      (await collect({ kind: 'region', scope, region, programKey: 'mba' }, asOf)).reduce(
        (sum, signal) => sum + (signal.key === 'demand_item' && signal.value.kind === 'question' ? signal.value.count : 0),
        0,
      );
    const city = await count('city', 'Guwahati');
    const state = await count('state', 'Assam');
    const india = await count('india', 'India');
    assert.ok(city < state && state < india);
  });

  test('content ideas are each built on a real question, with its source', async () => {
    const signals = await collect({ kind: 'region', scope: 'city', region: 'Guwahati', programKey: 'bca' }, asOf);
    const questions = signals.flatMap((signal) =>
      signal.key === 'demand_item' && signal.value.kind === 'question'
        ? [{ text: signal.value.text, sourceUrl: signal.sourceUrl, questionIndex: Number(signal.value.meta.questionIndex) }]
        : [],
    );
    const ideas = await getAnalysisProvider({}).contentIdeas({ programKey: 'bca', questions });
    assert.equal(ideas.length, 5);
    for (const idea of ideas) {
      const question = questions.find((candidate) => candidate.text === idea.basedOn);
      assert.ok(question, idea.text);
      assert.equal(idea.sourceUrl, question.sourceUrl);
    }
  });
});
