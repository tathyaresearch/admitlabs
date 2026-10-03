import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { istDate } from '../domain/dates.ts';
import { SAMPLE_MOVES } from '../sample/rivals.ts';
import { admissionPushText, LEAD_WORDS, MOVE_KIND_LABELS, moveNotice, reviewTrendNote, STANDING_LABELS, suggestionReason } from './text.ts';

describe('why a rival is suggested', () => {
  test('city first, then state, with the shared programs', () => {
    assert.equal(suggestionReason(true, ['BBA', 'B.Com'], 'Assam'), 'Same city. Shared programs: BBA and B.Com.');
    assert.equal(suggestionReason(false, ['MBA'], 'Assam'), 'Same state, Assam. Shared program: MBA.');
    assert.equal(suggestionReason(true, ['BBA', 'BCA', 'B.Com'], 'Assam'), 'Same city. Shared programs: BBA, BCA and B.Com.');
  });
});

describe('the alert for a new move', () => {
  test('reads as one sentence about the rival', () => {
    assert.equal(
      moveNotice('Silverline College', 'Announced 2027 admission dates. Forms open on 5 January 2027.'),
      'Silverline College announced 2027 admission dates. Forms open on 5 January 2027.',
    );
    assert.equal(moveNotice('Northbank College', 'Now shows BCA fees as a yearly range.'), 'Northbank College now shows BCA fees as a yearly range.');
  });

  test('an acronym at the start keeps its capitals', () => {
    assert.equal(moveNotice('Eastgate University', 'MBA fees are now on the program page.'), 'Eastgate University MBA fees are now on the program page.');
  });

  test('every sample move makes a clean alert', () => {
    for (const move of SAMPLE_MOVES) {
      const text = moveNotice('A Rival', move.description);
      assert.match(text, /^A Rival [a-z]/, text);
      assert.equal(hasDashes(text), false, text);
    }
  });
});

describe('the review trend and the admission push, in words', () => {
  const point = (rating: number | null, reviewCount: number) => ({ checkedAt: '2026-09-01T04:30:00.000Z', rating, reviewCount });

  test('better, worse, steady and not yet a trend', () => {
    assert.equal(reviewTrendNote({ direction: 'better', latest: point(4.4, 212), previous: point(4.3, 200) }), 'Getting better, up from 4.3.');
    assert.equal(reviewTrendNote({ direction: 'worse', latest: point(4, 90), previous: point(4.2, 88) }), 'Getting worse, down from 4.2.');
    assert.equal(reviewTrendNote({ direction: 'steady', latest: point(4.3, 69), previous: point(4.3, 66) }), 'Steady, the same as last month.');
    assert.equal(reviewTrendNote({ direction: 'unknown', latest: point(4.1, 1), previous: null }), "The trend shows after next month's check.");
    assert.equal(reviewTrendNote({ direction: 'unknown', latest: null, previous: null }), 'Drishti looks at their Google profile at every monthly check.');
  });

  test('admission push', () => {
    assert.equal(admissionPushText(istDate('2026-09-20', 9).toISOString()), 'Started 20 Sep 2026');
    assert.equal(admissionPushText(null), 'Not seen yet');
  });
});

describe('labels', () => {
  test('plain words, no dashes', () => {
    for (const text of [...Object.values(MOVE_KIND_LABELS), ...Object.values(STANDING_LABELS), ...Object.values(LEAD_WORDS)]) {
      assert.equal(hasDashes(text), false, text);
      assert.match(text, /^[A-Z]/, text);
    }
  });

  test('ahead or behind is always said from your side', () => {
    assert.equal(STANDING_LABELS.ahead, 'Ahead of you');
    assert.equal(STANDING_LABELS.behind, 'Behind you');
  });
});
