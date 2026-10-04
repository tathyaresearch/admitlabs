// The month's one line (spec 8.4): the rival ahead of you on the most checks, and the two checks
// where it leads you by the most. With nobody ahead anywhere, it says so. Pure: the rival job hands
// these facts to the AI writer, which writes the line, and stores it for every plan.

import type { CheckKey } from '../domain/types.ts';
import { whereTheyLead, type CheckComparison } from './compare.ts';

export interface LineRival {
  id: string;
  name: string;
  /** Its overall score, to choose between rivals ahead on as many checks. */
  overall: number;
  comparisons: readonly CheckComparison[];
}

export type LineFacts = { kind: 'ahead'; rival: { id: string; name: string }; checks: CheckKey[]; checksAhead: number } | { kind: 'none' };

/** Null until there is something to compare: your Audit and at least one rival's. */
export function lineFacts(rivals: readonly LineRival[]): LineFacts | null {
  const compared = rivals.filter((rival) => rival.comparisons.some((item) => item.lead !== 'unknown'));
  if (compared.length === 0) return null;
  const ahead = compared
    .map((rival) => ({ rival, leads: whereTheyLead(rival.comparisons) }))
    .filter((entry) => entry.leads.length > 0)
    .sort((a, b) => b.leads.length - a.leads.length || b.rival.overall - a.rival.overall || a.rival.name.localeCompare(b.rival.name));
  const top = ahead[0];
  if (!top) return { kind: 'none' };
  return {
    kind: 'ahead',
    rival: { id: top.rival.id, name: top.rival.name },
    checks: top.leads.slice(0, 2).map((item) => item.key),
    checksAhead: top.leads.length,
  };
}
