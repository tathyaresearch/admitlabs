import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { buildReport, changeSince, curlyQuotes, leadsFacts, PAID_CONTACT, REPORT_LIMITS, reportTexts, sinceWhen } from './data.ts';
import { PLACE_LIMITS } from './places.ts';
import { sampleReportInput as input } from './testing.ts';

// The report snapshot, in the spec's order (section 12), from Eastgate University's September (see
// ./testing.ts).

const LINKS = [
  { name: 'Instagram bio', count: 6, before: 5 },
  { name: 'Reel: Data Analytics placements', count: 11, before: 7 },
  { name: 'YouTube: Hotel Management campus tour', count: 4, before: 3 },
  { name: 'Facebook page', count: 2, before: 2 },
  { name: 'Old poster', count: 0, before: 0 },
];

describe('what goes into the monthly report', () => {
  test('the cover: the month, the institution and Discovered, Trusted and Chosen', async () => {
    const data = buildReport(await input());
    assert.equal(data.monthLabel, 'September 2026');
    assert.equal(data.monthName, 'September');
    assert.equal(data.madeOn, '1 Oct 2026');
    assert.equal(data.checkedOn, 'Checked 15 Sep 2026');
    assert.deepEqual(
      data.words.map((word) => word.name),
      ['Discovered', 'Trusted', 'Chosen'],
    );
    assert.ok(data.words.every((word) => ['Strong', 'Okay', 'Weak'].includes(word.word)));
    assert.ok(data.answer.length > 0);
  });

  test('the score shows small, with its change dated', async () => {
    const data = buildReport(await input());
    assert.equal(data.score.change, 'Up 1 since August');
    assert.equal(Number.isInteger(data.score.overall), true);
    const first = await input();
    first.audit.previousAuditId = null;
    assert.equal(buildReport({ ...first, history: first.history.slice(-1) }).score.change, 'First Audit');
  });

  test('This month in short: the words, Home’s 3 things, one rival move; enquiries only for a Client', async () => {
    const data = buildReport(await input());
    assert.equal(data.summary.month, '2026-09');
    assert.equal(data.summary.lines.things.length, 3);
    assert.deepEqual(
      [...new Set(data.summary.things.map((thing) => thing.source))].sort(),
      ['audit', 'demand', 'rivals'],
    );
    // The latest move of the month: 21 Sep.
    assert.equal(data.summary.lines.move, 'Silverline College: Added page 7.');
    assert.equal(data.summary.lines.enquiries, null);
    assert.equal(data.leads, null);
  });

  test('the summary as the team left it wins over a new one', async () => {
    const base = await input();
    const kept = buildReport(base).summary;
    const fixed = { ...kept, lines: { ...kept.lines, move: 'Silverline College announced its 2027 dates.' } };
    assert.equal(buildReport({ ...base, summary: fixed }).summary.lines.move, 'Silverline College announced its 2027 dates.');
  });

  test('What the internet says: the five places, what’s good and what to fix, each with its proof', async () => {
    const data = buildReport(await input());
    assert.deepEqual(
      data.places.map((place) => place.name),
      ['Website', 'Google', 'Social media', 'What people say', 'Other places'],
    );
    for (const place of data.places) {
      assert.ok(place.good.length <= PLACE_LIMITS.good && place.fixes.length <= PLACE_LIMITS.fixes, place.name);
      for (const item of [...place.good, ...place.fixes]) assert.ok(item.proof?.line || place.thin, `${place.name}: ${item.title}`);
    }
    const website = data.places[0];
    assert.ok(website?.fixes.every((item) => item.impact?.startsWith('Impact ') && item.proof?.source && item.proof.date === '15 Sep 2026'));
  });

  test('What to fix: the top 5 in detail with steps and the ready fix, the rest as a short ranked list', async () => {
    const data = buildReport(await input());
    assert.equal(data.fixes.length, REPORT_LIMITS.fixesInDetail);
    assert.deepEqual(
      [...data.fixes, ...data.moreFixes].map((fix) => fix.rank),
      Array.from({ length: data.fixes.length + data.moreFixes.length }, (_, index) => index + 1),
      'one ranking, in order',
    );
    assert.ok(data.moreFixes.length <= REPORT_LIMITS.moreFixes);
    for (const fix of data.fixes) {
      assert.ok(fix.steps.length > 0 && fix.steps.length <= PLACE_LIMITS.steps, fix.title);
      assert.ok(['high', 'medium', 'low'].includes(fix.impact));
    }
    assert.ok(data.fixes.some((fix) => fix.readyFix));
  });

  test('Rivals: the one line, the ranking with the small score and the words, place by place, the alerts', async () => {
    const data = buildReport(await input());
    const rivals = data.rivals;
    assert.ok(rivals);
    assert.equal(rivals.line, 'This month, Silverline College is ahead on placement proof and Instagram.');
    assert.equal(rivals.ranking.length, 4);
    assert.ok(rivals.ranking.some((row) => row.you));
    const newcomer = rivals.ranking.find((row) => row.name === 'Newcomer College');
    assert.deepEqual([newcomer?.place, newcomer?.overall, newcomer?.words, newcomer?.nearby], [null, null, [], true]);
    assert.equal(rivals.places.length, 5);
    assert.ok(rivals.places.every((place) => place.cells.length === 4));
    assert.equal(rivals.moves.length, REPORT_LIMITS.moves);
    assert.equal(rivals.moreMoves, 3);
    assert.equal(rivals.moves[0]?.date, '21 Sep 2026');
  });

  test('Demand: Make these 3, programs rising and falling, what students ask and the best months, each capped', async () => {
    const data = buildReport(await input());
    const demand = data.demand;
    assert.ok(demand);
    assert.equal(demand.place, 'Guwahati');
    assert.equal(demand.picks.length, 3);
    assert.equal(demand.picks[0]?.weight, 'Asked about 91 times in Guwahati this month.');
    assert.equal(demand.picks[0]?.meta, 'Reel · BBA');
    assert.ok(demand.trends.length > 0 && demand.trends.length <= REPORT_LIMITS.trends);
    assert.ok(demand.questions.length > 0 && demand.questions.length <= REPORT_LIMITS.questions);
    assert.ok(demand.bestMonths.length <= REPORT_LIMITS.bestMonths);
    const asked = demand.questions.map((question) => question.asked);
    assert.deepEqual(asked, [...asked].sort((a, b) => b - a), 'asked most first');
    assert.equal(new Set(demand.questions.map((question) => question.text)).size, demand.questions.length, 'each question once');
  });

  test('Leads, for a Client: the month’s enquiries by link, counts only', async () => {
    const data = buildReport(await input({ tier: 'client', leads: LINKS }));
    assert.equal(data.leads?.line, 'Your content brought 23 enquiries in September, 6 more than in August. Most came from Reel: Data Analytics placements.');
    assert.equal(data.leads?.total, 23);
    assert.deepEqual(
      data.leads?.links.map((link) => link.name),
      ['Reel: Data Analytics placements', 'Instagram bio', 'YouTube: Hotel Management campus tour', 'Facebook page'],
    );
    assert.equal(data.summary.lines.enquiries, data.leads?.line);
    assert.deepEqual(leadsFacts(LINKS), { count: 23, before: 17, top: { name: 'Reel: Data Analytics placements', count: 11 } });
  });

  test('Progress and sources: the small score and the three words month by month, your place among rivals', async () => {
    const data = buildReport(await input());
    assert.deepEqual(
      data.progress.map((row) => row.label),
      ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    );
    assert.equal(data.progress[0]?.change, null);
    assert.equal(data.progress[2]?.change, 'Up 8');
    assert.ok(data.progress.every((row) => row.words.length === 3 && row.place?.endsWith('of 3')));
    assert.deepEqual(
      data.sources.map((note) => note.label),
      ['Audit', 'Rivals', 'Demand'],
    );
    assert.match(data.sources[1]?.text ?? '', /Moves from the weekly check of their public pages, last run 28 Sep 2026\./);
    const client = buildReport(await input({ tier: 'client', leads: LINKS }));
    assert.deepEqual(
      client.sources.map((note) => note.label),
      ['Audit', 'Rivals', 'Demand', 'Leads'],
    );
  });

  test('no rivals or no Demand yet: those parts say nothing made up', async () => {
    const data = buildReport(await input({ rivals: [], moves: [], lessons: [], line: null, picks: [], demand: { place: 'Guwahati', signals: null } }));
    assert.equal(data.rivals, null);
    assert.equal(data.demand, null);
    assert.equal(data.summary.lines.move, 'Pick 3 to 5 rivals in Drishti, and their moves show here.');
    assert.ok(data.summary.things.every((thing) => thing.source === 'audit'));
  });

  test('Paid only: one quiet line at the end. Client never gets it', async () => {
    const paid = buildReport(await input());
    assert.deepEqual(paid.contact, { ...PAID_CONTACT });
    assert.equal(paid.tierLabel, 'Paid');
    const client = buildReport(await input({ tier: 'client', leads: LINKS }));
    assert.equal(client.contact, null);
    assert.equal(reportTexts(client).some((text) => text.includes('hello@admitlabs.in')), false);
  });

  test('curly quotes everywhere, whatever the source wrote; no dashes anywhere', async () => {
    const base = await input();
    const data = buildReport({
      ...base,
      moves: [{ rivalId: 'highfield', kind: 'fee_change', description: 'Replaced MBA fee amounts with "Contact us for fees".', detectedAt: base.moves[0]?.detectedAt ?? '' }],
    });
    assert.equal(data.rivals?.moves[0]?.text, 'Replaced MBA fee amounts with “Contact us for fees”.');
    assert.equal(data.summary.lines.move, 'Highfield University: Replaced MBA fee amounts with “Contact us for fees”.');
    for (const tier of ['paid', 'client'] as const) {
      for (const text of reportTexts(buildReport({ ...base, tier, leads: tier === 'client' ? LINKS : null }))) {
        assert.doesNotMatch(text, /["']/, text);
        assert.equal(hasDashes(text), false, text);
      }
    }
  });
});

describe('report words', () => {
  test('the change is dated, never vague', () => {
    assert.equal(sinceWhen(istDate('2026-08-15', 10).toISOString(), '2026-09'), 'August');
    assert.equal(sinceWhen(istDate('2025-12-15', 10).toISOString(), '2026-01'), 'December 2025');
    assert.equal(sinceWhen(istDate('2026-09-05', 10).toISOString(), '2026-09'), '5 Sep 2026');
    assert.equal(changeSince(2.6, 'August'), 'Up 3 since August');
    assert.equal(changeSince(-1, 'August'), 'Down 1 since August');
    assert.equal(changeSince(0, 'August'), 'No change since August');
    assert.equal(changeSince(null, 'August'), null);
  });

  test('quotes open after a space or bracket and close everywhere else; apostrophes curl', () => {
    assert.equal(curlyQuotes('Answer "which college is good" in Assamese.'), 'Answer “which college is good” in Assamese.');
    assert.equal(curlyQuotes('"Fees" (see "Programs").'), '“Fees” (see “Programs”).');
    assert.equal(curlyQuotes("What's working, last year's batch, 'quoted'"), 'What’s working, last year’s batch, ‘quoted’');
    assert.equal(curlyQuotes('No quotes here.'), 'No quotes here.');
  });
});
