import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checkAdEntry } from './ads.ts';

const TRACKED = ['rival-1', 'rival-2'];
const TODAY = '2026-09-30';

describe('a rival ad entered by the team', () => {
  test('a good entry, with quote marks taken off (the page adds its own)', () => {
    const { entry, errors } = checkAdEntry({ rival: 'rival-1', promise: '  "100% placement support for every BBA student."  ', source: 'https://ads.example/library/1', seenOn: '2026-09-05' }, TRACKED, TODAY);
    assert.deepEqual(errors, {});
    assert.deepEqual(entry, { rival: 'rival-1', promise: '100% placement support for every BBA student.', sourceUrl: 'https://ads.example/library/1', seenOn: '2026-09-05' });
  });

  test('a link without https gets it', () => {
    assert.equal(checkAdEntry({ rival: 'rival-2', promise: 'Scholarships for early applicants.', source: 'ads.example/library/2', seenOn: TODAY }, TRACKED, TODAY).entry?.sourceUrl, 'https://ads.example/library/2');
  });

  test('only tracked rivals, a real promise, a link and a date that has passed', () => {
    const { entry, errors } = checkAdEntry({ rival: 'somebody', promise: 'Hi', source: 'not a link', seenOn: '2026-10-02' }, TRACKED, TODAY);
    assert.equal(entry, null);
    assert.deepEqual(Object.keys(errors).sort(), ['promise', 'rival', 'seenOn', 'source']);
    assert.equal(errors.seenOn, 'The date cannot be in the future.');
  });

  test('the main promise only', () => {
    assert.ok(checkAdEntry({ rival: 'rival-1', promise: 'x'.repeat(201), source: 'https://ads.example/1', seenOn: TODAY }, TRACKED, TODAY).errors.promise);
  });
});
