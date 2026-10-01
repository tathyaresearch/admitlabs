import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SAMPLE_REPORT_NOTE } from '../report/data.ts';
import { SAMPLE_INSTITUTIONS } from '../sample/index.ts';
import { loadShowcase } from './showcase.ts';

// What the product page shows: one fictional institution in the sample report's month, so the
// previews agree with the PDF the page offers.

describe('the product page previews', () => {
  test('built once, from the sample world', async () => {
    const first = loadShowcase();
    assert.equal(loadShowcase(), first, 'the same promise every time');
    const showcase = await first;
    assert.equal(showcase.institution.name, 'Eastgate University');
  });

  test('the Audit, rivals and Demand all agree with the sample report', async () => {
    const { audit, rivals, demand, report } = await loadShowcase();
    assert.equal(audit.scores.overall, report.cover.score);
    assert.equal(audit.changes.overall, 1);
    assert.equal(audit.fixes.length > 3, true);
    assert.deepEqual(
      rivals.rows.map((row) => [row.name, row.overall, row.you]),
      [
        ['Silverline College', 74, false],
        ['Eastgate University', 73, true],
        ['Highfield University', 52, false],
        ['Northbank College', 45, false],
      ],
    );
    assert.equal(rivals.verdict, report.rivals?.verdict.replaceAll('’', "'"));
    assert.ok(rivals.moves.length > 0 && rivals.moves.every((move) => move.detectedAt.startsWith('2026-08')));
    assert.equal(demand.place, 'Guwahati');
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

  test('only fictional sample institutions appear', async () => {
    const { institution, rivals } = await loadShowcase();
    const names = new Set(SAMPLE_INSTITUTIONS.map((sample) => sample.name));
    for (const name of [institution.name, ...rivals.names.values()]) assert.ok(names.has(name), name);
  });
});
