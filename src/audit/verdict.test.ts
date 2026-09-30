import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import { PILLARS } from '../domain/types.ts';
import { auditVerdict } from './verdict.ts';

const v = (discovered: number, trusted: number, chosen: number) => auditVerdict({ discovered, trusted, chosen });

describe('the verdict: strength first, then the next step', () => {
  test('the sample institutions', () => {
    assert.equal(v(79, 69, 70), 'Students can find you. Next step: earning their trust.'); // Eastgate
    assert.equal(v(44, 44, 50), 'Room to grow in all three: being found, trusted and chosen.'); // Northbank BBA
    assert.equal(v(55, 61, 72), 'Students find it easy to choose you. Next step: being easier to find.'); // Brightpath
    assert.equal(v(73, 72, 76), 'Students can find you, trust you and choose you. Next step: keeping it that way.'); // Silverline
    assert.equal(v(62, 48, 42), 'Your strongest area is being found. Next step: making it easy to choose you.'); // Cedar
    assert.equal(v(28, 29, 24), 'Room to grow in all three: being found, trusted and chosen.'); // Riverbend
  });

  test('every pairing of strongest and weakest pillar reads as a strength and a next step', () => {
    const scores = { discovered: 50, trusted: 50, chosen: 50 };
    for (const best of PILLARS) {
      for (const weakest of PILLARS) {
        if (best === weakest) continue;
        for (const top of [75, 60]) {
          const pillars = { ...scores, [best]: top, [weakest]: 30 };
          const text = auditVerdict(pillars);
          assert.match(text, /^(Students|Your strongest area)/, text);
          assert.match(text, / Next step: [a-z].+\.$/, text);
          assert.equal(hasDashes(text), false, text);
          assert.doesNotMatch(text, /fail|poor|bad|weak/i, text);
        }
      }
    }
  });

  test('a strongest pillar that is not Strong yet is named as the strongest area', () => {
    assert.equal(v(66, 44, 50), 'Your strongest area is being found. Next step: earning their trust.');
    assert.equal(v(40, 69, 55), 'Your strongest area is being trusted. Next step: being easier to find.');
  });

  test('pillars within 10 points count as level; 10 apart singles one out', () => {
    assert.equal(v(60, 51, 55), 'Room to grow in all three: being found, trusted and chosen.');
    assert.equal(v(60, 50, 55), 'Your strongest area is being found. Next step: earning their trust.');
  });

  test('ties go to spec order: Discovered, then Trusted, then Chosen', () => {
    assert.equal(v(72, 72, 40), 'Students can find you. Next step: making it easy to choose you.');
    assert.equal(v(80, 50, 50), 'Students can find you. Next step: earning their trust.');
  });
});
