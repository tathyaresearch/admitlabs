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
    assert.equal(providerMode('ai_answers', { DRISHTI_PROVIDER_AI_ANSWERS: 'mock' }), 'mock');
    assert.equal(providerMode('email', { DRISHTI_PROVIDER_EMAIL: 'real' }), 'real');
    assert.equal(providerMode('search', { DRISHTI_PROVIDER_SEARCH: 'banana' }), 'mock');
  });

  test('every check is fed by at least one provider', () => {
    const fed = new Set(Object.values(PROVIDER_FEEDS).flatMap((provider) => provider.feeds));
    for (const key of CHECK_KEYS) assert.ok(fed.has(key), key);
  });

  test('approvals come from both the website and official listings found by search', () => {
    assert.ok(PROVIDER_FEEDS.website.feeds.includes('approvals'));
    assert.ok(PROVIDER_FEEDS.search.feeds.includes('approvals'));
  });

  test('version 2 slots: findings, search counts, ready fixes and the emails each have a provider', () => {
    const feeds = (key: keyof typeof PROVIDER_FEEDS) => PROVIDER_FEEDS[key].feeds;
    assert.ok(feeds('search').includes('finding') && feeds('reddit').includes('finding'));
    assert.ok(feeds('keywords').includes('search_volume'));
    assert.ok(feeds('ai').includes('ready_fix') && feeds('ai').includes('finding_fix') && feeds('ai').includes('content_ideas'));
    assert.deepEqual([...feeds('email')].sort(), ['audit_ready_email', 'lead_alert', 'monthly_summary']);
    assert.equal(PROVIDER_FEEDS.instagram.realSource, 'VidIQ');
  });
});
