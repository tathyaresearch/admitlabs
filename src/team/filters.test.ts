import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { filtersQuery, hasFilters, NO_FILTERS, pageRange, parseFilters, scoreRange, searchPattern } from './filters.ts';

describe('the team list filters, read from the address', () => {
  test('known values are kept; anything else is ignored', () => {
    const filters = parseFilters({ q: ' north ', type: 'college', status: 'prospect', tier: 'client', score: 'weak', sort: 'score', page: '2', city: 'Guwahati' });
    assert.deepEqual(filters, { q: 'north', type: 'college', city: 'Guwahati', state: null, status: 'prospect', tier: 'client', score: 'weak', sort: 'score', page: 2 });
    // Needs attention is the default order; the address leaves it out.
    assert.equal(parseFilters({}).sort, 'attention');
    assert.equal(filtersQuery(parseFilters({ sort: 'name' })), '?sort=name');
    assert.equal(parseFilters({ tier: 'paid_ending' }).tier, 'paid_ending');
    assert.deepEqual(parseFilters({ type: 'school', status: 'x', sort: 'bad', page: '-4' }), NO_FILTERS);
    assert.equal(hasFilters(NO_FILTERS), false);
    assert.equal(hasFilters(filters), true);
  });

  test('links keep the filters and leave out the defaults', () => {
    const filters = parseFilters({ q: 'north', status: 'prospect' });
    assert.equal(filtersQuery(filters), '?q=north&status=prospect');
    assert.equal(filtersQuery(filters, { page: 3 }), '?q=north&status=prospect&page=3');
    assert.equal(filtersQuery(NO_FILTERS), '');
  });

  test('score bands come from the scoring config', () => {
    assert.deepEqual(scoreRange('strong'), { min: 70, max: 100 });
    assert.deepEqual(scoreRange('okay'), { min: 40, max: 69 });
    assert.deepEqual(scoreRange('weak'), { min: 0, max: 39 });
  });

  test('a search never changes the filter itself', () => {
    assert.equal(searchPattern('north,(bank)*'), '"*north bank*"');
    assert.equal(searchPattern('   '), null);
  });

  test('pages of 50', () => {
    assert.deepEqual(pageRange(1), { from: 0, to: 49 });
    assert.deepEqual(pageRange(3), { from: 100, to: 149 });
  });
});
