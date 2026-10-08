// Picks the mock or real version of each provider from its single setting.

import { PROVIDER_KEYS, providerMode, type SignalProviderKey } from '../config/providers.ts';
import type { AnalysisProvider } from './analysis.ts';
import type { EmailProvider } from './email.ts';
import type { LeadImportProvider } from './lead-import.ts';
import { mockLeadImport } from './mock/lead-import.ts';
import { MOCK_PROVIDERS, mockAnalysis, mockEmail } from './mock/index.ts';
import { realAnalysis, realEmail, realLeadImport, realProvider } from './real/index.ts';
import type { Provider } from './types.ts';

type Env = Readonly<Record<string, string | undefined>>;

export const SIGNAL_PROVIDER_KEYS: readonly SignalProviderKey[] = PROVIDER_KEYS.filter(
  (key): key is SignalProviderKey => key !== 'ai' && key !== 'email' && key !== 'lead_import',
);

export function getProvider(key: SignalProviderKey, env: Env = process.env): Provider {
  return providerMode(key, env) === 'real' ? realProvider(key) : MOCK_PROVIDERS[key];
}

/** The AI reader and writer. */
export function getAnalysisProvider(env: Env = process.env): AnalysisProvider {
  return providerMode('ai', env) === 'real' ? realAnalysis : mockAnalysis;
}

/** The email sender: the local test inbox in this build. */
export function getEmailProvider(env: Env = process.env): EmailProvider {
  return providerMode('email', env) === 'real' ? realEmail : mockEmail(env);
}

/** The lead ads importer (Meta lead ads, later): not connected in this build. */
export function getLeadImportProvider(env: Env = process.env): LeadImportProvider {
  return providerMode('lead_import', env) === 'real' ? realLeadImport : mockLeadImport;
}
