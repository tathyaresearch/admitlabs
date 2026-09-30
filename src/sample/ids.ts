// Stable ids for sample rows, so links and tests survive `npm run db:reset`.

import { createHash } from 'node:crypto';

const NAMESPACE = 'drishti-sample-v1';

/** A version 5 style UUID derived from a name. The same name always gives the same id. */
export function sampleId(...parts: string[]): string {
  const bytes = createHash('sha1').update(`${NAMESPACE}:${parts.join(':')}`).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const institutionId = (slug: string) => sampleId('institution', slug);
export const programId = (slug: string, programKey: string) => sampleId('program', slug, programKey);
