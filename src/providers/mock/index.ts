// Every mock provider, keyed by provider.

import type { SignalProviderKey } from '../../config/providers.ts';
import { PROVIDER_TARGETS } from '../targets.ts';
import type { Provider } from '../types.ts';
import {
  instagramInstitutionSignals,
  mockAiAnswers,
  mockManual,
  mockOfficialData,
  mockPagespeed,
  mockPlaces,
  mockSearch,
  mockSiteCrawler,
  mockSocials,
  youtubeInstitutionSignals,
} from './checks.ts';
import { demandSignals } from './demand.ts';

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

function demandOnly(key: 'reddit' | 'x' | 'quora' | 'trends'): Provider {
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
  search: mockSearch,
  places: mockPlaces,
  pagespeed: mockPagespeed,
  site_crawler: mockSiteCrawler,
  instagram: mockInstagram,
  youtube: mockYoutube,
  socials: mockSocials,
  ai_answers: mockAiAnswers,
  official_data: mockOfficialData,
  reddit: demandOnly('reddit'),
  x: demandOnly('x'),
  quora: demandOnly('quora'),
  trends: demandOnly('trends'),
  manual: mockManual,
};

export { mockAnalysis } from './analysis.ts';
