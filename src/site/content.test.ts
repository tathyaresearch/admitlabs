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
    assert.equal(content.HERO.proof, 'Education only. 120+ education companies worked with.');
    assert.equal(content.HERO.sample, 'Sample institution. Fictional data.');
    assert.deepEqual(
      content.NAV.map((item) => item.label),
      ['Services', 'Drishti', 'How we work', 'FAQ'],
    );
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
