import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { regionsFor } from '../demand/regions.ts';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { buildReport, changeSince, compactLinks, curlyQuotes, questionsLead, REPORT_LIMITS, reportTexts, sinceWhen } from './data.ts';
import { sampleReportInput as input } from './testing.ts';

// The report snapshot, from Eastgate University's sample Audit (see ./testing.ts).

describe('what goes into the monthly report', () => {
  test('short enough to read in 5 minutes: every list is capped', async () => {
    const data = buildReport(await input());
    assert.equal(data.working.length, REPORT_LIMITS.working);
    assert.equal(data.fixes.length, REPORT_LIMITS.fixesInDetail);
    assert.ok(data.moreFixes.length > 0);
    assert.deepEqual(
      [...data.fixes, ...data.moreFixes].map((fix) => fix.rank),
      Array.from({ length: data.fixes.length + data.moreFixes.length }, (_, index) => index + 1),
      'the full ranked list, in order',
    );
    assert.equal(data.rivals?.moves.length, REPORT_LIMITS.moves);
    assert.equal(data.rivals?.moreMoves, 2);
    assert.equal(data.demand?.rising.length, REPORT_LIMITS.rising);
    assert.equal(data.demand?.questions.length, REPORT_LIMITS.questions);
    assert.equal(data.demand?.ideas.length, REPORT_LIMITS.ideas);
    assert.equal(data.summary.history.length, REPORT_LIMITS.historyMonths);
    assert.equal(data.things.length, 3);
  });

  test('the cover and score summary: whole numbers, the label, and the change since the Audit before', async () => {
    const data = buildReport(await input());
    assert.equal(data.monthLabel, 'September 2026');
    assert.equal(data.madeOn, '1 Oct 2026');
    assert.equal(data.cover.change, 'Up 1 since August');
    assert.equal(data.cover.checkedOn, 'Checked 15 Sep 2026');
    assert.deepEqual(
      data.summary.pillars.map((pillar) => [pillar.name, pillar.change]),
      [
        ['Discovered', 'No change'],
        ['Trusted', 'Up 3'],
        ['Chosen', 'Down 1'],
      ],
    );
    for (const value of [data.cover.score, ...data.summary.pillars.map((pillar) => pillar.score), ...data.summary.history.map((point) => point.score)]) {
      assert.equal(Number.isInteger(value), true, String(value));
    }
    assert.deepEqual(
      data.summary.history.map((point) => point.label),
      ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    );
  });

  test('points are whole numbers in every sentence', async () => {
    const data = buildReport(await input());
    const pointTexts = reportTexts(data).filter((text) => /points?\b/.test(text));
    assert.ok(pointTexts.length > 0);
    for (const text of pointTexts) assert.doesNotMatch(text, /\d\.\d+ points?/, text);
  });

  test('a first Audit says so, and shows no pillar changes', async () => {
    const base = await input();
    const data = buildReport({ ...base, audit: { ...base.audit, previousAuditId: null, changes: { overall: null, discovered: null, trusted: null, chosen: null } } });
    assert.equal(data.cover.change, 'First Audit');
    assert.ok(data.summary.pillars.every((pillar) => pillar.change === null));
  });

  test('rivals: you and each rival, highest first, a rival not yet scored last', async () => {
    const data = buildReport(await input());
    assert.deepEqual(
      data.rivals?.rows.map((row) => [row.rank, row.name, row.you]),
      [
        [1, 'Silverline College', false],
        [2, 'Eastgate University', true],
        [3, 'Highfield University', false],
        [null, 'Newcomer College', false],
      ],
    );
    assert.match(data.rivals?.verdict ?? '', /^You’re ahead of Highfield University\. Next step: catching Silverline College/);
    // Newest first.
    assert.deepEqual(data.rivals?.moves[0], { rival: 'Silverline College', kind: 'New page', text: 'Added page 7.', date: '21 Sep 2026' });
  });

  test('Demand for the city: the top rising trends, questions and ideas, grouped', async () => {
    const data = buildReport(await input());
    assert.equal(data.demand?.place, 'Guwahati');
    assert.deepEqual(
      data.demand?.rising.map((trend) => trend.change),
      ['Up 47%', 'Up 38%', 'Up 30%'],
    );
    assert.equal(data.demand?.questions[1]?.language, 'Asked in Hindi');
    assert.equal(data.demand?.pulledOn, '28 Sep 2026');
  });

  test('the questions say which languages are shown in English: only those they were asked in', () => {
    assert.equal(questionsLead(['as', 'en', 'hi']), 'What students ask most, grouped. Hindi and Assamese questions are shown in English.');
    assert.equal(questionsLead(['en', 'hi']), 'What students ask most, grouped. Hindi questions are shown in English.');
    assert.equal(questionsLead(['en']), 'What students ask most, grouped.');
    assert.equal(questionsLead([]), 'What students ask most, grouped.');
  });

  test('by program: every program, in name order, each with the one fix that would help it most', async () => {
    const data = buildReport(await input());
    assert.deepEqual(
      data.programs.map((program) => program.name),
      ['B.Sc Data Analytics', 'B.Sc Nursing', 'BBA', 'BCA', 'MBA'],
    );
    assert.ok(data.programs.every((program) => program.topFix && program.topFixGain?.startsWith('Could add')));
    assert.equal(data.morePrograms, 0);
  });

  test('3 things to do: the biggest fix, a rivals lesson on another check, the top idea', async () => {
    const data = buildReport(await input());
    assert.deepEqual(
      data.things.map((thing) => thing.source),
      ['audit', 'rivals', 'demand'],
    );
    assert.equal(data.things[2]?.title, 'Idea 1.');
  });

  test('sources and dates: every check, one date when they share it, and where Rivals and Demand came from', async () => {
    const data = buildReport(await input());
    assert.equal(data.sources.checks.length, 17);
    assert.equal(data.sources.checkedOn, '15 Sep 2026');
    assert.ok(data.sources.checks.every((check) => check.links.length > 0));
    assert.deepEqual(
      data.sources.notes.map((note) => note.label),
      ['Audit', 'Rivals', 'Demand'],
    );
    assert.match(data.sources.notes[1]?.text ?? '', /last run 1 Sep 2026\. Moves from the weekly check of their public pages, last run 28 Sep 2026\./);
  });

  test('no rivals or no Demand yet: those sections say nothing made up', async () => {
    const data = buildReport(await input({ rivals: [], moves: [], lessons: [], demand: { region: regionsFor({ city: 'Guwahati', state: 'Assam' }).city, rows: [], pulledAt: null } }));
    assert.equal(data.rivals, null);
    assert.equal(data.demand, null);
    assert.deepEqual(
      data.sources.notes.map((note) => note.label),
      ['Audit'],
    );
    assert.ok(data.things.every((thing) => thing.source === 'audit'));
  });

  test('Paid only: one quiet line on the last page. Client never gets it', async () => {
    const paid = buildReport(await input());
    assert.equal(`${paid.contact?.text} ${paid.contact?.email}`, 'Want AdmitLabs to do this for you? hello@admitlabs.in');
    assert.equal(paid.tierLabel, 'Paid');
    const client = buildReport(await input({ tier: 'client' }));
    assert.equal(client.contact, null);
    assert.equal(reportTexts(client).some((text) => text.includes('admitlabs.in')), false);
  });

  test('curly quotes everywhere in the report, whatever the source wrote', async () => {
    const base = await input();
    const data = buildReport({
      ...base,
      lessons: [{ text: "Learn from Silverline College's top post", detail: '"A student\x27s first day" reached 48,200 views.', checkKey: null, rivalId: 'silverline' }],
      moves: [{ rivalId: 'highfield', kind: 'fee_change', description: 'Replaced MBA fee amounts with "Contact us for fees".', detectedAt: base.moves[0]?.detectedAt ?? '' }],
    });
    assert.equal(data.things[1]?.title, 'Learn from Silverline College’s top post');
    assert.equal(data.things[1]?.detail, '“A student’s first day” reached 48,200 views.');
    assert.equal(data.rivals?.moves[0]?.text, 'Replaced MBA fee amounts with “Contact us for fees”.');
    for (const tier of ['paid', 'client'] as const) {
      for (const text of reportTexts(buildReport({ ...base, tier }))) assert.doesNotMatch(text, /["']/, text);
    }
  });

  test('no dashes anywhere in the report', async () => {
    for (const tier of ['paid', 'client'] as const) {
      for (const text of reportTexts(buildReport(await input({ tier })))) assert.equal(hasDashes(text), false, text);
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

  test('sources: one link per site, and how many more pages there', () => {
    assert.deepEqual(
      compactLinks([
        'https://site.example/programs/bba',
        'https://site.example/programs/mba',
        'https://www.site.example/programs/bca/',
        'https://maps.example/place/site',
        'https://site.example/programs/bba',
      ]),
      ['maps.example/place/site', 'site.example/programs/bba and 2 more'],
    );
  });
});
