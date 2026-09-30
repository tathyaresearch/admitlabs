import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LISTED_PROGRAMS, PROGRAM_GROUPS } from '../config/programs.ts';
import { SAMPLE_INSTITUTIONS } from '../sample/institutions.ts';
import { hasDashes } from './copy.ts';
import {
  checkCity,
  checkFacebook,
  checkInstagram,
  checkInstitution,
  checkLinkedin,
  checkName,
  checkPrograms,
  checkWebsite,
  checkYoutube,
  tidyText,
  websiteHost,
} from './onboarding.ts';

const value = <T>(check: { ok: true; value: T } | { ok: false; error: string }) => (check.ok ? check.value : `ERROR: ${check.error}`);
const EN_DASH = String.fromCharCode(0x2013);

describe('the program list', () => {
  test('matches the approved groups, with every sample program on it', () => {
    assert.deepEqual(
      PROGRAM_GROUPS.map((group) => group.group),
      ['Management and commerce', 'Computing', 'Engineering', 'Health', 'Hospitality', 'Arts and science', 'Law', 'Education', 'Design and media', 'Skills', 'Agriculture'],
    );
    const names = new Set(LISTED_PROGRAMS.map((program) => program.name));
    assert.equal(names.size, LISTED_PROGRAMS.length, 'each name once');
    for (const sample of SAMPLE_INSTITUTIONS) {
      for (const program of sample.programs) {
        const listed = LISTED_PROGRAMS.find((candidate) => candidate.name === program.name);
        assert.ok(listed, program.name);
        assert.equal(listed.key, program.programKey, program.name);
      }
    }
    assert.equal(hasDashes(JSON.stringify(PROGRAM_GROUPS)), false);
  });
});

describe('signup fields', () => {
  test('names are tidied, and any en or em dash becomes a hyphen', () => {
    assert.equal(value(checkName('  Northbank   College ')), 'Northbank College');
    assert.equal(value(checkName(`St. Mary${EN_DASH}s College`)), 'St. Mary-s College');
    assert.equal(tidyText(`A ${EN_DASH} B`), 'A - B');
    assert.match(value(checkName(' ')), /^ERROR/);
  });

  test('the city must come from the list; the state comes with it', () => {
    assert.deepEqual(value(checkCity('Guwahati', 'Assam')), { city: 'Guwahati', state: 'Assam' });
    assert.match(String(value(checkCity('Guwahati', 'Bihar'))), /^ERROR: Choose your city from the list/);
    assert.match(String(value(checkCity('Atlantis', 'Assam'))), /^ERROR/);
  });

  test('websites become https://host/path, with any query or trailing slash dropped', () => {
    assert.equal(value(checkWebsite('northbank-college.example')), 'https://northbank-college.example');
    assert.equal(value(checkWebsite('https://www.College.edu.in/')), 'https://www.college.edu.in');
    assert.equal(value(checkWebsite('http://college.ac.in/campus/?utm=x#top')), 'http://college.ac.in/campus');
    for (const bad of ['', 'college', 'http://localhost:3000', 'https://192.168.1.1', 'ftp://college.edu', 'my college.edu']) {
      assert.match(value(checkWebsite(bad)), /^ERROR/, bad);
    }
  });

  test('the website host ignores the scheme, www, paths and case (mirrors the database)', () => {
    assert.equal(websiteHost('https://www.College.edu.in/campus?x=1'), 'college.edu.in');
    assert.equal(websiteHost('http://college.edu.in:8080'), 'college.edu.in');
    assert.equal(websiteHost('northbank-college.example'), 'northbank-college.example');
  });

  test('Instagram: a handle or a profile link, stored without the @', () => {
    assert.equal(value(checkInstagram('@NorthbankCollege')), 'northbankcollege');
    assert.equal(value(checkInstagram('northbank.college')), 'northbank.college');
    assert.equal(value(checkInstagram('https://www.instagram.com/northbankcollege/?hl=en')), 'northbankcollege');
    assert.equal(value(checkInstagram('instagram.com/northbank_college')), 'northbank_college');
    assert.match(value(checkInstagram('https://www.instagram.com/p/C1234/')), /not a link to a post/);
    for (const bad of ['', '@', 'north bank', 'a'.repeat(31), '.dot', 'dot.', 'two..dots', 'https://example.com/northbank']) {
      assert.match(value(checkInstagram(bad)), /^ERROR/, bad);
    }
  });

  test('YouTube is optional: a channel link or an @handle', () => {
    assert.equal(value(checkYoutube('')), null);
    assert.equal(value(checkYoutube('@eastgate')), 'https://www.youtube.com/@eastgate');
    assert.equal(value(checkYoutube('youtube.com/@eastgate/')), 'https://www.youtube.com/@eastgate');
    assert.equal(value(checkYoutube('https://m.youtube.com/channel/UC123')), 'https://www.youtube.com/channel/UC123');
    assert.equal(value(checkYoutube('https://youtube.example/@eastgateuniversity')), 'https://youtube.example/@eastgateuniversity');
    assert.match(String(value(checkYoutube('https://www.youtube.com/watch?v=abc'))), /^ERROR/);
    assert.match(String(value(checkYoutube('https://vimeo.com/eastgate'))), /^ERROR/);
  });

  test('Facebook and LinkedIn are optional page links', () => {
    assert.equal(value(checkFacebook(' ')), null);
    assert.equal(value(checkFacebook('facebook.com/northbankcollege')), 'https://www.facebook.com/northbankcollege');
    assert.equal(value(checkFacebook('https://facebook.example/northbankcollege')), 'https://facebook.example/northbankcollege');
    assert.match(String(value(checkFacebook('https://www.facebook.com/'))), /^ERROR/);
    assert.equal(value(checkLinkedin('https://www.linkedin.com/school/eastgate-university/')), 'https://www.linkedin.com/school/eastgate-university');
    assert.equal(value(checkLinkedin('linkedin.com/company/brightpath')), 'https://www.linkedin.com/company/brightpath');
    assert.match(String(value(checkLinkedin('https://www.linkedin.com/in/some-person'))), /school or company/);
  });

  test('programs: listed ones keep their key, Other names have none, each once', () => {
    assert.deepEqual(value(checkPrograms(['BBA', 'MBA'], ['  Aviation   Safety '])), [
      { name: 'BBA', programKey: 'bba' },
      { name: 'MBA', programKey: 'mba' },
      { name: 'Aviation Safety', programKey: null },
    ]);
    assert.deepEqual(value(checkPrograms(['BBA'], ['bba', 'b.com'])), [
      { name: 'BBA', programKey: 'bba' },
      { name: 'B.Com', programKey: 'bcom' },
    ]);
    assert.match(String(value(checkPrograms([], ['', ' ']))), /at least one program/);
    assert.match(String(value(checkPrograms(['Rocket Science'], []))), /not on the program list/);
    assert.match(String(value(checkPrograms([], ['x']))), /2 to 80 characters/);
  });

  test('all fields at once: tidy values, or a message for each field', () => {
    const good = checkInstitution({
      name: 'New Horizon College',
      type: 'college',
      city: 'Nagaon',
      state: 'Assam',
      website: 'new-horizon.example',
      instagram: '@newhorizon',
      youtube: '',
      facebook: 'https://facebook.example/newhorizon',
      linkedin: '',
    });
    assert.deepEqual(good.errors, {});
    assert.deepEqual(good.details, {
      name: 'New Horizon College',
      type: 'college',
      city: 'Nagaon',
      state: 'Assam',
      website: 'https://new-horizon.example',
      instagram: 'newhorizon',
      youtube: null,
      otherLinks: { facebook: 'https://facebook.example/newhorizon' },
    });

    const bad = checkInstitution({ name: '', type: 'school', city: '', state: '', website: 'nope', instagram: '', youtube: 'x', facebook: 'y', linkedin: 'z' });
    assert.equal(bad.details, null);
    assert.deepEqual(Object.keys(bad.errors).sort(), ['city', 'facebook', 'instagram', 'linkedin', 'name', 'type', 'website', 'youtube']);
    for (const message of Object.values(bad.errors)) assert.equal(hasDashes(message ?? ''), false);
  });
});
