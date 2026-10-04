// How wide to look (spec 9.2): Demand is about the institution's city, and its state fills in
// when the city has too little. It is pulled once per region and program and shared by every
// institution that needs it. Version 1's All India pulls stay readable but are no longer made. Pure.

import type { DemandScope } from '../domain/types.ts';

export interface DemandRegion {
  scope: DemandScope;
  /** The city, the state, or India. */
  region: string;
  /** City pulls name their state (city names repeat across states); state pulls repeat it; All India has none. */
  state: string | null;
}

export function regionsFor(place: { city: string; state: string }): Record<DemandScope, DemandRegion> {
  return {
    city: { scope: 'city', region: place.city, state: place.state },
    state: { scope: 'state', region: place.state, state: place.state },
    india: { scope: 'india', region: 'India', state: null },
  };
}

/** "Guwahati", "Assam" or "All India", for switches and captions. */
export function regionLabel(region: Pick<DemandRegion, 'scope' | 'region'>): string {
  return region.scope === 'india' ? 'All India' : region.region;
}

/** The place in a sentence: "Students in India worry most about fees." */
export function regionPlace(region: Pick<DemandRegion, 'scope' | 'region'>): string {
  return region.scope === 'india' ? 'India' : region.region;
}

/** The regions pulled each month: the city, and its state to fill in. */
export const PULL_SCOPES = ['city', 'state'] as const satisfies readonly DemandScope[];

export interface NeededPull extends DemandRegion {
  programKey: string;
}

export const pullKey = (pull: NeededPull) => [pull.scope, pull.region, pull.state ?? '', pull.programKey].join('|');

/** Every region and program the given institutions need, once each. Programs without a key (Other) are not covered. */
export function neededPulls(institutions: ReadonlyArray<{ city: string; state: string; programKeys: ReadonlyArray<string | null> }>): NeededPull[] {
  const needed = new Map<string, NeededPull>();
  for (const institution of institutions) {
    const regions = regionsFor(institution);
    for (const programKey of institution.programKeys) {
      if (!programKey) continue;
      for (const scope of PULL_SCOPES) {
        const pull = { ...regions[scope], programKey };
        needed.set(pullKey(pull), pull);
      }
    }
  }
  return [...needed.values()].sort((a, b) => pullKey(a).localeCompare(pullKey(b)));
}
