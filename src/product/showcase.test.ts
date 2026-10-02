import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { reportTexts, SAMPLE_REPORT_NOTE } from '../report/data.ts';
import { sampleReportData } from '../sample/report.ts';
import { CITY, DASHBOARD, INSTITUTION, OTHERS } from '../site/scenes.ts';
import { asLarkmoor } from './larkmoor.ts';
import { loadShowcase } from './showcase.ts';

// What the product page shows: one fictional institution in the sample report's month, so the
// previews agree with the PDF the page offers, under the website's names.

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
const SAMPLE_WORLD = /eastgate|silverline|highfield|northbank|guwahati|gauhati|dispur|assam|six mile|gs road|781\d{3}|[ऀ-ॿঀ-৿]/i;

describe('the product page previews', () => {
  test('built once, from the sample world', async () => {
    const first = loadShowcase();
    assert.equal(loadShowcase(), first, 'the same promise every time');
    const showcase = await first;
    assert.equal(showcase.institution.name, 'Larkmoor University');
    assert.equal(showcase.institution.city, 'Bangalore');
  });

  test('the Audit, rivals and Demand all agree with the sample report', async () => {
    const { audit, rivals, demand, report } = await loadShowcase();
    assert.equal(audit.scores.overall, report.cover.score);
    assert.equal(audit.changes.overall, 1);
    assert.equal(audit.fixes.length > 3, true);
    assert.deepEqual(
      rivals.rows.map((row) => [row.name, row.overall, row.you]),
      [
        ['Calderwood College', 74, false],
        ['Larkmoor University', 73, true],
        ['Brackenfield University', 52, false],
        ['Thornbury College', 45, false],
      ],
    );
    assert.equal(rivals.verdict, report.rivals?.verdict.replaceAll('’', "'"));
    assert.ok(rivals.moves.length > 0 && rivals.moves.every((move) => move.detectedAt.startsWith('2026-08')));
    assert.equal(demand.place, 'Bangalore');
    assert.ok(demand.view.topTrend);
    assert.ok(demand.view.ideas.length >= 3);
    assert.equal(report.sample, SAMPLE_REPORT_NOTE);
  });

  test('the feature pictures: every rival on each pillar, and the fastest rise month by month', async () => {
    const { rivals, demand } = await loadShowcase();
    assert.deepEqual(
      rivals.spread.map((row) => [row.pillar, row.rank, row.of]),
      [
        ['discovered', 1, 4],
        ['trusted', 2, 4],
        ['chosen', 2, 4],
      ],
    );
    assert.deepEqual(
      demand.topHistory.map((point) => point.month),
      ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
      'every pull up to the report month, oldest first',
    );
    assert.equal(demand.topHistory.at(-1)?.count, demand.view.topTrend?.count, 'the newest month is the one the tile names');
  });

  test("the website's names and numbers: Larkmoor University, Bangalore, and its three rivals", async () => {
    const { institution, audit, rivals, demand } = await loadShowcase();
    assert.equal(institution.name, INSTITUTION.name);
    assert.equal(demand.place, CITY);
    assert.deepEqual([...rivals.names.values()].sort(), Object.values(OTHERS).map((other) => other.name).sort());
    assert.equal(audit.scores.overall, DASHBOARD.score.overall);
    assert.deepEqual(
      DASHBOARD.pillars.map((pillar) => pillar.value),
      [audit.scores.discovered, audit.scores.trusted, audit.scores.chosen],
    );
    assert.deepEqual(
      rivals.rows.map((row) => row.overall),
      DASHBOARD.rivals.rows.map((row) => row.score),
    );
  });

  test("nothing of the sample world's names or places is left, on the page or in the PDF", async () => {
    const showcase = await loadShowcase();
    for (const text of [...words(showcase), ...reportTexts(showcase.report)]) assert.doesNotMatch(text, SAMPLE_WORLD, text);
    // The renaming only changes words: the sample report's numbers are the PDF's.
    const sample = await sampleReportData();
    assert.equal(showcase.report.cover.score, sample.cover.score);
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
