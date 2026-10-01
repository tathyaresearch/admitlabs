import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { CHECK_KEYS, PILLARS } from '../domain/types.ts';
import { BRAND_MARKS, BRANDS } from './brands.ts';
import { CHECK_ICONS, LINE_ICONS, PILLAR_ICONS } from './icons.ts';
import { PLATFORM_ICONS, PLATFORMS, platformFromUrl } from './platforms.ts';

// Icons and logos: every check and pillar has one; only three brands show their real logo.

describe('platform marks', () => {
  test('only Instagram, X and YouTube show their real logo; everyone else a neutral icon', () => {
    const brands = PLATFORMS.filter((platform) => PLATFORM_ICONS[platform].kind === 'brand');
    assert.deepEqual(brands, ['instagram', 'youtube', 'x']);
    for (const platform of PLATFORMS) {
      const icon = PLATFORM_ICONS[platform];
      if (icon.kind === 'line') assert.ok(LINE_ICONS[icon.name], platform);
    }
  });

  test('the logos are the Simple Icons files, unchanged', () => {
    for (const brand of BRANDS) {
      const svg = readFileSync(new URL(`./brands/${brand}.svg`, import.meta.url), 'utf8');
      assert.ok(svg.includes(` d="${BRAND_MARKS[brand].path}"`), brand);
      assert.ok(svg.includes(`viewBox="${BRAND_MARKS[brand].viewBox}"`), brand);
    }
  });

  test('recognises a platform from a source link, real or sample', () => {
    const cases: Array<[string, string | null]> = [
      ['https://instagram.example/eastgateuniversity', 'instagram'],
      ['https://youtube.example/@eastgate', 'youtube'],
      ['https://maps.example/place/eastgate', 'google_maps'],
      ['https://search.example/search?q=bba', 'google'],
      ['https://ai-answers.example/checks/eastgate/bba/2026-09', 'ai_assistants'],
      ['https://trends.example/topic', 'search_trends'],
      ['https://pagespeed.example/report', 'page_speed'],
      ['https://official-data.example/naac', 'official_data'],
      ['https://eastgate-university.example/placements', 'website'],
      ['https://www.instagram.com/someone', 'instagram'],
      ['https://youtu.be/abc', 'youtube'],
      ['https://twitter.com/someone', 'x'],
      ['https://www.google.com/maps/place/x', 'google_maps'],
      ['https://www.google.com/search?q=x', 'google'],
      ['https://gemini.google.com/app', 'gemini'],
      ['https://chatgpt.com/', 'chatgpt'],
      ['https://www.perplexity.ai/search', 'perplexity'],
      ['https://college.edu.in/fees', 'website'],
      ['not a link', null],
    ];
    for (const [url, platform] of cases) assert.equal(platformFromUrl(url), platform, url);
  });
});

describe('check and pillar icons', () => {
  test('every check and every pillar has an icon that exists', () => {
    for (const key of CHECK_KEYS) {
      const icon = CHECK_ICONS[key];
      assert.ok(icon.kind === 'brand' ? BRAND_MARKS[icon.brand] : LINE_ICONS[icon.name], key);
    }
    for (const pillar of PILLARS) assert.ok(LINE_ICONS[PILLAR_ICONS[pillar]], pillar);
  });

  test('checks named after a platform show its mark: Instagram and YouTube', () => {
    assert.deepEqual(CHECK_ICONS.instagram_activity, { kind: 'brand', brand: 'instagram' });
    assert.deepEqual(CHECK_ICONS.youtube, { kind: 'brand', brand: 'youtube' });
  });
});
