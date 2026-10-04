// Which fix a request or a mark is about (spec 7.7): a check's fix (one per check, across the
// programs it covers) or a finding's. Stored as text on "Let AdmitLabs fix this" requests. Pure.

import { CHECK_KEYS, type CheckKey } from './types.ts';

export type FixRef = { kind: 'check'; checkKey: CheckKey } | { kind: 'finding'; findingKey: string };

export const checkFixKey = (checkKey: CheckKey): string => `check:${checkKey}`;
export const findingFixKey = (findingKey: string): string => `finding:${findingKey}`;

/** The fix a stored key names, or null when it names none. */
export function parseFixKey(value: string): FixRef | null {
  const [kind, ...rest] = value.split(':');
  const key = rest.join(':');
  if (kind === 'check' && (CHECK_KEYS as readonly string[]).includes(key)) return { kind: 'check', checkKey: key as CheckKey };
  if (kind === 'finding' && key.length > 0 && key.length <= 200) return { kind: 'finding', findingKey: key };
  return null;
}
