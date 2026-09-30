// The one shared provider interface (spec section 17): a provider takes a target and
// returns signals, each with a value, a source link and the date it was fetched.

import type { ProviderMode, SignalProviderKey } from '../config/providers.ts';
import type { DemandScope, InstitutionType } from '../domain/types.ts';
import type { SignalValues } from './signals.ts';

export interface InstitutionRef {
  id: string;
  slug: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  website: string;
  instagram: string | null;
  youtube: string | null;
  otherLinks: { facebook?: string; linkedin?: string };
  /** Normalised keys of the programs it offers, as a crawler would see them on the site. */
  programKeys: readonly string[];
}

export interface ProgramRef {
  id: string;
  name: string;
  programKey: string | null;
}

/** An institution whose public mentions a Demand pull looks for (grouped topics, never people). */
export interface WatchedInstitution {
  id: string;
  slug: string;
  name: string;
  type: InstitutionType;
  city: string;
  state: string;
  /** The program whose pull its mentions are filed under (its first program), so they are stored once per region. */
  programKey: string;
}

/**
 * What to collect for: a whole institution, one of its programs, or (for Demand) a region and
 * program. A city pull names its state too, since city names repeat across states.
 */
export type Target =
  | { kind: 'institution'; institution: InstitutionRef }
  | { kind: 'program'; institution: InstitutionRef; program: ProgramRef }
  | { kind: 'region'; scope: DemandScope; region: string; programKey: string; state?: string | null; watch?: readonly WatchedInstitution[] };

export type TargetKind = Target['kind'];

export type SignalKey = keyof SignalValues;

export interface Signal<K extends SignalKey = SignalKey> {
  provider: SignalProviderKey;
  key: K;
  institutionId: string | null;
  programId: string | null;
  value: SignalValues[K];
  sourceUrl: string;
  /** ISO timestamp of when the fact was checked. */
  fetchedAt: string;
}

export type AnySignal = { [K in SignalKey]: Signal<K> }[SignalKey];

export interface Provider {
  key: SignalProviderKey;
  mode: ProviderMode;
  /** Target kinds this provider can collect for. */
  targets: readonly TargetKind[];
  collect(target: Target, asOf: Date): Promise<AnySignal[]>;
}

export class ProviderNotConnectedError extends Error {
  readonly providerKey: string;

  constructor(providerKey: string) {
    super(`The ${providerKey} provider is not connected yet. It runs on mock data in this build.`);
    this.name = 'ProviderNotConnectedError';
    this.providerKey = providerKey;
  }
}

export function makeSignal<K extends SignalKey>(
  provider: SignalProviderKey,
  key: K,
  target: Target,
  value: SignalValues[K],
  sourceUrl: string,
  asOf: Date,
): Signal<K> {
  return {
    provider,
    key,
    institutionId: target.kind === 'region' ? null : target.institution.id,
    programId: target.kind === 'program' ? target.program.id : null,
    value,
    sourceUrl,
    fetchedAt: asOf.toISOString(),
  };
}
