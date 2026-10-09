import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { auditPlaces, movedWords, thinState } from './places.ts';
import { findingsOf, recordFor, stored } from './testing.ts';

// The Audit by place (spec 7.6 to 7.8, section 13), from records built on sample data.

async function eastgate() {
  const { record, names, type, institution } = await recordFor('eastgate-university', '2026-09-15');
  return { audit: stored(record), findings: findingsOf(record), options: { institutionType: type, city: institution.city, programNames: names } };
}

describe('the Audit by place', () => {
  test('five places in order: three scored ones hold the checks, the other two what was found', async () => {
    const { audit, findings, options } = await eastgate();
    const view = auditPlaces(audit, findings, options);
    assert.deepEqual(
      view.places.map((place) => [place.key, place.name, place.scored]),
      [
        ['website', 'Website', true],
        ['google', 'Google', true],
        ['social', 'Social media', true],
        ['people', 'What people say', false],
        ['other', 'Other places', false],
      ],
    );
    // Every check shows once, in its place, with its proof.
    const checks = view.places.flatMap((place) => place.found.filter((row) => row.kind === 'check'));
    assert.equal(checks.length, new Set(audit.checks.map((check) => check.key)).size);
    assert.ok(checks.every((row) => row.result && row.proof?.url && row.proof.date));
    // Every finding shows, each with its line, link and date.
    const found = view.places.flatMap((place) => place.found.filter((row) => row.kind === 'finding'));
    assert.equal(found.length, findings.length);
    assert.ok(found.every((row) => row.findingKind && row.proof?.url && row.proof.line && row.proof.date));
    assert.ok(view.places.every((place) => place.thin === null && place.hidden.found === 0 && place.hidden.fixes === 0));
  });

  test('one ranking of fixes across checks and findings: a complaint on Reddit can come first', async () => {
    const { audit, findings, options } = await eastgate();
    const view = auditPlaces(audit, findings, options);
    assert.deepEqual(
      view.topFixes.map((fix) => [fix.id, fix.title, fix.label, fix.place, fix.impact, fix.effort]),
      [
        ['finding:eastgate-reddit-hostel-fees', 'Reply to the hostel fee thread on Reddit', 'Reddit, complaint', 'people', 'high', 'easy'],
        ['check:review_rating', 'Reply to every Google review', 'Reviews and rating', 'google', 'medium', 'easy'],
        ['check:easy_enquiry', 'Make it one tap to enquire', 'Enquiry', 'website', 'medium', 'easy'],
      ],
    );
    const ranks = view.fixes.map((fix) => fix.rank);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
    assert.equal(view.fixes.length, 15);
    // Each fix explains itself: what was found, the steps and a ready fix to copy.
    assert.ok(view.topFixes.every((fix) => fix.open && fix.found.length && fix.advice.length && fix.readyFix));
    // A place lists its own fixes, most impact first.
    assert.deepEqual(
      view.places.find((place) => place.key === 'people')?.fixes.map((fix) => fix.id),
      ['finding:eastgate-reddit-hostel-fees', 'finding:eastgate-forum-bba-scholarship'],
    );
    // The fix panel opens every fix, and each Strong check with what was found.
    assert.equal(view.panel.filter((entry) => entry.strong).length, 6);
    assert.ok(view.panel.filter((entry) => entry.strong).every((entry) => entry.found.length && !entry.advice.length));
  });

  test("what's good: Strong checks with what was found, and the good things people and other places say", async () => {
    const { audit, findings, options } = await eastgate();
    const view = auditPlaces(audit, findings, options);
    assert.deepEqual(
      view.places.map((place) => place.good.length),
      [3, 1, 2, 2, 2],
    );
    assert.ok(view.places.flatMap((place) => place.good).every((item) => item.title && item.line));
    assert.deepEqual(
      view.places.find((place) => place.key === 'people')?.good.map((item) => item.id),
      ['finding:eastgate-quora-mba-placements', 'finding:eastgate-reddit-nursing-labs'],
    );
  });

  test('the three words, each with what to fix first in it', async () => {
    const { audit, findings, options } = await eastgate();
    const view = auditPlaces(audit, findings, options);
    assert.deepEqual(
      view.words.map((word) => [word.name, word.word, word.question, word.fixFirst?.key, word.fixFirst?.result]),
      [
        ['Discovered', 'Strong', 'Can students find you?', 'ai_answers', 'missing'],
        ['Trusted', 'Okay', 'Do they believe you?', 'placement_proof', 'missing'],
        ['Chosen', 'Strong', 'Is it easy to pick you?', 'admission_steps', 'weak'],
      ],
    );
  });

  test('a proof names the program only when its line does not', async () => {
    const { audit, findings, options } = await eastgate();
    const view = auditPlaces(audit, findings, options);
    const rows = view.places.flatMap((place) => place.found).filter((row) => row.weakestProgram && row.proof);
    assert.ok(rows.length > 0);
    for (const row of rows) assert.equal(row.proof?.program, row.proof?.line?.includes(row.weakestProgram ?? '') ? null : row.weakestProgram, row.name);
  });

  test('a result the team checked says so, and a name the team gave a fix is kept', async () => {
    const { audit, findings, options } = await eastgate();
    const fees = audit.checks.filter((check) => check.key === 'fees_shown' && check.result !== 'strong');
    const changed = {
      ...audit,
      checks: audit.checks.map((check) =>
        fees.includes(check) ? { ...check, teamCheckedAt: '2026-09-16T05:00:00.000Z', detail: check.detail ? { ...check.detail, fixTitle: 'Show the fees for every year' } : null } : check,
      ),
    };
    const view = auditPlaces(changed, findings, options);
    const fix = view.fixes.find((entry) => entry.id === 'check:fees_shown');
    assert.equal(fix?.title, 'Show the fees for every year');
    assert.ok(fix?.found.every((proof) => proof.byTeam));
    assert.equal(view.places[0]?.found.find((row) => row.checkKey === 'fees_shown')?.proof?.byTeam, true);
  });

  test('a finding taken out in a review never shows, and leaves the ranking', async () => {
    const { audit, findings, options } = await eastgate();
    const view = auditPlaces(
      audit,
      findings.map((finding) => (finding.findingKey === 'eastgate-reddit-hostel-fees' ? { ...finding, removed: true } : finding)),
      options,
    );
    assert.ok(view.places.every((place) => place.found.every((row) => row.id !== 'finding:eastgate-reddit-hostel-fees')));
    assert.ok(view.fixes.every((fix) => fix.id !== 'finding:eastgate-reddit-hostel-fees'));
    assert.equal(view.topFixes[0]?.id, 'check:review_rating');
  });

  test('Free: its top 3 in full and every result; the rest of each place as counts, never as data', async () => {
    const { record, names, type, institution } = await recordFor('northbank-college', '2026-09-10', ['bba']);
    const view = auditPlaces(stored(record, { freeDetails: true }), findingsOf(record, { freeTop: true }), {
      institutionType: type,
      city: institution.city,
      programNames: names,
      teaser: { people: { found: 1, toFix: 1 }, other: { found: 1, toFix: 0 } },
    });
    assert.deepEqual(
      view.topFixes.map((fix) => [fix.id, fix.title]),
      [
        ['check:fees_shown', 'Show your full BBA fees'],
        ['check:placement_proof', 'Publish your BBA placement results'],
        ['check:google_profile', 'Build up your Google profile and reviews'],
      ],
    );
    assert.equal(view.fixes.length, 3);
    assert.deepEqual(
      view.places.map((place) => [place.key, place.found.length, place.fixes.length, place.hidden]),
      [
        ['website', 9, 2, { found: 7, fixes: 7 }],
        ['google', 4, 1, { found: 3, fixes: 3 }],
        ['social', 4, 0, { found: 4, fixes: 4 }],
        ['people', 0, 0, { found: 1, fixes: 1 }],
        ['other', 0, 0, { found: 1, fixes: 0 }],
      ],
    );
    // Every result shows; what was found only for the top 3.
    const website = view.places[0];
    assert.ok(website?.found.every((row) => row.result));
    assert.equal(website?.found.filter((row) => row.proof).length, 2);
    // Little found: the kind words.
    assert.equal(view.places[3]?.thin?.title, 'Not much said about you yet.');
    assert.equal(view.places[4]?.thin?.title, 'No listings found yet.');
  });

  test("one program's view: its own words and fixes", async () => {
    const { audit, findings, options } = await eastgate();
    const bba = [...options.programNames].find(([, name]) => name === 'BBA')?.[0] ?? null;
    const view = auditPlaces(audit, findings, { ...options, programId: bba });
    const scores = audit.programs.find((program) => program.programId === bba)?.scores;
    assert.deepEqual(
      view.words.map((word) => word.score),
      [scores?.discovered, scores?.trusted, scores?.chosen],
    );
    assert.ok(view.fixes.filter((fix) => fix.kind === 'check').every((fix) => fix.programs.every((program) => program === 'BBA')));
  });
});

describe('how a word moved', () => {
  test('up or down from the word before, with the month; nothing when it held', () => {
    assert.equal(movedWords('Okay', 45, 10, '2026-06-15T04:30:00.000Z'), 'Up from Weak in June');
    assert.equal(movedWords('Okay', 65, -8, '2026-08-15T04:30:00.000Z'), 'Down from Strong in August');
    assert.equal(movedWords('Okay', 45, 10, null), 'Up from Weak');
    assert.equal(movedWords('Okay', 52, 6, '2026-06-15T04:30:00.000Z'), null);
    assert.equal(movedWords('Okay', 45, null, '2026-06-15T04:30:00.000Z'), null);
  });
});

describe('when little is found', () => {
  test('What people say: common for smaller places, what helps, when Drishti looks again', () => {
    const thin = thinState('people', 0, { institutionType: 'skilling', city: 'Tezpur', nextAuditOn: '30 Dec 2026' });
    assert.equal(thin.title, 'Not much said about you yet.');
    assert.match(thin.why, /smaller institutes and newer courses/);
    assert.match(thin.why, /found nothing about you yet/);
    assert.equal(thin.helps.length, 2);
    assert.equal(thin.next, 'Drishti looks again with your next Audit, on 30 Dec 2026.');
    assert.match(thinState('people', 2, { institutionType: 'college', city: 'Jorhat' }).why, /smaller colleges and newer courses.*found 2 threads/);
  });

  test('Other places: the listing sites students in the city use', () => {
    const thin = thinState('other', 1, { institutionType: 'college', city: 'Jorhat' });
    assert.equal(thin.title, 'No listings found yet.');
    assert.match(thin.why, /found one\.$/);
    assert.match(thin.helps[0] ?? '', /students in Jorhat use/);
    assert.equal(thin.next, 'Drishti looks again with your next Audit.');
  });
});
