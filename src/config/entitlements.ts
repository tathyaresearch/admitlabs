// What each plan sees (spec section 10), as data. The server reads this to decide what it
// may send; the UI reads the same rows to show the plans table. Wording follows the spec.

import type { Tier } from '../domain/types.ts';

/**
 * full: everything. partial: a limited slice (see limit or every).
 * placeholder: layout only, filled with fake placeholder content, never real data.
 * none: not shown at all.
 */
export type Access = 'full' | 'partial' | 'placeholder' | 'none';

export interface EntitlementCell {
  access: Access;
  /** For partial rows with a count, for example Top 3 or 1 program. */
  limit?: number;
  /** For partial rows with a cadence, for example changing rivals once a month. */
  every?: 'month';
  /** The words shown in the plans table. */
  text: string;
}

export type EntitlementGroup = 'Audit' | 'Rivals' | 'Demand' | 'Other';

export interface EntitlementRow {
  key: EntitlementKey;
  group: EntitlementGroup;
  label: string;
  cells: Readonly<Record<Tier, EntitlementCell>>;
}

export const ENTITLEMENT_KEYS = [
  'audit_scores',
  'audit_area_by_area',
  'audit_whats_working',
  'audit_what_to_fix',
  'audit_programs',
  'audit_score_history',
  'rivals_suggested',
  'rivals_ahead_or_behind',
  'rivals_full_comparison',
  'rivals_change',
  'demand_rising_trend',
  'demand_everything_else',
  'demand_mentions',
  'alerts',
  'monthly_report',
  'team_acts_on_it',
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

const YES: EntitlementCell = { access: 'full', text: 'Yes' };
const NO: EntitlementCell = { access: 'none', text: 'No' };
const BLURRED: EntitlementCell = { access: 'placeholder', text: 'A preview' };
const all = (cell: EntitlementCell) => ({ free: cell, paid: cell, client: cell });

export const ENTITLEMENTS: readonly EntitlementRow[] = [
  { key: 'audit_scores', group: 'Audit', label: 'Overall score and its 3 parts', cells: all(YES) },
  {
    key: 'audit_area_by_area',
    group: 'Audit',
    label: 'Every check',
    cells: {
      free: { access: 'partial', text: 'The result of each' },
      paid: { access: 'full', text: 'What was found, with sources' },
      client: { access: 'full', text: 'What was found, with sources' },
    },
  },
  {
    key: 'audit_whats_working',
    group: 'Audit',
    label: "What's working",
    cells: {
      free: { access: 'partial', limit: 3, text: 'Top 3' },
      paid: { access: 'full', text: 'Full' },
      client: { access: 'full', text: 'Full' },
    },
  },
  {
    key: 'audit_what_to_fix',
    group: 'Audit',
    label: 'What to fix',
    cells: {
      free: { access: 'partial', limit: 3, text: 'Top 3' },
      paid: { access: 'full', text: 'Full ranked list' },
      client: { access: 'full', text: 'Full ranked list' },
    },
  },
  {
    key: 'audit_programs',
    group: 'Audit',
    label: 'Programs',
    cells: {
      free: { access: 'partial', limit: 1, text: '1' },
      paid: { access: 'full', text: 'All' },
      client: { access: 'full', text: 'All' },
    },
  },
  { key: 'audit_score_history', group: 'Audit', label: 'Progress, month by month', cells: { free: NO, paid: YES, client: YES } },
  { key: 'rivals_suggested', group: 'Rivals', label: 'Suggested rivals', cells: all(YES) },
  { key: 'rivals_ahead_or_behind', group: 'Rivals', label: 'Ahead or behind (overall only)', cells: all(YES) },
  {
    key: 'rivals_full_comparison',
    group: 'Rivals',
    label: 'Full comparison, best content, moves, ads',
    cells: { free: BLURRED, paid: YES, client: YES },
  },
  {
    key: 'rivals_change',
    group: 'Rivals',
    label: 'Change rivals',
    cells: {
      free: NO,
      paid: { access: 'partial', every: 'month', text: 'Once a month' },
      client: { access: 'full', text: 'Anytime' },
    },
  },
  { key: 'demand_rising_trend', group: 'Demand', label: '1 rising trend', cells: all(YES) },
  { key: 'demand_everything_else', group: 'Demand', label: 'Everything else', cells: { free: BLURRED, paid: YES, client: YES } },
  { key: 'demand_mentions', group: 'Demand', label: 'Mentions of you and rivals', cells: { free: NO, paid: YES, client: YES } },
  { key: 'alerts', group: 'Other', label: 'Alerts (rival moves, demand spikes)', cells: { free: NO, paid: YES, client: YES } },
  { key: 'monthly_report', group: 'Other', label: 'Monthly PDF report', cells: { free: NO, paid: YES, client: YES } },
  { key: 'team_acts_on_it', group: 'Other', label: 'AdmitLabs team acts on it', cells: { free: NO, paid: NO, client: YES } },
];

const BY_KEY = new Map<EntitlementKey, EntitlementRow>(ENTITLEMENTS.map((row) => [row.key, row]));

export function entitlement(key: EntitlementKey, tier: Tier): EntitlementCell {
  const row = BY_KEY.get(key);
  if (!row) throw new Error(`Unknown entitlement: ${key}`);
  return row.cells[tier];
}

/** True when the tier may receive real data for this row (all of it, or a limited slice). */
export function canSee(key: EntitlementKey, tier: Tier): boolean {
  const { access } = entitlement(key, tier);
  return access === 'full' || access === 'partial';
}

/** True when the tier sees this row as a blurred placeholder only. */
export function isPlaceholder(key: EntitlementKey, tier: Tier): boolean {
  return entitlement(key, tier).access === 'placeholder';
}

/** How many items the tier may receive, or null for no limit. */
export function limitFor(key: EntitlementKey, tier: Tier): number | null {
  const cell = entitlement(key, tier);
  if (cell.access === 'none' || cell.access === 'placeholder') return 0;
  return cell.limit ?? null;
}

const ACCESS_ORDER: Readonly<Record<Access, number>> = { none: 0, placeholder: 1, partial: 2, full: 3 };

export function accessRank(access: Access): number {
  return ACCESS_ORDER[access];
}

/** Rows where Paid gives more than Free: "what Paid unlocks". */
export function paidUnlocks(): EntitlementRow[] {
  return ENTITLEMENTS.filter((row) => accessRank(row.cells.paid.access) > accessRank(row.cells.free.access));
}

/**
 * The Plan page's comparison, grouped as a reader looks for it: Audit, Rivals, Demand, Reports
 * (the monthly report and alerts), then the AdmitLabs service. Every row appears once (a test
 * checks it). The product page keeps the groups above.
 */
export const PLAN_PAGE_GROUPS: ReadonlyArray<{ title: string; keys: readonly EntitlementKey[] }> = [
  { title: 'Audit', keys: ['audit_scores', 'audit_area_by_area', 'audit_whats_working', 'audit_what_to_fix', 'audit_programs', 'audit_score_history'] },
  { title: 'Rivals', keys: ['rivals_suggested', 'rivals_ahead_or_behind', 'rivals_full_comparison', 'rivals_change'] },
  { title: 'Demand', keys: ['demand_rising_trend', 'demand_everything_else', 'demand_mentions'] },
  { title: 'Reports', keys: ['monthly_report', 'alerts'] },
  { title: 'AdmitLabs service', keys: ['team_acts_on_it'] },
];
