import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { DemandKind, Language } from '../domain/types.ts';
import { demandView, type DemandRow } from './view.ts';

let next = 0;
function row(programKey: string, kind: DemandKind, text: string, extra: Partial<DemandRow> = {}): DemandRow {
  next += 1;
  return {
    id: `row-${next}`,
    programKey,
    programName: programKey.toUpperCase(),
    month: '2026-09',
    kind,
    text,
    language: 'en' as Language,
    count: 0,
    changePct: null,
    rank: null,
    sourceUrl: `https://reddit.example/${next}`,
    foundAt: '2026-09-28T00:30:00.000Z',
    meta: {},
    ...extra,
  };
}

const ROWS: DemandRow[] = [
  row('bba', 'rising', 'BBA in Analytics', { count: 400, changePct: 38, meta: { platform: 'trends' } }),
  row('bca', 'rising', 'BCA with AI', { count: 350, changePct: 47, meta: { platform: 'trends' } }),
  row('bba', 'falling', 'General BBA', { count: 500, changePct: -12 }),
  row('bca', 'falling', 'Hardware diploma', { count: 170, changePct: -18 }),
  row('bba', 'question', 'Which BBA college has placements?', { count: 96, meta: { platform: 'quora' } }),
  row('bca', 'question', 'Job after BCA without MCA?', { count: 83, language: 'hi', meta: { platform: 'youtube' } }),
  row('bca', 'question', 'Which BCA college teaches coding?', { count: 79, meta: { platform: 'reddit' } }),
  row('bba', 'worry', 'Fees and hidden charges', { count: 140, meta: { theme: 'fees' } }),
  row('bca', 'worry', 'Fees and hidden charges', { count: 92, meta: { theme: 'fees' } }),
  row('bba', 'worry', 'Placements that are real', { count: 128, meta: { theme: 'placements' } }),
  row('bca', 'worry', 'Placements that are real', { count: 117, meta: { theme: 'placements' } }),
  row('bba', 'worry', 'Hostel quality and cost', { count: 66, meta: { theme: 'hostel' } }),
  row('bca', 'worry', 'Outdated syllabus', { count: 33, meta: { theme: 'new', isNew: true } }),
  row('bba', 'idea', 'Show real placements', { rank: 1, meta: { basedOn: 'Which BBA college has placements?' } }),
  row('bca', 'idea', 'Film a coding session', { rank: 1, meta: { basedOn: 'Which BCA college teaches coding?' } }),
  row('bca', 'idea', 'Three graduates without an MCA', { rank: 2, meta: { basedOn: 'Job after BCA without MCA?' } }),
  row('bba', 'season', 'Classes have started.', { meta: { stage: 'classes', from: '2026-08-01', to: '2026-10-15' } }),
  row('bca', 'season', 'New batches start every month.', { meta: { stage: 'batches', from: '2026-10-01', to: '2026-12-31' } }),
  row('bba', 'rising', 'Old month trend', { count: 10, changePct: 5, month: '2026-08' }),
];

describe('the Demand page, all programs together', () => {
  const view = demandView(ROWS, { singleProgram: false, skills: false });

  test('trends ranked across programs, the fastest rise first', () => {
    assert.equal(view.topTrend?.text, 'BCA with AI');
    assert.deepEqual(
      view.rising.map((item) => item.text),
      ['BCA with AI', 'BBA in Analytics', 'Old month trend'],
    );
    assert.deepEqual(
      view.falling.map((item) => item.text),
      ['Hardware diploma', 'General BBA'],
    );
  });

  test('questions ranked by how often they were asked', () => {
    assert.deepEqual(
      view.questions.map((item) => item.count),
      [96, 83, 79],
    );
  });

  test('the usual worries add up across programs; new ones stay on their own', () => {
    assert.deepEqual(
      view.worries.map((item) => [item.text, item.count, item.programs.join(', '), item.isNew]),
      [
        ['Placements that are real', 245, 'BBA, BCA', false],
        ['Fees and hidden charges', 232, 'BBA, BCA', false],
        ['Hostel quality and cost', 66, 'BBA', false],
        ['Outdated syllabus', 33, 'BCA', true],
      ],
    );
    assert.deepEqual(view.asksMost, ['placements', 'fees']);
  });

  test('content ideas built on the most asked questions first, each with its question', () => {
    assert.deepEqual(
      view.ideas.map((idea) => [idea.text, idea.question?.count]),
      [
        ['Show real placements', 96],
        ['Three graduates without an MCA', 83],
        ['Film a coding session', 79],
      ],
    );
  });

  test('the season follows the institution type', () => {
    assert.equal(view.season[0]?.stage, 'classes');
    assert.equal(demandView(ROWS, { singleProgram: false, skills: true }).season[0]?.stage, 'batches');
  });

  test('the newest month, the sources and the languages', () => {
    assert.equal(view.month, '2026-09');
    assert.deepEqual(view.platforms, ['quora', 'reddit', 'trends', 'youtube']);
    assert.deepEqual(view.languages, ['en', 'hi']);
  });
});

describe('one program', () => {
  test('its ideas keep their own order', () => {
    const view = demandView(
      ROWS.filter((item) => item.programKey === 'bca'),
      { singleProgram: true, skills: false },
    );
    assert.deepEqual(
      view.ideas.map((idea) => idea.text),
      ['Film a coding session', 'Three graduates without an MCA'],
    );
    assert.equal(view.worries.find((worry) => worry.theme === 'fees')?.count, 92);
  });

  test('nothing found gives an empty page, not an error', () => {
    const view = demandView([], { singleProgram: true, skills: false });
    assert.equal(view.topTrend, null);
    assert.equal(view.month, null);
    assert.deepEqual(view.season, []);
  });
});
