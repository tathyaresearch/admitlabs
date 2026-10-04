import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { StoredFinding } from '../audit/places.ts';
import { findingsOf } from '../audit/testing.ts';
import { checkScoresOf, sampleAuditChain, sampleRivals } from '../sample/world.ts';
import { checksAcross } from './across.ts';
import { compareChecks } from './compare.ts';
import { openingPlace, otherNote, peopleNote, placeChecks, placeLeadText, placeLesson, rivalPlaces, rivalSummary, type PlaceSide } from './places.ts';

// Rivals place by place (spec 8.4), from the sample world's own Audits and rival Audits.

async function sidesFor(slug: string, day: string) {
  const own = (await sampleAuditChain(slug, 'own', day)).at(-1);
  if (!own) throw new Error(`No Audit for ${slug}`);
  const rivals = await sampleRivals(slug, day);
  const yours = checkScoresOf(own);
  const scores = (record: (typeof own)['record']) => ({ overall: record.overall, discovered: record.discovered, trusted: record.trusted, chosen: record.chosen });
  const sides: PlaceSide[] = [
    { id: 'you', name: own.institution.name, you: true, nearby: false, scores: scores(own.record), checks: yours, findings: findingsOf(own.record) },
    ...rivals.map(
      (rival): PlaceSide => ({
        id: rival.id,
        name: rival.name,
        you: false,
        nearby: false,
        scores: rival.audit ? scores(rival.audit.record) : null,
        checks: rival.audit ? checkScoresOf(rival.audit) : [],
        findings: rival.audit ? findingsOf(rival.audit.record) : [],
      }),
    ),
  ];
  const compared = rivals.flatMap((rival) => (rival.audit ? [{ side: { id: rival.id, name: rival.name, you: false }, comparisons: compareChecks(yours, checkScoresOf(rival.audit)) }] : []));
  const across = checksAcross({ id: 'you', name: own.institution.name, you: true }, compared);
  return { own, rivals, sides, across, type: own.type };
}

describe('the ranking', () => {
  test('you and each rival, highest score first, with the three words and the small score', async () => {
    const { sides } = await sidesFor('eastgate-university', '2026-09-15');
    const { ranking } = rivalPlaces(sides);
    assert.deepEqual(
      ranking.map((row) => [row.place, row.name, row.you, row.overall, row.words.map((word) => word.word).join(' ')]),
      [
        [1, 'Silverline College', false, 77, 'Strong Strong Strong'],
        [2, 'Eastgate University', true, 73, 'Strong Okay Strong'],
        [3, 'Highfield University', false, 51, 'Okay Okay Okay'],
        [4, 'Northbank College', false, 46, 'Okay Okay Okay'],
      ],
    );
    assert.deepEqual(
      ranking[0]?.words.map((word) => word.name),
      ['Visibility', 'Trust', 'Chosen'],
    );
  });

  test('a rival not checked yet goes last, with no place and no words; equal scores share a place, you first', () => {
    const base = { checks: [], findings: [], nearby: false };
    const { ranking } = rivalPlaces([
      { ...base, id: 'you', name: 'You College', you: true, scores: { overall: 60, discovered: 60, trusted: 60, chosen: 60 } },
      { ...base, id: 'a', name: 'Alpha', you: false, scores: { overall: 60, discovered: 70, trusted: 50, chosen: 60 } },
      { ...base, id: 'b', name: 'Beta', you: false, scores: null },
    ]);
    assert.deepEqual(
      ranking.map((row) => [row.id, row.place, row.words.length]),
      [
        ['you', 1, 3],
        ['a', 1, 3],
        ['b', null, 0],
      ],
    );
  });
});

describe('place by place', () => {
  test('Website, Google and Social media say who leads; What people say and Other places say what was found', async () => {
    const { sides } = await sidesFor('eastgate-university', '2026-09-15');
    const view = rivalPlaces(sides);
    const silverline = sides.find((side) => side.name === 'Silverline College')?.id ?? '';
    assert.deepEqual(
      view.places.map((place) => [place.key, place.scored, place.leaders.length === 1 && place.leaders[0] === silverline]),
      [
        ['website', true, true],
        ['google', true, true],
        ['social', true, true],
        ['people', false, false],
        ['other', false, false],
      ],
    );
    const social = view.places.find((place) => place.key === 'social');
    assert.deepEqual(
      view.ranking.map((row) => social?.cells[row.id]?.word),
      ['Strong', 'Strong', 'Weak', 'Weak'],
    );
    assert.equal(social?.cells[silverline]?.leads, true);
    assert.equal(social?.cells.you?.leads, false);
    const people = view.places.find((place) => place.key === 'people');
    assert.deepEqual(
      view.ranking.map((row) => people?.cells[row.id]?.note),
      ['3 good, no complaints', '2 good, 1 complaint, 1 unanswered', '2 good, 1 complaint', 'no complaints, 1 unanswered'],
    );
    assert.equal(placeLeadText(social ?? view.places[0]!, view.ranking), 'Silverline College leads');
    assert.equal(placeLeadText(people ?? view.places[0]!, view.ranking), 'What was found');
  });

  test('rivals level at the top all lead, and the place opens where a rival leads you by the most', async () => {
    const { sides } = await sidesFor('brightpath-skills', '2026-09-02');
    const view = rivalPlaces(sides);
    const google = view.places.find((place) => place.key === 'google');
    assert.deepEqual(
      google?.leaders.map((id) => sides.find((side) => side.id === id)?.name).sort(),
      ['Pinegrove Skills Hub', 'Silverline College'],
    );
    assert.equal(placeLeadText(google ?? view.places[0]!, view.ranking), 'Silverline College and Pinegrove Skills Hub lead');
    assert.equal(openingPlace(view, 'you'), 'google');
  });

  test('when every side is level nobody leads, and the website opens first', () => {
    const check = { checkId: 'c', key: 'mobile_friendly' as const, pillar: 'chosen' as const, programKey: null, programName: null, result: 'strong' as const, points: 10, maxPoints: 10, checkedAt: '2026-09-01T04:30:00.000Z', finding: null, sourceUrl: null };
    const scores = { overall: 70, discovered: 70, trusted: 70, chosen: 70 };
    const view = rivalPlaces([
      { id: 'you', name: 'You College', you: true, nearby: false, scores, checks: [check], findings: [] },
      { id: 'a', name: 'Alpha', you: false, nearby: false, scores, checks: [{ ...check, checkId: 'd' }], findings: [] },
    ]);
    const website = view.places[0];
    assert.deepEqual(website?.leaders, []);
    assert.equal(placeLeadText(website!, view.ranking), 'All level');
    assert.equal(openingPlace(view, 'you'), 'website');
    assert.deepEqual(placeLesson({ place: website!, rows: [], sides: view.ranking, institutionType: 'college' }), {
      title: 'Nobody leads here',
      text: 'You and your rivals are level on Website. One step up puts you ahead.',
    });
  });
});

describe('what to learn from the one ahead in a place', () => {
  test('what was found on the check where they lead you by the most; never to copy', async () => {
    const { sides, across, type } = await sidesFor('eastgate-university', '2026-09-15');
    const view = rivalPlaces(sides);
    const google = view.places.find((place) => place.key === 'google');
    const lesson = placeLesson({ place: google!, rows: placeChecks(across, 'google'), sides, institutionType: type });
    assert.deepEqual(lesson, {
      title: 'What to learn from Silverline College',
      text: 'On Google reviews, Drishti found: “Rated 4.4 from 69 reviews. Replies to 73% of reviews.” Do the same your own way, with your own students and numbers. Never copy their words or photos.',
    });
    assert.ok(placeChecks(across, 'google').every((row) => ['google_search', 'google_profile', 'review_rating', 'ai_answers'].includes(row.key)));
  });

  test('on Social media, the idea behind their best post', async () => {
    const { sides, across, type } = await sidesFor('eastgate-university', '2026-09-15');
    const view = rivalPlaces(sides);
    const silverline = sides.find((side) => side.name === 'Silverline College')?.id ?? '';
    const lesson = placeLesson({
      place: view.places.find((place) => place.key === 'social')!,
      rows: placeChecks(across, 'social'),
      sides,
      posts: [{ rivalId: silverline, title: 'A first day as an intern', whyItWorked: 'Opens on a real student in a real workplace.' }],
      institutionType: type,
    });
    assert.equal(lesson?.text, 'The best post this month, “A first day as an intern”: Opens on a real student in a real workplace. Take the idea with your own students; never copy the post.');
  });

  test('several leaders name each, and say whose finding it is', async () => {
    const { sides, across, type } = await sidesFor('brightpath-skills', '2026-09-02');
    const view = rivalPlaces(sides);
    const lesson = placeLesson({ place: view.places.find((place) => place.key === 'google')!, rows: placeChecks(across, 'google'), sides, institutionType: type });
    assert.equal(lesson?.title, 'What to learn from Silverline College and Pinegrove Skills Hub');
    assert.match(lesson?.text ?? '', /^On their Google profile, Drishti found for Pinegrove Skills Hub: “/);
  });

  test('where you lead, keep it going; places with no leader have no lesson', async () => {
    const { sides, type } = await sidesFor('eastgate-university', '2026-09-15');
    const view = rivalPlaces(sides);
    const people = view.places.find((place) => place.key === 'people');
    assert.equal(placeLesson({ place: people!, rows: [], sides, institutionType: type }), null);
    const yours = { ...view.places[0]!, leaders: ['you'] };
    assert.deepEqual(placeLesson({ place: yours, rows: [], sides, institutionType: type }), { title: 'You lead here', text: 'No rival is ahead of you on Website. Keep it going.' });
  });
});

describe('what was found, in words', () => {
  let next = 0;
  const finding = (place: StoredFinding['place'], kind: StoredFinding['kind'], listing: StoredFinding['listing'] = null): StoredFinding => ({
    id: `finding-${(next += 1)}`,
    place,
    kind,
    findingKey: 'key',
    line: 'A line.',
    sourceName: 'Source',
    sourceUrl: 'https://source.example/',
    checkedAt: '2026-09-01T04:30:00.000Z',
    repeats: 1,
    listing,
    fix: null,
    fixRank: null,
    removed: false,
  });

  test('What people say: good, complaints and unanswered', () => {
    assert.equal(peopleNote([]), 'Not much said yet');
    assert.equal(peopleNote([finding('people', 'good'), finding('people', 'good'), finding('people', 'unanswered')]), '2 good, no complaints, 1 unanswered');
    assert.equal(peopleNote([finding('people', 'bad'), finding('people', 'bad'), finding('people', 'good')]), '1 good, 2 complaints');
    assert.equal(peopleNote([{ ...finding('people', 'bad'), removed: true }]), 'Not much said yet');
  });

  test('Other places: listings right and wrong, and news', () => {
    assert.equal(otherNote([]), 'No listings found yet');
    assert.equal(otherNote([finding('other', 'listing'), finding('other', 'directory'), finding('other', 'news')]), 'Listed on 2 sites, 1 news story');
    assert.equal(otherNote([finding('other', 'listing', 'old_details'), finding('other', 'listing', 'missing')]), '1 old listing, missing from 1 site');
    assert.equal(otherNote([finding('other', 'listing', 'missing_courses')]), '1 listing missing courses');
  });
});

describe('one rival against you, in a sentence', () => {
  test('how many checks each side leads, and where they lead most', () => {
    assert.equal(
      rivalSummary({ theyLead: ['placement_proof', 'instagram_activity', 'review_rating'], youLead: 5, institutionType: 'university' }),
      'They lead you on 3 checks, most on placement proof and Instagram. You lead them on 5 checks.',
    );
    assert.equal(rivalSummary({ theyLead: ['approvals'], youLead: 0, institutionType: 'skilling' }), 'They lead you on 1 check, most on showing their skilling recognition. You do not lead them on any check yet.');
    assert.equal(rivalSummary({ theyLead: [], youLead: 4, institutionType: 'college' }), 'They do not lead you on any check. You lead them on 4 checks.');
    assert.equal(rivalSummary({ theyLead: [], youLead: 0, institutionType: 'college' }), 'You are level on every check.');
  });
});
