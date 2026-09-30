// Helpers shared by the mock providers.

import { monthKey } from '../../domain/dates.ts';
import type { CheckKey, CheckResult } from '../../domain/types.ts';
import { profileResult } from '../../sample/profiles.ts';
import type { InstitutionRef, ProgramRef } from '../types.ts';
import { rngFor } from './random.ts';

/**
 * The result a mock should aim for. Sample institutions follow their hand-written monthly
 * profile. Any other institution (for example one onboarded later) gets a stable
 * pseudo-random result, respecting which accounts it actually has.
 */
export function intendedResult(institution: InstitutionRef, checkKey: CheckKey, program: ProgramRef | null, asOf: Date): CheckResult {
  const fromProfile = profileResult(institution.slug, checkKey, program?.programKey ?? null, monthKey(asOf));
  if (fromProfile) return fromProfile;

  if (checkKey === 'instagram_activity' && !institution.instagram) return 'missing';
  if (checkKey === 'youtube' && !institution.youtube) return 'missing';
  if (checkKey === 'other_socials' && !institution.otherLinks.facebook && !institution.otherLinks.linkedin) return 'missing';

  const roll = rngFor('result', institution.slug, program?.programKey ?? null, checkKey).next();
  if (roll < 0.22) return 'strong';
  if (roll < 0.6) return 'okay';
  if (roll < 0.86) return 'weak';
  return 'missing';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** A page on the institution's own website. */
export function sitePage(institution: InstitutionRef, path: string): string {
  return `${institution.website.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
