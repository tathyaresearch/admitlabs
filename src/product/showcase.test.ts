import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CHECKS, checksForPillar } from '../domain/checks.ts';
import { PILLARS } from '../domain/types.ts';
import { reportTexts, SAMPLE_REPORT_NOTE } from '../report/data.ts';
import { sampleReportData } from '../sample/report.ts';
import { CITY, DASHBOARD, INSTITUTION, OTHERS } from '../site/scenes.ts';
import { asLarkmoor } from './larkmoor.ts';
import { loadShowcase, topQuestions } from './showcase.ts';

// What the product page shows: one fictional institution in the sample report's month, as Paid sees
// it, so the pictures agree with the PDF the page offers, under the website's names.

/** Every word in plain data. */
function words(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value instanceof Date) return [];
  if (value instanceof Map) return [...value.values()].flatMap(words);
  if (Array.isArray(value)) return value.flatMap(words);
  if (value && typeof value === 'object') return Object.values(value).flatMap(words);
  return [];
}

/** The sample world's names and places, and the scripts of its Hindi and Assamese questions. */
const SAMPLE_WORLD = /eastgate|silverline|highfield|northbank|guwahati|gauhati|dispur|assam|six mile|gs road|781\d{3}|[\u0900-\u097F\u0980-\u09FF]/i;

describe('the product page pictures', () => {
  test('built once, from the sample world', async () => {
    const first = loadShowcase();
    assert.equal(loadShowcase(), first, 'the same promise every time');
    const showcase = await first;
    assert.equal(showcase.institution.name, 'Larkmoor University');
    assert.equal(showcase.institution.city, 'Bangalore');
  });

  test('the three words, rivals and Demand all agree with the sample report', async () => {
    const { audit, answer, things, rivals, demand, report } = await loadShowcase();
    assert.deepEqual(
      audit.words.map((word) => [word.name, word.word]),
      report.words.map((word) => [word.name, word.word]),
    );
    assert.equal(answer, report.answer);
    assert.deepEqual(
      things.map((thing) => thing.title),
      report.summary.lines.things,
    );
    assert.equal(rivals.line, report.rivals?.line);
    assert.deepEqual(
      rivals.view.ranking.map((row) => [row.name, row.overall]),
      report.rivals?.ranking.map((row) => [row.name, row.overall]),
    );
    assert.deepEqual(
      demand.picks.map((pick) => pick.idea.title),
      report.demand?.picks.map((pick) => pick.title),
    );
    assert.equal(report.sample, SAMPLE_REPORT_NOTE);
  });

  test('Home: the one line, the three words, 3 things from the three features, the rivals’ line and the fastest rise', async () => {
    const { audit, answer, things, rivals, demand } = await loadShowcase();
    assert.deepEqual(
      audit.words.map((word) => [word.name, word.word]),
      [
        ['Visibility', 'Strong'],
        ['Trust', 'Okay'],
        ['Chosen', 'Strong'],
      ],
    );
    assert.equal(answer, 'Students can find you. Next step: earning their trust.');
    assert.deepEqual(
      things.map((thing) => thing.source),
      ['audit', 'rivals', 'demand'],
    );
    assert.equal(rivals.line, 'This month, Calderwood College is ahead on placement proof and Instagram.');
    assert.ok(rivals.latest?.detectedAt.startsWith('2026-08'));
    assert.equal(demand.highlight?.text, 'BCA with AI and Machine Learning');
    assert.equal(demand.highlight?.count, 350);
    assert.deepEqual(
      demand.history.map((point) => point.month),
      ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
      'every pull up to the report month, oldest first',
    );
    assert.equal(demand.history.at(-1)?.count, demand.highlight?.count, 'the newest month is the one the card names');
  });

  test('the feature pictures: the places with what to fix first, the ranking place by place, Make these 3', async () => {
    const { audit, rivals, demand } = await loadShowcase();
    assert.equal(audit.topFixes.length, 3);
    assert.deepEqual(
      audit.places.map((place) => place.name),
      ['Website', 'Google', 'Social media', 'What people say', 'Other places'],
    );
    assert.ok(audit.places.find((place) => place.key === 'google')?.found.every((row) => row.proof?.url && row.proof.date));
    assert.deepEqual(
      rivals.view.ranking.map((row) => [row.place, row.name, row.overall, row.you]),
      [
        [1, 'Calderwood College', 77, false],
        [2, 'Larkmoor University', 73, true],
        [3, 'Brackenfield University', 52, false],
        [4, 'Thornbury College', 45, false],
      ],
    );
    assert.equal(rivals.view.places.length, 5);
    assert.equal(rivals.opened, 'google');
    assert.equal(demand.picks.length, 3);
    assert.ok(demand.signals.trends.filter((trend) => trend.kind === 'rising').length >= 5);
  });

  test('How Drishti reads you: every check under its word, in its place, with the result its weakest program earned', async () => {
    const { audit } = await loadShowcase();
    const found = new Map(audit.places.flatMap((place) => place.found).flatMap((row) => (row.checkKey ? [[row.checkKey, row] as const] : [])));
    for (const pillar of PILLARS) {
      for (const check of checksForPillar(pillar)) assert.ok(found.get(check.key)?.result, check.key);
    }
    assert.equal(found.size, CHECKS.length);
    // A check made for each program shows its weakest: Placements is missing for one program.
    assert.equal(found.get('placement_proof')?.result, 'missing');
  });

  test('the problem card: the three words, its place among its rivals, what students ask most and the program rising fastest', async () => {
    const { rivals, demand } = await loadShowcase();
    assert.equal(rivals.view.ranking.find((row) => row.you)?.place, 2);
    assert.equal(rivals.view.ranking.length, 4);
    // The three questions asked most, most first, each with where it was asked.
    const asked = topQuestions(demand.signals, 3);
    assert.deepEqual(
      asked.map((question) => question.count),
      [96, 91, 88],
    );
    assert.ok(asked.every((question) => question.site === 'Quora'));
    assert.equal(demand.place, 'Bangalore');
  });

  test("the website's window agrees: Larkmoor University, Bangalore, its words, things, rivals and the fastest rise", async () => {
    const { institution, audit, answer, things, rivals, demand } = await loadShowcase();
    assert.equal(institution.name, INSTITUTION.name);
    assert.equal(demand.place, CITY);
    assert.deepEqual(rivals.view.ranking.filter((row) => !row.you).map((row) => row.name).sort(), Object.values(OTHERS).map((other) => other.name).sort());
    assert.deepEqual(
      DASHBOARD.words.items.map((item) => [item.name, item.word, item.value, item.fix]),
      audit.words.map((word) => [word.name, word.word, word.score, word.fixFirst?.name]),
    );
    assert.equal(DASHBOARD.words.answer, answer);
    assert.deepEqual(
      DASHBOARD.things.items.map((item) => item.title),
      things.map((thing) => thing.title),
    );
    assert.deepEqual(
      DASHBOARD.rivals.rows.map((row) => row.score),
      rivals.view.ranking.map((row) => row.overall),
    );
    assert.equal(DASHBOARD.rivals.line, rivals.line);
    assert.equal(DASHBOARD.demand.topic, demand.highlight?.text);
    assert.equal(DASHBOARD.demand.searches, demand.highlight?.count);
    assert.deepEqual(
      DASHBOARD.demand.months.map((month) => month.value),
      demand.history.map((point) => point.count),
    );
  });

  test("nothing of the sample world's names or places is left, on the page or in the PDF", async () => {
    const showcase = await loadShowcase();
    for (const text of [...words(showcase), ...reportTexts(showcase.report)]) assert.doesNotMatch(text, SAMPLE_WORLD, text);
    // The renaming only changes words: the sample report's numbers are the PDF's.
    const sample = await sampleReportData();
    assert.equal(showcase.report.score.overall, sample.score.overall);
    assert.deepEqual(asLarkmoor(sample), showcase.report);
  });

  test('the renaming keeps dates, maps and their keys, and longer names first', () => {
    const when = new Date('2026-08-15T00:00:00Z');
    const names = new Map([['eastgate-id', 'Eastgate University']]);
    const out = asLarkmoor({ when, names, list: ['Asked in Assamese', 'MBA colleges in Assam', 'eastgate-university.example'] });
    assert.equal(out.when, when);
    assert.deepEqual([...out.names], [['eastgate-id', 'Larkmoor University']]);
    assert.deepEqual(out.list, ['Asked in Kannada', 'MBA colleges in Karnataka', 'larkmoor-university.example']);
  });
});
