// Real providers are slots only in this build. Each one throws until it is connected
// (spec section 17: real providers, the Claude API, a real email sender and keys come later).

import type { SignalProviderKey } from '../../config/providers.ts';
import type { AnalysisProvider } from '../analysis.ts';
import type { EmailProvider } from '../email.ts';
import type { LeadImportProvider } from '../lead-import.ts';
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

const notConnected = (): never => {
  throw new ProviderNotConnectedError('ai');
};

export const realAnalysis: AnalysisProvider = {
  key: 'ai',
  mode: 'real',
  async whyItWorked() {
    return notConnected();
  },
  async contentIdeas() {
    return notConnected();
  },
  async fixAdvice() {
    return notConnected();
  },
  async findingFix() {
    return notConnected();
  },
  async answerBrain() {
    return notConnected();
  },
  async fitIdea() {
    return notConnected();
  },
  async rivalActions() {
    return notConnected();
  },
  async rivalLine() {
    return notConnected();
  },
};

export const realEmail: EmailProvider = {
  key: 'email',
  mode: 'real',
  sender: 'Email service',
  async send() {
    throw new ProviderNotConnectedError('email');
  },
};

/** The lead ads importer: Meta lead ads, later. Not connected: it never calls anyone. */
export const realLeadImport: LeadImportProvider = {
  key: 'lead_import',
  mode: 'real',
  name: 'Meta lead ads',
  async status() {
    return { connected: false };
  },
  async pull() {
    throw new ProviderNotConnectedError('lead_import');
  },
};
