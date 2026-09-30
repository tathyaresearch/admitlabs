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

/**
 * Mock sources never point at a real site or account. A link on any other host becomes a
 * .example stand in (www.college.ac.in becomes college-ac-in.example), so an institution
 * onboarded with its real website still only gets sample links.
 */
export function exampleUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.example')) return url;
    const host = parsed.hostname.replace(/^www\./, '').replace(/\./g, '-');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `https://${host}.example${path}${parsed.search}${parsed.hash}`;
  } catch {
    return 'https://unknown.example';
  }
}

/** A page on the institution's own website (as a .example link in mocks). */
export function sitePage(institution: InstitutionRef, path: string): string {
  return `${exampleUrl(institution.website).replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
