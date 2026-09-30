// Runs every provider that serves a target and gathers their signals. This is the one entry
// point scheduled runs and manual triggers use, so switching a provider to real changes
// nothing here.

import { getProvider, SIGNAL_PROVIDER_KEYS } from './registry.ts';
import type { AnySignal, Target } from './types.ts';

type Env = Readonly<Record<string, string | undefined>>;

export async function collect(target: Target, asOf: Date, env: Env = process.env): Promise<AnySignal[]> {
  const providers = SIGNAL_PROVIDER_KEYS.map((key) => getProvider(key, env)).filter((provider) => provider.targets.includes(target.kind));
  const batches = await Promise.all(providers.map((provider) => provider.collect(target, asOf)));
  return batches.flat();
}
