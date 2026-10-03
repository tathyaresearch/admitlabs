import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { hasDashes } from '../domain/copy.ts';
import * as scenes from './scenes.ts';

// The website's pictures (2026-10-02): a made-up institution in Bangalore, no caption, and the
// website (the /drishti product page with it) allowed its subtle monochrome gradients.

function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

function files(dir: string, ending: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, ending) : ending.test(name) ? [path] : [];
  });
}

const ROOT = join(import.meta.dirname, '..');
const WEBSITE = [join(ROOT, 'components', 'site'), join(ROOT, 'app', '(site)')];
/** The product page, now part of the website's look: its gradients are allowed too. */
const PRODUCT_PAGE = [join(ROOT, 'components', 'product'), join(ROOT, 'app', '(product)', 'drishti')];
/** The left side of /signup and /login (the user's choice, 2026-10-03): its own stylesheet only. */
const AUTH_LEFT_SIDE = [join(ROOT, 'components', 'auth', 'stage.module.css')];
const mayHaveGradients = (path: string) => [...WEBSITE, ...PRODUCT_PAGE, ...AUTH_LEFT_SIDE].some((dir) => path.startsWith(dir));
const ALL = texts(Object.fromEntries(Object.entries(scenes)));

describe('the website’s pictures', () => {
  test('plain words: no dashes, curly quotes only', () => {
    assert.ok(ALL.length > 60);
    for (const text of ALL) {
      assert.equal(hasDashes(text), false, text);
      assert.doesNotMatch(text, /["']/, text);
    }
  });

  test('set in Bangalore, with a made-up institution, never Drishti’s own sample', () => {
    assert.equal(scenes.CITY, 'Bangalore');
    assert.equal(scenes.INSTITUTION.name, 'Larkmoor University');
    assert.ok(ALL.some((text) => text.includes('Bangalore')));
    const website = [...ALL, ...WEBSITE.flatMap((dir) => files(dir, /\.tsx?$/).map((path) => readFileSync(path, 'utf8')))];
    for (const text of website) assert.doesNotMatch(text, /Guwahati|Assam|Eastgate|Highfield|Northbank|Silverline/, text.slice(0, 80));
    for (const site of [scenes.INSTITUTION.site, ...Object.values(scenes.OTHERS).map((other) => other.site)]) assert.match(site, /\.example$/);
  });

  test('no “Sample institution. Fictional data.” caption anywhere on the website', () => {
    for (const path of WEBSITE.flatMap((dir) => files(dir, /\.tsx?$/))) {
      const source = readFileSync(path, 'utf8');
      assert.doesNotMatch(source, /SAMPLE_CAPTION|Fictional data/, path);
    }
  });

  test('gradients only on the website, the product page and the left side of /signup and /login: the dashboard keeps none', () => {
    const outside = files(ROOT, /\.(css|tsx)$/).filter((path) => !mayHaveGradients(path));
    assert.ok(outside.length > 20);
    for (const path of outside) assert.doesNotMatch(readFileSync(path, 'utf8'), /gradient\(/, path);
  });

  test('the Drishti window’s closing lines match its numbers', () => {
    const { fixes, rivals } = scenes.DASHBOARD;
    assert.equal(fixes.items.length, 3);
    const total = fixes.items.reduce((sum, fix) => sum + fix.points, 0);
    assert.equal(fixes.note, `All three could add up to ${total} points.`);
    const you = rivals.rows.findIndex((row) => row.you);
    assert.equal(rivals.rank, '2nd');
    assert.equal(you, 1);
    assert.equal(rivals.note, `Next step: catching ${rivals.rows[0].name}.`);
  });

  test('the season is planned week by week, busiest when students decide', () => {
    const { weeks, months } = scenes.SEASON;
    assert.equal(weeks.length, months.length * 4);
    assert.ok(weeks.every((level) => level >= 0 && level <= 4));
    assert.equal(Math.max(...weeks), 4);
  });
});
