// Which targets each provider serves. Shared by the mock and real versions, so switching a
// provider to real changes where data comes from and nothing else.

import type { SignalProviderKey } from '../config/providers.ts';
import type { TargetKind } from './types.ts';

export const PROVIDER_TARGETS: Readonly<Record<SignalProviderKey, readonly TargetKind[]>> = {
  website: ['institution', 'program'],
  pagespeed: ['institution'],
  places: ['institution'],
  // The city's search results for each program; threads, news and listings about the institution;
  // Quora and forum questions for Demand.
  search: ['institution', 'program', 'region'],
  youtube: ['institution', 'region'],
  instagram: ['institution', 'region'],
  facebook: ['institution'],
  reddit: ['institution', 'region'],
  trends: ['region'],
  keywords: ['region'],
  ai_answers: ['program'],
  manual: ['institution'],
};
