// Picks the mock or real version of each provider from its single setting.

import { PROVIDER_KEYS, providerMode, type SignalProviderKey } from '../config/providers.ts';
import type { AnalysisProvider } from './analysis.ts';
import { MOCK_PROVIDERS, mockAnalysis } from './mock/index.ts';
import { realAnalysis, realProvider } from './real/index.ts';
import type { Provider } from './types.ts';

type Env = Readonly<Record<string, string | undefined>>;

export const SIGNAL_PROVIDER_KEYS: readonly SignalProviderKey[] = PROVIDER_KEYS.filter(
  (key): key is SignalProviderKey => key !== 'analysis',
);

export function getProvider(key: SignalProviderKey, env: Env = process.env): Provider {
  return providerMode(key, env) === 'real' ? realProvider(key) : MOCK_PROVIDERS[key];
}

export function getAnalysisProvider(env: Env = process.env): AnalysisProvider {
  return providerMode('analysis', env) === 'real' ? realAnalysis : mockAnalysis;
}
