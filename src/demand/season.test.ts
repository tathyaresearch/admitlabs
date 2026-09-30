import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { SEASON_DEGREE, SEASON_SKILLS } from '../sample/demand.ts';
import { seasonClock, stageWhen, type SeasonStage } from './season.ts';

const degree: SeasonStage[] = SEASON_DEGREE.map(({ stage, text, from, to }) => ({ stage, text, from, to }));
const skills: SeasonStage[] = SEASON_SKILLS.map(({ stage, text, from, to }) => ({ stage, text, from, to }));

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
