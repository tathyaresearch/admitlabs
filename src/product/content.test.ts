import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { PLAN_RULES } from '../config/plans.ts';
import { RIVAL_RULES } from '../config/rivals.ts';
import { SCHEDULES } from '../config/schedules.ts';
import { CHECKS } from '../domain/checks.ts';
import { hasDashes } from '../domain/copy.ts';
import * as content from './content.ts';

// The product page's words: every number from config, no dashes, curly quotes only.

function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

const ALL = texts(Object.fromEntries(Object.entries(content)));

describe('the product page copy', () => {
  test('no em dashes or en dashes, and curly quotes and apostrophes only', () => {
    assert.ok(ALL.length > 50);
    for (const text of ALL) {
      assert.equal(hasDashes(text), false, text);
      assert.doesNotMatch(text, /["']/, text);
    }
  });

  test('the headline is the spec’s, and the proof line is as the user worded it', () => {
    assert.equal(`${content.HERO.title} ${content.HERO.highlight}`, 'See where you stand, who’s ahead, and what students want.');
    assert.equal(content.PROOF_LINE, 'From AdmitLabs. 120+ education companies worked with.');
    assert.equal(content.CTA.primary, 'Get your free Audit');
    assert.equal(content.CTA.paid, 'Start with a free Audit');
    assert.match(content.CTA.paidNote, /AdmitLabs team switches Paid on/);
  });

  test('prices, plan length and reminders come from the plan settings', () => {
    const [free, paid] = content.PLANS.cards;
    assert.equal(free?.price, '₹0');
    assert.equal(paid?.price, '₹9,999');
    assert.equal(PLAN_RULES.paid.priceInr, 9999);
    assert.equal(paid?.term, `for ${PLAN_RULES.paid.lengthMonths} months`);
    assert.match(content.PLANS.fine, /does not renew on its own/);
    assert.match(content.PLANS.fine, /30 days and 7 days/);
    const renewal = content.FAQ.find((item) => item.question.includes('renew'));
    assert.match(renewal?.answer ?? '', new RegExp(`${PLAN_RULES.paid.lengthMonths} months`));
    assert.match(renewal?.answer ?? '', /30 days and 7 days/);
  });

  test('schedules, checks and rival counts come from config', () => {
    assert.ok(content.PLANS.cards[0]?.points.includes(`A new Audit every ${SCHEDULES.free.auditEveryMonths} months`));
    // The Paid card says monthly, with one extra refresh: the schedule must still say so.
    assert.equal(SCHEDULES.paid.auditEveryMonths, 1);
    assert.equal(SCHEDULES.paid.manualRefresh, 'once_a_month');
    assert.equal(
      content.SCORE.pillars.reduce((sum, pillar) => sum + pillar.checks.length, 0),
      CHECKS.length,
    );
    assert.match(content.PROBLEM.items[0]?.answer ?? '', new RegExp(`${CHECKS.length} things`));
    assert.match(content.FEATURES[1]?.lede ?? '', new RegExp(`${RIVAL_RULES.min} to ${RIVAL_RULES.max} rivals`));
  });

  test('no small labels above headings, and the pictures carry no caption: only the sample PDF says it is a sample', () => {
    const keys = (value: unknown): string[] =>
      Array.isArray(value) ? value.flatMap(keys) : value && typeof value === 'object' ? Object.entries(value).flatMap(([key, entry]) => [key, ...keys(entry)]) : [];
    assert.equal(keys(Object.fromEntries(Object.entries(content))).includes('eyebrow'), false);
    const pictures = readFileSync(new URL('../components/product/Previews.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(pictures, /Sample institution|Fictional data/);
    assert.equal(content.REPORT.note, 'Sample report. Fictional data.');
  });

  test('two-line titles, the second in a quieter tone', () => {
    for (const title of [content.FEATURES_HEAD.title, content.SCORE.title, content.STEPS.title, content.REPORT.title, content.PLANS.title, content.CLIENTS.title]) {
      assert.equal(title.length, 2);
      for (const line of title) assert.match(line, /\.$/);
    }
  });

  test('the FAQ covers data sources, privacy, public data only and renewal', () => {
    const questions = content.FAQ.map((item) => item.question).join(' | ');
    for (const topic of ['get its data', 'public data only', 'see our results', 'renew']) assert.ok(questions.includes(topic), topic);
  });
});
