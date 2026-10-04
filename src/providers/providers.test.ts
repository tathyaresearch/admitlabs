import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { istDate } from '../domain/dates.ts';
import { AI_ASSISTANTS, CHECK_KEYS, RESULTS } from '../domain/types.ts';
import { sampleInstitution, toInstitutionRef, toProgramRefs } from '../sample/index.ts';
import { collect } from './collect.ts';
import { aiAnswersFacts, googleSearchFacts, pageSpeedFacts, reviewCountOverTime } from './mock/facts.ts';
import { rngFor } from './mock/random.ts';
import { pulledItems } from '../demand/items.ts';
import { EMPTY_PROGRAM_DETAILS } from '../domain/details.ts';
import { hasBlanks, readyFixText } from '../domain/ready-fix.ts';
import { SAMPLE_INSTITUTION_DETAILS } from '../sample/details.ts';
import { mockEmail } from './mock/email.ts';
import { getAnalysisProvider, getEmailProvider, getProvider } from './registry.ts';
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

  test('a Google Maps listing given in Settings is the Google checks own source', async () => {
    const listing = 'https://maps.example/place/eastgate-university-main-campus';
    const signals = await collect({ kind: 'institution', institution: { ...eastgateRef, otherLinks: { ...eastgateRef.otherLinks, googleMaps: listing } } }, asOf);
    const profile = signals.find((signal) => signal.key === 'google_profile');
    const rating = signals.find((signal) => signal.key === 'review_rating');
    assert.equal(profile?.sourceUrl, listing);
    assert.equal(rating?.sourceUrl, listing);
    const without = await collect({ kind: 'institution', institution: eastgateRef }, asOf);
    assert.notEqual(without.find((signal) => signal.key === 'google_profile')?.sourceUrl, listing, 'without one, Drishti finds the profile itself');
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
    await assert.rejects(getAnalysisProvider({ DRISHTI_PROVIDER_AI: 'real' }).contentIdeas({ programKey: 'bba', questions: [], topics: [], rising: [] }), ProviderNotConnectedError);
    await assert.rejects(getEmailProvider({ DRISHTI_PROVIDER_EMAIL: 'real' }).send({ kind: 'lead_alert', to: ['a@mail.example'], subject: 'x', text: 'x', html: 'x' }), ProviderNotConnectedError);
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
      assert.ok(reviewCountOverTime('strong', rngFor('rc', seed), 'college_university', seed % 12) >= college.strongMinReviews);
      const okay = reviewCountOverTime('okay', rngFor('rc', seed), 'skilling', seed % 12);
      assert.ok(okay >= skilling.okayMinReviews && okay < skilling.strongMinReviews);
      const weak = reviewCountOverTime('weak', rngFor('rc', seed), 'college_university', seed % 12);
      assert.ok(weak >= college.weakMinReviews && weak < college.okayMinReviews);
      assert.equal(reviewCountOverTime('missing', rngFor('rc', seed), 'skilling', seed % 12), 0);
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

describe('AI answers', () => {
  test('names each assistant asked, as many as the count the score uses', () => {
    assert.equal(AI_ASSISTANTS.length, SCORING_V1.thresholds.ai_answers.assistantsAsked);
    for (const result of RESULTS) {
      for (let seed = 0; seed < 20; seed += 1) {
        const facts = aiAnswersFacts(result, rngFor('ai', seed), 'best BBA in Guwahati');
        assert.deepEqual(
          facts.assistants?.map((entry) => entry.assistant),
          [...AI_ASSISTANTS],
        );
        assert.equal(facts.assistants?.filter((entry) => entry.named).length, facts.assistantsNaming, result);
      }
    }
  });
});

describe('mock demand', () => {
  test('a shared pull has every kind of grouped item', async () => {
    const signals = await collect({ kind: 'region', scope: 'city', region: 'Guwahati', programKey: 'bba' }, asOf);
    const kinds = new Set(signals.map((signal) => signal.key === 'demand_item' && signal.value.kind));
    for (const kind of ['rising', 'falling', 'question', 'topic', 'content', 'best_month']) assert.ok(kinds.has(kind as never), kind);
    // Version 1's worries, mentions and season are no longer collected.
    for (const kind of ['worry', 'mention', 'season']) assert.ok(!kinds.has(kind as never), kind);
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

  test('the state counts more than its biggest city, and a smaller city much less', async () => {
    const count = async (scope: 'city' | 'state', region: string) =>
      (await collect({ kind: 'region', scope, region, state: 'Assam', programKey: 'mba' }, asOf)).reduce(
        (sum, signal) => sum + (signal.key === 'demand_item' && signal.value.kind === 'question' ? (signal.value.count ?? 0) : 0),
        0,
      );
    const tezpur = await count('city', 'Tezpur');
    const guwahati = await count('city', 'Guwahati');
    const assam = await count('state', 'Assam');
    assert.ok(tezpur < guwahati / 5 && guwahati < assam);
  });

  test('content ideas are each built on a real question, with its source', async () => {
    const signals = await collect({ kind: 'region', scope: 'city', region: 'Guwahati', programKey: 'bca' }, asOf);
    const { basis } = pulledItems(signals);
    const { questions, topics } = basis;
    const ideas = await getAnalysisProvider({}).contentIdeas({ programKey: 'bca', ...basis });
    assert.equal(ideas.length, 5);
    for (const idea of ideas) {
      const question = questions.find((candidate) => candidate.text === idea.basedOn) ?? topics.find((candidate) => candidate.text === idea.basedOn);
      assert.ok(question, idea.text);
      assert.equal(idea.sourceUrl, question.sourceUrl);
      // A hook to stop the scroll, and 3 or 4 key points.
      assert.ok(idea.hook.length > 0 && idea.points.length >= 3 && idea.points.length <= 4, idea.title);
    }
    // Only where a rising search really stands behind it: the AI project rides on BCA with AI.
    assert.equal(ideas[0]?.trend, 'BCA with AI and Machine Learning');
    assert.equal(ideas[1]?.trend, null);
  });
});

describe('Demand history', () => {
  test('a rising trend builds up month by month into September; August is unchanged', async () => {
    const target = { kind: 'region', scope: 'city', region: 'Guwahati', programKey: 'bba' } as const;
    const counts: number[] = [];
    for (const month of ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']) {
      // Searches a month for the fastest rise, from the keyword tool.
      const rising = pulledItems(await collect(target, istDate(`${month}-28`, 9))).items.filter((item) => item.kind === 'rising');
      counts.push(rising[0]?.count ?? 0);
    }
    for (let index = 1; index < counts.length; index += 1) assert.ok((counts[index] as number) > (counts[index - 1] as number), `month ${index} grows: ${counts.join(', ')}`);
  });
});

describe('What people say and Other places', () => {
  test('Eastgate in September: Reddit threads from the Reddit provider, the rest from the search tool, each with its source', async () => {
    const signals = await collect({ kind: 'institution', institution: eastgateRef }, asOf);
    const findings = signals.flatMap((signal) => (signal.key === 'finding' ? [signal] : []));
    assert.ok(findings.length >= 5);
    for (const finding of findings) {
      assert.equal(finding.provider === 'reddit', finding.value.source === 'Reddit', finding.value.key);
      assert.ok(finding.value.line.length > 0 && finding.value.line.length <= 400);
      assert.doesNotMatch(finding.value.line, /@\w/);
    }
    assert.ok(findings.some((finding) => finding.value.place === 'people') && findings.some((finding) => finding.value.place === 'other'));
    // The same complaint from three students counts three times.
    assert.equal(findings.find((finding) => finding.value.key === 'eastgate-reddit-hostel-fees')?.value.repeats, 3);
  });

  test('a finding dealt with is gone from the next Audit', async () => {
    const keys = async (day: string) =>
      (await collect({ kind: 'institution', institution: eastgateRef }, istDate(day, 10))).flatMap((signal) => (signal.key === 'finding' ? [signal.value.key] : []));
    assert.ok((await keys('2026-08-15')).includes('eastgate-quora-mba-hostel'));
    assert.ok(!(await keys('2026-09-15')).includes('eastgate-quora-mba-hostel'));
  });
});

describe('the AI writer: ready fixes and the fixes for findings', () => {
  const ai = getAnalysisProvider({});
  const context = {
    institutionName: 'Eastgate University',
    city: 'Guwahati',
    programNames: ['BBA', 'MBA'],
    institutionDetails: SAMPLE_INSTITUTION_DETAILS['eastgate-university'] ?? null,
    programDetails: new Map([['MBA', { ...EMPTY_PROGRAM_DETAILS, feesAmount: 240000, feesPeriod: 'year' as const, durationValue: 2, durationUnit: 'years' as const, placementYear: 2026, placedPercent: 88, averagePackage: 6.2, highestPackage: 18, topRecruiters: ['Tata Steel'] }]]),
  };
  // The facts each check found for Eastgate's MBA in September, as a provider returned them.
  const factsFor = async (checkKey: (typeof CHECK_KEYS)[number]) => {
    const program = toProgramRefs(eastgate).find((entry) => entry.name === 'MBA');
    assert.ok(program);
    const signals = [...(await collect({ kind: 'institution', institution: eastgateRef }, asOf)), ...(await collect({ kind: 'program', institution: eastgateRef, program }, asOf))];
    const signal = signals.find((entry) => entry.key === checkKey);
    assert.ok(signal, checkKey);
    return signal.value as never;
  };
  const facts = factsFor;

  test('every check below Strong gets a ready fix; a Strong one needs none', async () => {
    for (const checkKey of CHECK_KEYS) {
      const found = await factsFor(checkKey);
      const advice = await ai.fixAdvice({ checkKey, result: 'weak', facts: found, institutionType: 'university', programName: 'MBA', context });
      assert.ok(advice.readyFix, checkKey);
      assert.ok(readyFixText(advice.readyFix).length > 20, checkKey);
      const strong = await ai.fixAdvice({ checkKey, result: 'strong', facts: found, institutionType: 'university', programName: 'MBA', context });
      assert.equal(strong.readyFix, null, checkKey);
    }
  });

  test('details the institution added fill the blanks, and say so', async () => {
    const fees = await ai.fixAdvice({ checkKey: 'fees_shown', result: 'weak', facts: await facts('fees_shown'), institutionType: 'university', programName: 'MBA', context });
    assert.equal(fees.readyFix?.kind, 'table');
    assert.ok(fees.readyFix && readyFixText(fees.readyFix).includes('₹2,40,000'));
    assert.equal(fees.readyFix?.fromDetails, true);
    const placements = await ai.fixAdvice({ checkKey: 'placement_proof', result: 'weak', facts: await facts('placement_proof'), institutionType: 'university', programName: 'MBA', context });
    assert.ok(placements.readyFix && readyFixText(placements.readyFix).includes('88% of the batch'));
    // Without details, the blanks stay for the institution to fill in.
    const blank = await ai.fixAdvice({ checkKey: 'fees_shown', result: 'weak', facts: await facts('fees_shown'), institutionType: 'university', programName: 'BBA' });
    assert.ok(blank.readyFix && hasBlanks(blank.readyFix));
    assert.equal(blank.readyFix?.fromDetails, undefined);
  });

  test('a finding with something to do gets a fix; good news and a listing that is right do not', async () => {
    const base = { institutionType: 'university' as const, institutionName: 'Eastgate University', city: 'Guwahati', programNames: ['BBA'] };
    const finding = (kind: 'good' | 'bad' | 'unanswered' | 'listing' | 'news' | 'directory', listing: 'old_details' | 'missing_courses' | 'missing' | null = null) => ({
      place: kind === 'listing' || kind === 'news' || kind === 'directory' ? ('other' as const) : ('people' as const),
      kind,
      key: `test-${kind}-${listing ?? 'none'}`,
      line: '“Is the BBA worth it?” has no answer from the university.',
      source: 'Quora',
      repeats: 1,
      listing,
    });
    for (const [kind, listing] of [['unanswered', null], ['bad', null], ['listing', 'old_details'], ['listing', 'missing'], ['directory', 'missing_courses']] as const) {
      const fix = await ai.findingFix({ ...base, finding: finding(kind, listing) });
      assert.ok(fix && fix.title && fix.steps.length >= 2 && fix.readyFix, `${kind} ${listing}`);
    }
    for (const [kind, listing] of [['good', null], ['news', null], ['listing', null]] as const) {
      assert.equal(await ai.findingFix({ ...base, finding: finding(kind, listing) }), null, `${kind}`);
    }
  });

  test('a sample finding gets the fix the writer wrote for it', async () => {
    const fix = await ai.findingFix({
      institutionType: 'university',
      institutionName: 'Eastgate University',
      city: 'Guwahati',
      programNames: ['BBA'],
      finding: { place: 'people', kind: 'bad', key: 'eastgate-reddit-hostel-fees', line: 'x', source: 'Reddit', repeats: 3, listing: null },
    });
    assert.equal(fix?.title, 'Reply to the hostel fee thread on Reddit');
  });
});

describe('the email sender', () => {
  test('the mock sends one message per recipient to the local test inbox', async () => {
    const calls: Array<{ url: string; body: { To: Array<{ Email: string }>; Subject: string } }> = [];
    const fakeFetch = (async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const email = mockEmail({ DRISHTI_MAILPIT_URL: 'http://127.0.0.1:55324' }, fakeFetch);
    const results = await email.send({ kind: 'lead_alert', to: ['a@brightpath-skills.example', 'b@brightpath-skills.example'], subject: 'New enquiry', text: 'x', html: '<p>x</p>' });
    assert.deepEqual(
      results.map((result) => [result.recipient, result.ok]),
      [
        ['a@brightpath-skills.example', true],
        ['b@brightpath-skills.example', true],
      ],
    );
    assert.deepEqual(
      calls.map((call) => [call.url, call.body.To[0]?.Email]),
      [
        ['http://127.0.0.1:55324/api/v1/send', 'a@brightpath-skills.example'],
        ['http://127.0.0.1:55324/api/v1/send', 'b@brightpath-skills.example'],
      ],
    );
    assert.equal(email.sender, 'Local test inbox');
  });

  test('never anywhere but this computer, and a failure is reported, not thrown', async () => {
    const email = mockEmail({ DRISHTI_MAILPIT_URL: 'https://mail.example.com' });
    await assert.rejects(email.send({ kind: 'monthly_summary', to: ['a@mail.example'], subject: 'x', text: 'x', html: 'x' }), /this computer/);
    const down = mockEmail({}, (async () => new Response('', { status: 500 })) as unknown as typeof fetch);
    const [result] = await down.send({ kind: 'audit_ready', to: ['a@mail.example'], subject: 'x', text: 'x', html: 'x' });
    assert.equal(result?.ok, false);
    assert.match(result?.error ?? '', /500/);
  });
});
