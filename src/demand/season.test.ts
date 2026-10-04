import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { seasonClock, stageWhen, type SeasonStage } from './season.ts';

// Version 1's admission year, kept here for the clock's own tests (version 2 shows the best months to post instead).
const degree: SeasonStage[] = [
  { text: 'Classes have started. Most colleges close late admissions by mid October.', stage: 'classes', from: '2026-08-01', to: '2026-10-15' },
  { text: 'Class 12 board exams run from February to March 2027.', stage: 'exams', from: '2027-02-01', to: '2027-03-31' },
  { text: 'Board results are expected in May 2027.', stage: 'results', from: '2027-05-01', to: '2027-05-31' },
  { text: 'Counselling and admissions run from May to August 2027.', stage: 'counselling', from: '2027-05-01', to: '2027-08-31' },
];
const skills: SeasonStage[] = [
  { text: 'New batches start every month. Weekend batches fill fastest from October to December.', stage: 'batches', from: '2026-10-01', to: '2026-12-31' },
  { text: 'Class 12 board exams run from February to March 2027. Enquiries dip in these months.', stage: 'exams', from: '2027-02-01', to: '2027-03-31' },
  { text: 'Enquiries peak in the weeks after board results in May 2027.', stage: 'results', from: '2027-05-01', to: '2027-06-30' },
];

describe('the season clock', () => {
  test('where the admission year is now, and what comes next', () => {
    const clock = seasonClock(degree, istDate('2026-09-30', 12));
    assert.equal(clock.now?.stage, 'classes');
    assert.equal(clock.next?.stage, 'exams');
  });

  test('the months ahead, from this one, with the stage running now marked', () => {
    const clock = seasonClock(degree, istDate('2026-09-30', 12));
    assert.equal(clock.months.length, 12);
    assert.deepEqual(
      clock.months.slice(0, 7).map((month) => [month.label, month.phase]),
      [
        ['Sep', 'now'],
        ['Oct', 'now'],
        ['Nov', 'none'],
        ['Dec', 'none'],
        ['Jan', 'none'],
        ['Feb', 'later'],
        ['Mar', 'later'],
      ],
    );
    assert.equal(clock.months[0]?.current, true);
    assert.equal(clock.months[1]?.current, false);
  });

  test('a quiet stretch has no stage now', () => {
    const clock = seasonClock(degree, istDate('2026-11-10', 12));
    assert.equal(clock.now, null);
    assert.equal(clock.next?.stage, 'exams');
    assert.equal(clock.months[0]?.phase, 'none');
  });

  test('skilling courses run in rolling batches', () => {
    const clock = seasonClock(skills, istDate('2026-10-10', 12));
    assert.equal(clock.now?.stage, 'batches');
    assert.equal(clock.next?.stage, 'exams');
  });

  test('when a stage runs, in words', () => {
    assert.equal(stageWhen({ from: '2027-02-01', to: '2027-03-31' }), 'Feb to Mar 2027');
    assert.equal(stageWhen({ from: '2027-05-01', to: '2027-05-31' }), 'May 2027');
    assert.equal(stageWhen({ from: '2026-10-01', to: '2027-01-31' }), 'Oct 2026 to Jan 2027');
  });
});
