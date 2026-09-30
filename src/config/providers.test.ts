import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CHECK_KEYS } from '../domain/types.ts';
import { PROVIDER_FEEDS, PROVIDER_KEYS, PROVIDER_MODES, providerMode } from './providers.ts';

describe('provider settings (spec section 17)', () => {
  test('every provider runs on mock data in this build', () => {
    for (const key of PROVIDER_KEYS) assert.equal(PROVIDER_MODES[key], 'mock', key);
  });

  test('one setting switches a single provider', () => {
    assert.equal(providerMode('search', { DRISHTI_PROVIDER_SEARCH: 'real' }), 'real');
    assert.equal(providerMode('places', { DRISHTI_PROVIDER_SEARCH: 'real' }), 'mock');
    assert.equal(providerMode('site_crawler', { DRISHTI_PROVIDER_SITE_CRAWLER: 'mock' }), 'mock');
    assert.equal(providerMode('search', { DRISHTI_PROVIDER_SEARCH: 'banana' }), 'mock');
  });

  test('every check is fed by at least one provider', () => {
    const fed = new Set(Object.values(PROVIDER_FEEDS).flatMap((provider) => provider.feeds));
    for (const key of CHECK_KEYS) assert.ok(fed.has(key), key);
  });

  test('approvals come from both the website and official records', () => {
    assert.ok(PROVIDER_FEEDS.site_crawler.feeds.includes('approvals'));
    assert.ok(PROVIDER_FEEDS.official_data.feeds.includes('approvals'));
  });
});
