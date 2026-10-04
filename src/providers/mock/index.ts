// Every mock provider, keyed by provider.

import type { SignalProviderKey } from '../../config/providers.ts';
import { PROVIDER_TARGETS } from '../targets.ts';
import type { Provider } from '../types.ts';
import {
  instagramInstitutionSignals,
  mockAiAnswers,
  mockFacebook,
  mockManual,
  mockPagespeed,
  mockPlaces,
  mockWebsite,
  searchInstitutionSignals,
  searchProgramSignals,
  youtubeInstitutionSignals,
} from './checks.ts';
import { demandSignals } from './demand.ts';
import { findingSignals } from './findings.ts';

const mockSearch: Provider = {
  key: 'search',
  mode: 'mock',
  targets: PROVIDER_TARGETS.search,
  async collect(target, asOf) {
    if (target.kind === 'region') return demandSignals('search', target, asOf);
    return target.kind === 'program' ? searchProgramSignals(target, asOf) : searchInstitutionSignals(target, asOf);
  },
};

const mockInstagram: Provider = {
  key: 'instagram',
  mode: 'mock',
  targets: PROVIDER_TARGETS.instagram,
  async collect(target, asOf) {
    return target.kind === 'region' ? demandSignals('instagram', target, asOf) : instagramInstitutionSignals(target, asOf);
  },
};

const mockYoutube: Provider = {
  key: 'youtube',
  mode: 'mock',
  targets: PROVIDER_TARGETS.youtube,
  async collect(target, asOf) {
    return target.kind === 'region' ? demandSignals('youtube', target, asOf) : youtubeInstitutionSignals(target, asOf);
  },
};

const mockReddit: Provider = {
  key: 'reddit',
  mode: 'mock',
  targets: PROVIDER_TARGETS.reddit,
  async collect(target, asOf) {
    return target.kind === 'region' ? demandSignals('reddit', target, asOf) : findingSignals('reddit', target, asOf);
  },
};

function demandOnly(key: 'trends' | 'keywords'): Provider {
  return {
    key,
    mode: 'mock',
    targets: PROVIDER_TARGETS[key],
    async collect(target, asOf) {
      return demandSignals(key, target, asOf);
    },
  };
}

export const MOCK_PROVIDERS: Readonly<Record<SignalProviderKey, Provider>> = {
  website: mockWebsite,
  pagespeed: mockPagespeed,
  places: mockPlaces,
  search: mockSearch,
  youtube: mockYoutube,
  instagram: mockInstagram,
  facebook: mockFacebook,
  reddit: mockReddit,
  trends: demandOnly('trends'),
  keywords: demandOnly('keywords'),
  ai_answers: mockAiAnswers,
  manual: mockManual,
};

export { mockAnalysis } from './analysis.ts';
export { mockEmail } from './email.ts';
