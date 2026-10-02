import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CHECKS } from '../domain/checks.ts';
import { hasDashes } from '../domain/copy.ts';
import * as content from './content.ts';

// The website's words: no dashes, curly quotes only, and the lines the user wrote kept as written.

function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

const ALL = texts(Object.fromEntries(Object.entries(content)));

describe('the website copy', () => {
  test('no em dashes or en dashes, and curly quotes and apostrophes only', () => {
    assert.ok(ALL.length > 30);
    for (const text of ALL) {
      assert.equal(hasDashes(text), false, text);
      assert.doesNotMatch(text, /["']/, text);
    }
  });

  test('the headline, buttons and proof line are as the user wrote them', () => {
    const { before, words } = content.HERO.title;
    assert.equal(`${before} ${words.discovered}, ${words.trusted}, and ${words.chosen}.`, 'Get discovered, trusted, and chosen.');
    assert.equal(content.CTA.primary, 'Get your free Audit');
    assert.equal(content.CTA.secondary, 'Work with us');
    assert.equal(content.HERO.proof, '120+ education companies worked with.');
    assert.deepEqual(
      content.NAV.map((item) => item.label),
      ['Services', 'Products', 'How we work', 'FAQ'],
    );
  });

  test('the Products menu: Drishti on the website, Tathya in a new tab', () => {
    assert.deepEqual(
      content.PRODUCTS.items.map((item) => [item.name, item.href, item.newTab]),
      [
        ['Drishti', '/drishti', false],
        ['Tathya', 'https://mytathya.in', true],
      ],
    );
    assert.equal(content.NAV.filter((item) => 'menu' in item).length, 1);
  });

  test('one small label above a heading on the home page: Product, above Drishti', () => {
    assert.equal(content.DRISHTI.eyebrow, 'Product');
    for (const section of [content.SYSTEM, content.SERVICES, content.AUDIENCE, content.HOW, content.FAQ, content.FINAL, content.ENQUIRY]) {
      assert.equal('eyebrow' in section, false);
    }
  });

  test('who we work with, only: never who we don’t, and no prices anywhere', () => {
    for (const text of ALL) {
      assert.doesNotMatch(text, /\bschools?\b|edtech|government (?:bod|institut|college)/i, text);
      assert.doesNotMatch(text, /₹|\brs\.?\s?\d|\binr\b/i, text);
    }
    assert.deepEqual(content.AUDIENCE.lines, ['Private colleges.', 'Private universities.', 'Skilling and training institutes.']);
  });

  test('the FAQ answers as approved', () => {
    assert.deepEqual(
      content.FAQ.items.map((item) => item.question),
      ['Do you run ads?', 'Who do you work with?', 'Do we own the pages and content?', 'Is Drishti free?', 'How do we start?'],
    );
    assert.match(content.FAQ.items[0]?.answer ?? '', /^No\. We create content only\./);
    assert.match(content.FAQ.items[2]?.answer ?? '', /^Yes\./);
  });

  test('our work stays hidden until the user sets it; Tathya links to its own site', async () => {
    const { SITE_SETTINGS } = await import('../config/site.ts');
    const { WORK_SAMPLES } = await import('./work.ts');
    assert.equal(SITE_SETTINGS.showWork, false);
    assert.equal(WORK_SAMPLES.length, 0);
    assert.equal(SITE_SETTINGS.tathyaUrl, 'https://mytathya.in');
    assert.equal(content.TATHYA.link, 'Explore Tathya');
    assert.equal(content.FOOTER.email, 'hello@admitlabs.in');
  });

  test('a service tile names its service in the enquiry', () => {
    assert.equal(content.aboutService('admit-campaign'), 'We’d like to talk about Admit Campaign.');
    assert.equal(content.aboutService('something-else'), null);
    assert.equal(content.aboutService(null), null);
    assert.equal(content.ENQUIRY.thanks, 'Thanks. We’ll reply within one working day.');
  });

  test('the system: the three pillars in the score’s order, with every check Drishti runs', () => {
    assert.deepEqual(
      content.SYSTEM.pillars.map((pillar) => [pillar.name, pillar.line]),
      [
        ['Discovered', 'Students find you when they search.'],
        ['Trusted', 'They believe what they see.'],
        ['Chosen', 'Saying yes is easy.'],
      ],
    );
    assert.equal(
      content.SYSTEM.pillars.reduce((sum, pillar) => sum + pillar.checks.length, 0),
      CHECKS.length,
    );
    assert.deepEqual(
      content.SYSTEM.loop.steps.map((step) => step.name),
      ['Measure', 'Fix', 'Repeat'],
    );
  });
});
