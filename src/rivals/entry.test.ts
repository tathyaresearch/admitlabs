import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { checkRivalEntry, type RivalEntryFields } from './entry.ts';

const CONTEXT = { ownPrograms: ['p-bba', 'p-bca'], ownWebsite: 'https://northbank-college.example' };

const fields = (patch: Partial<RivalEntryFields> = {}): RivalEntryFields => ({
  name: 'Riverside College',
  type: 'college',
  city: 'Guwahati',
  state: 'Assam',
  website: 'www.riverside-college.example/',
  instagram: '@RiversideCollege',
  programs: ['p-bba'],
  ...patch,
});

describe('a rival added by hand', () => {
  test('a good entry is tidied', () => {
    const { entry, errors } = checkRivalEntry(fields({ name: '  Riverside   College ' }), CONTEXT);
    assert.deepEqual(errors, {});
    assert.deepEqual(entry, {
      name: 'Riverside College',
      type: 'college',
      city: 'Guwahati',
      state: 'Assam',
      website: 'https://www.riverside-college.example',
      instagram: 'riversidecollege',
      programs: ['p-bba'],
    });
  });

  test('Instagram is optional', () => {
    assert.equal(checkRivalEntry(fields({ instagram: '  ' }), CONTEXT).entry?.instagram, null);
    assert.ok(checkRivalEntry(fields({ instagram: 'not a handle!' }), CONTEXT).errors.instagram);
  });

  test('each field says what to do', () => {
    const { entry, errors } = checkRivalEntry(fields({ name: 'R', type: 'school', city: 'Nowhere', website: 'riverside', programs: [] }), CONTEXT);
    assert.equal(entry, null);
    assert.deepEqual(Object.keys(errors).sort(), ['city', 'name', 'programs', 'type', 'website']);
    assert.equal(errors.programs, 'Tick at least one program they also offer.');
  });

  test('programs must be your own', () => {
    const { entry, errors } = checkRivalEntry(fields({ programs: ['p-someone-else'] }), CONTEXT);
    assert.equal(entry, null);
    assert.ok(errors.programs);
  });

  test('not your own website, and not one already in the list', () => {
    assert.equal(checkRivalEntry(fields({ website: 'http://www.northbank-college.example/about' }), CONTEXT).errors.website, 'That is your own website.');
    assert.equal(
      checkRivalEntry(fields(), { ...CONTEXT, listed: ['https://riverside-college.example'] }).errors.website,
      'This one is already in your list.',
    );
  });

  test('dashes typed in a name become plain hyphens', () => {
    const name = `Riverside ${String.fromCharCode(0x2014)} College`;
    assert.equal(checkRivalEntry(fields({ name }), CONTEXT).entry?.name, 'Riverside - College');
  });
});
