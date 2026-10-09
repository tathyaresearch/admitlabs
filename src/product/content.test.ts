import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { PLAN_RULES } from '../config/plans.ts';
import { RIVAL_RULES } from '../config/rivals.ts';
import { SCHEDULES } from '../config/schedules.ts';
import { SCORING_V1 } from '../config/scoring.v1.ts';
import { CHECKS } from '../domain/checks.ts';
import { hasDashes } from '../domain/copy.ts';
import { PLACE_LABELS, PLACES } from '../domain/types.ts';
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

  test('while Drishti is not open yet, no line says people can sign up or start now', () => {
    assert.equal(content.CLOSED.finalText, 'Drishti opens soon. Talk to us to be one of the first institutions.');
    assert.match(content.CLOSED.paidNote, /AdmitLabs team switches Paid on/);
    for (const text of Object.values(content.CLOSED)) assert.doesNotMatch(text, /two minutes|start free|start now|sign up|no payment/i, text);
  });

  test('prices, plan length and reminders come from the plan settings', () => {
    const [free, paid] = content.PLANS.cards;
    assert.equal(free?.price, '₹0');
    // 3 months shows first; the toggle on the card switches to Monthly.
    assert.equal(paid?.price, '₹24,999');
    assert.equal(PLAN_RULES.paid.periods[3].priceInr, 24999);
    assert.equal(PLAN_RULES.paid.periods[1].priceInr, 9999);
    assert.equal(paid?.term, '+ GST for 3 months');
    assert.match(content.PLANS.fine, /does not renew on its own/);
    assert.match(content.PLANS.fine, /30 days before a 3-month plan ends, and 7 days before a monthly one/);
    assert.doesNotMatch(content.PLANS.fine, /one price/);
    const renewal = content.FAQ.find((item) => item.question.includes('renew'));
    assert.match(renewal?.answer ?? '', /a month or 3 months from the day you pay/);
    assert.match(renewal?.answer ?? '', /30 days before a 3-month plan ends, and 7 days before a monthly one/);
  });

  test('schedules, places, words and rival counts come from config', () => {
    assert.ok(content.PLANS.cards[0]?.points.includes(`A new Audit every ${SCHEDULES.free.auditEveryMonths} months, with an email when it’s ready`));
    // The Paid card says monthly, with one extra refresh: the schedule must still say so.
    assert.equal(SCHEDULES.paid.auditEveryMonths, 1);
    assert.equal(SCHEDULES.paid.manualRefresh, 'once_a_month');
    // How Drishti reads you: every check under its word, the five places in their order, and what
    // makes a word from the scoring settings.
    assert.equal(
      content.READS.words.reduce((sum, word) => sum + word.checks.length, 0),
      CHECKS.length,
    );
    assert.deepEqual(
      content.READS.words.map((word) => word.name),
      ['Discovered', 'Trusted', 'Chosen'],
    );
    assert.deepEqual(
      content.READS.places,
      PLACES.map((place) => PLACE_LABELS[place]),
    );
    assert.deepEqual(
      content.READS.key,
      SCORING_V1.labels.map((band) => ({ word: band.label, min: band.min, max: band.max })),
    );
    assert.equal(content.READS.title, `${content.READS.places.length === 5 ? 'Five' : content.READS.places.length} places. Three words.`);
    // The website's Drishti section keeps its own line for each feature.
    assert.match(content.FEATURES[1]?.lede ?? '', new RegExp(`${RIVAL_RULES.min} to ${RIVAL_RULES.max} rivals in your city`));
  });

  test('the new product: three words, rivals in your city, Make these 3, Leads for clients and the Paid price', () => {
    assert.match(content.FEATURES[0]?.lede ?? '', /Discovered, Trusted and Chosen/);
    assert.match(content.FEATURES[1]?.question ?? '', /in our city/);
    assert.match(content.FEATURES[2]?.line ?? '', /Make these 3/);
    assert.match(content.CLIENTS.leads, /Leads/);
    assert.ok(content.TRUST.points.some((point) => point.startsWith('Leads is the one exception')));
    const leads = content.FAQ.find((item) => item.question === 'What is Leads?');
    assert.match(leads?.answer ?? '', /AdmitLabs clients/);
    const [, paid] = content.PLANS.cards;
    assert.equal(`${paid?.price} ${paid?.term}`, '₹24,999 + GST for 3 months');
    // Each word with its score out of 100 (October 2026), never a total.
    assert.match(content.FEATURES[0]?.lede ?? '', /out of 100/);
    assert.match(content.READS.lede, /out of 100/);
    for (const text of ALL) assert.doesNotMatch(text, /overall score|total score/i, text);
  });

  test('each feature opens with its name, its question and one short line', () => {
    assert.deepEqual(
      content.FEATURES.map((feature) => feature.name),
      ['Audit', 'Rivals', 'Demand'],
    );
    for (const feature of content.FEATURES) {
      assert.match(feature.question, /\?$/);
      assert.ok(feature.line.split(' ').length <= 20, feature.line);
    }
  });

  test('the problem: the headline the user picked, and a card whose values all come from the sample', () => {
    assert.equal(content.PROBLEM.title, 'Most teams guess. Drishti checks.');
    assert.notEqual(content.PROBLEM.title, `${content.HERO.title} ${content.HERO.highlight}`);
    // The card's words carry no numbers of their own: every value on it is the sample's.
    for (const text of texts(content.PROBLEM.card)) assert.doesNotMatch(text, /\d/, text);
  });

  test('How Drishti reads you shows no total: its words carry no numbers of their own but the scale, out of 100', () => {
    for (const text of [content.READS.title, content.READS.lede, content.READS.keyTitle, content.READS.keyNote]) assert.doesNotMatch(text.replace(/out of 100/g, ''), /\d/, text);
  });

  test('no small labels above headings but How Drishti reads you’s, which names its feature; the pictures carry no caption: only the sample PDF says it is a sample', () => {
    const keys = (value: unknown): string[] =>
      Array.isArray(value) ? value.flatMap(keys) : value && typeof value === 'object' ? Object.entries(value).flatMap(([key, entry]) => [key, ...keys(entry)]) : [];
    assert.equal(keys(Object.fromEntries(Object.entries(content))).includes('eyebrow'), false);
    assert.equal(content.READS.label, `Inside ${content.FEATURES[0]?.name}`);
    const pictures = readFileSync(new URL('../components/product/Previews.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(pictures, /Sample institution|Fictional data/);
    assert.equal(content.REPORT.note, 'Sample report. Fictional data.');
  });

  test('two-line titles, the second in a quieter tone', () => {
    for (const title of [content.FEATURES_HEAD.title, content.STEPS.title, content.REPORT.title, content.PLANS.title, content.CLIENTS.title]) {
      assert.equal(title.length, 2);
      for (const line of title) assert.match(line, /\.$/);
    }
  });

  test('the FAQ covers data sources, privacy, public data only, Leads and renewal', () => {
    const questions = content.FAQ.map((item) => item.question).join(' | ');
    for (const topic of ['get its data', 'public data only', 'see our results', 'Leads', 'renew']) assert.ok(questions.includes(topic), topic);
  });
});
