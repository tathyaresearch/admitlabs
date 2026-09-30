// Which targets each provider serves. Shared by the mock and real versions, so switching a
// provider to real changes where data comes from and nothing else.

import type { SignalProviderKey } from '../config/providers.ts';
import type { TargetKind } from './types.ts';

export const PROVIDER_TARGETS: Readonly<Record<SignalProviderKey, readonly TargetKind[]>> = {
  search: ['program'],
  places: ['institution'],
  pagespeed: ['institution'],
  site_crawler: ['institution', 'program'],
  instagram: ['institution', 'region'],
  youtube: ['institution', 'region'],
  socials: ['institution'],
  ai_answers: ['program'],
  official_data: ['institution'],
  reddit: ['region'],
  x: ['region'],
  quora: ['region'],
  trends: ['region'],
  manual: ['institution'],
};
