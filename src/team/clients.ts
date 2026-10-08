// The team's Clients (spec section 27): every Client with its Brain, who looks after it and what
// waits for review. A Client manager sees the Clients assigned to them; the database decides
// that (private.manages). Pure.

import { plural } from '../domain/format.ts';
import type { BrainState } from '../brain/line.ts';

/** A Client's Brain in a few words, for the team: "Onboarding, 80%", "Ready", "Ready, 2 facts to check". */
export function clientBrainLine(state: BrainState | null): string {
  if (!state) return 'Onboarding not started';
  if (state.status === 'onboarding') return `Onboarding, ${state.percent}%`;
  return state.stale ? `Ready, ${plural(state.stale, 'fact', 'facts')} to check` : 'Ready';
}

/** Who looks after a Client: "Farhan Ali", "Farhan Ali and Isha Roy", or that nobody does yet. */
export function managersLine(names: readonly string[]): string {
  if (!names.length) return 'No Client manager';
  if (names.length === 1) return names[0] as string;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The Clients list's filter by who looks after them: anyone, nobody yet, or one Client manager. */
export type ManagerFilter = { kind: 'any' } | { kind: 'none' } | { kind: 'person'; userId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseManagerFilter(value: string | string[] | undefined): ManagerFilter {
  const one = Array.isArray(value) ? value[0] : value;
  if (one === 'none') return { kind: 'none' };
  if (one && UUID.test(one)) return { kind: 'person', userId: one.toLowerCase() };
  return { kind: 'any' };
}

export function matchesManager(filter: ManagerFilter, managerIds: readonly string[]): boolean {
  if (filter.kind === 'any') return true;
  if (filter.kind === 'none') return managerIds.length === 0;
  return managerIds.includes(filter.userId);
}
