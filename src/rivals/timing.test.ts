import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { istDate } from '../domain/dates.ts';
import { admissionPush, reviewTrend, type MoveFact } from './timing.ts';

const move = (kind: MoveFact['kind'], day: string, description = 'A move.'): MoveFact => ({
  kind,
  description,
  detectedAt: istDate(day, 9).toISOString(),
  sourceUrl: 'https://rival.example/admissions',
});

describe('when the admission push started', () => {
  const now = istDate('2026-09-30', 12);

  test('the latest announcement of admission dates this season', () => {
    const push = admissionPush(
      [
        move('admission_dates', '2026-03-10', 'Last season.'),
        move('fee_change', '2026-09-25'),
        move('admission_dates', '2026-09-20', 'Announced 2027 admission dates.'),
        move('admission_dates', '2026-08-02', 'Opened early applications.'),
      ],
      now,
    );
    assert.equal(push?.description, 'Announced 2027 admission dates.');
  });

  test('none when no dates were announced, or only long ago', () => {
    assert.equal(admissionPush([move('new_page', '2026-09-20')], now), null);
    assert.equal(admissionPush([move('admission_dates', '2025-12-01')], now), null);
  });

  test('a move after today does not count', () => {
    assert.equal(admissionPush([move('admission_dates', '2026-10-05')], now), null);
  });
});

describe('the review trend: better or worse', () => {
  const point = (day: string, rating: number | null, reviewCount = 100) => ({ checkedAt: istDate(day, 10).toISOString(), rating, reviewCount });

  test('from the last two rival Audits, newest first whatever the order given', () => {
    const trend = reviewTrend([point('2026-08-01', 4.1), point('2026-09-01', 4.3, 120), point('2026-07-01', 4.4)]);
    assert.equal(trend.direction, 'better');
    assert.equal(trend.latest?.rating, 4.3);
    assert.equal(trend.previous?.rating, 4.1);
  });

  test('worse, and steady when the rating is the same', () => {
    assert.equal(reviewTrend([point('2026-09-01', 4.0), point('2026-08-01', 4.2)]).direction, 'worse');
    assert.equal(reviewTrend([point('2026-09-01', 4.2, 130), point('2026-08-01', 4.2, 120)]).direction, 'steady');
  });

  test('rounding noise below 0.1 is steady', () => {
    assert.equal(reviewTrend([point('2026-09-01', 4.3), point('2026-08-01', 4.26)]).direction, 'steady');
  });

  test('one reading is not a trend yet, and no rating is left out', () => {
    assert.equal(reviewTrend([point('2026-09-01', 4.3)]).direction, 'unknown');
    assert.equal(reviewTrend([]).direction, 'unknown');
    assert.equal(reviewTrend([point('2026-09-01', 4.3), point('2026-08-01', null, 0)]).direction, 'unknown');
  });
});
