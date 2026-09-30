// Real providers are slots only in this build. Each one throws until it is connected
// (spec section 17: real providers, Claude API and keys come later).

import type { SignalProviderKey } from '../../config/providers.ts';
import type { AnalysisProvider } from '../analysis.ts';
import { PROVIDER_TARGETS } from '../targets.ts';
import { ProviderNotConnectedError, type Provider } from '../types.ts';

export function realProvider(key: SignalProviderKey): Provider {
  return {
    key,
    mode: 'real',
    targets: PROVIDER_TARGETS[key],
    async collect() {
      throw new ProviderNotConnectedError(key);
    },
  };
}

export const realAnalysis: AnalysisProvider = {
  key: 'analysis',
  mode: 'real',
  async whyItWorked() {
    throw new ProviderNotConnectedError('analysis');
  },
  async contentIdeas() {
    throw new ProviderNotConnectedError('analysis');
  },
  async fixAdvice() {
    throw new ProviderNotConnectedError('analysis');
  },
};
