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

export type EntitlementGroup = 'Audit' | 'Rivals' | 'Demand' | 'Leads' | 'Other';

export interface EntitlementRow {
  key: EntitlementKey;
  group: EntitlementGroup;
  label: string;
  cells: Readonly<Record<Tier, EntitlementCell>>;
}

export const ENTITLEMENT_KEYS = [
  'audit_words',
  'audit_places',
  'audit_found',
  'audit_good',
  'audit_what_to_fix',
  'audit_people_other',
  'audit_programs',
  'audit_score_history',
  'audit_fix_request',
  'rivals_suggested',
  'rivals_ahead_or_behind',
  'rivals_line',
  'rivals_full_comparison',
  'rivals_change',
  'demand_make_three',
  'demand_programs',
  'demand_everything_else',
  'leads',
  'alerts',
  'audit_ready_email',
  'monthly_summary',
  'monthly_report',
  'team_acts_on_it',
  'team_work',
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

const YES: EntitlementCell = { access: 'full', text: 'Yes' };
const NO: EntitlementCell = { access: 'none', text: 'No' };
const BLURRED: EntitlementCell = { access: 'placeholder', text: 'A preview' };
const all = (cell: EntitlementCell) => ({ free: cell, paid: cell, client: cell });

/**
 * Rows where a higher plan gets something else instead, so it is not a step up: a Client has the
 * team working on every fix, and Paid and Client get the monthly summary instead of Free's email.
 */
export const INSTEAD: ReadonlySet<EntitlementKey> = new Set(['audit_fix_request', 'audit_ready_email']);

export const ENTITLEMENTS: readonly EntitlementRow[] = [
  { key: 'audit_words', group: 'Audit', label: 'Discovered, Trusted and Chosen', cells: all(YES) },
  { key: 'audit_places', group: 'Audit', label: 'Every place: each check’s result', cells: all(YES) },
  {
    key: 'audit_found',
    group: 'Audit',
    label: 'What we found, with proof',
    cells: {
      free: { access: 'partial', text: 'For its top 3 fixes and strengths' },
      paid: { access: 'full', text: 'Everything' },
      client: { access: 'full', text: 'Everything' },
    },
  },
  {
    key: 'audit_good',
    group: 'Audit',
    label: 'What’s good',
    cells: {
      free: { access: 'partial', limit: 3, text: 'Top 3' },
      paid: { access: 'full', text: 'Full' },
      client: { access: 'full', text: 'Full' },
    },
  },
  {
    key: 'audit_what_to_fix',
    group: 'Audit',
    label: 'What to fix: steps, ready fix, effort, impact',
    cells: {
      free: { access: 'partial', limit: 3, text: 'Top 3' },
      paid: { access: 'full', text: 'Full ranked list' },
      client: { access: 'full', text: 'Full ranked list' },
    },
  },
  { key: 'audit_people_other', group: 'Audit', label: 'What people say and Other places', cells: { free: BLURRED, paid: YES, client: YES } },
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
  { key: 'audit_score_history', group: 'Audit', label: 'Progress month by month, with the score', cells: { free: NO, paid: YES, client: YES } },
  {
    key: 'audit_fix_request',
    group: 'Audit',
    label: 'Let AdmitLabs fix this',
    cells: { free: YES, paid: YES, client: { access: 'none', text: 'No: the team already works on it' } },
  },
  { key: 'rivals_suggested', group: 'Rivals', label: 'Suggested rivals, your city first', cells: all(YES) },
  { key: 'rivals_ahead_or_behind', group: 'Rivals', label: 'Ahead or behind each rival', cells: all(YES) },
  { key: 'rivals_line', group: 'Rivals', label: 'This month’s one line', cells: all(YES) },
  { key: 'rivals_full_comparison', group: 'Rivals', label: 'Ranking, place by place, what to learn, alerts', cells: { free: BLURRED, paid: YES, client: YES } },
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
  {
    key: 'demand_make_three',
    group: 'Demand',
    label: 'Make these 3 this month',
    cells: {
      free: { access: 'partial', limit: 1, text: 'The first one, for its program' },
      paid: { access: 'full', text: 'All 3' },
      client: { access: 'full', text: 'All 3' },
    },
  },
  {
    key: 'demand_programs',
    group: 'Demand',
    label: 'Programs rising and falling',
    cells: {
      free: { access: 'partial', limit: 1, text: '1' },
      paid: { access: 'full', text: 'All' },
      client: { access: 'full', text: 'All' },
    },
  },
  { key: 'demand_everything_else', group: 'Demand', label: 'Everything else', cells: { free: BLURRED, paid: YES, client: YES } },
  { key: 'leads', group: 'Leads', label: 'Leads: the enquiries your content brings', cells: { free: NO, paid: NO, client: YES } },
  { key: 'alerts', group: 'Other', label: 'Alerts (rival moves, demand spikes)', cells: { free: NO, paid: YES, client: YES } },
  {
    key: 'audit_ready_email',
    group: 'Other',
    label: 'Email when a new free Audit is ready',
    cells: {
      free: YES,
      paid: { access: 'none', text: 'No: the monthly summary covers it' },
      client: { access: 'none', text: 'No: the monthly summary covers it' },
    },
  },
  { key: 'monthly_summary', group: 'Other', label: 'Monthly summary by email', cells: { free: NO, paid: YES, client: YES } },
  { key: 'monthly_report', group: 'Other', label: 'Monthly PDF report', cells: { free: NO, paid: YES, client: YES } },
  { key: 'team_acts_on_it', group: 'Other', label: 'AdmitLabs team acts on it', cells: { free: NO, paid: NO, client: YES } },
  { key: 'team_work', group: 'Other', label: 'Your AdmitLabs team: what the team did, and does next', cells: { free: NO, paid: NO, client: YES } },
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
  return ENTITLEMENTS.filter((row) => !INSTEAD.has(row.key) && accessRank(row.cells.paid.access) > accessRank(row.cells.free.access));
}

/**
 * The Plan page's comparison, grouped as a reader looks for it: Audit, Rivals, Demand, Leads,
 * Reports and emails, then the AdmitLabs service. Every row appears once (a test checks it).
 */
export const PLAN_PAGE_GROUPS: ReadonlyArray<{ title: string; keys: readonly EntitlementKey[] }> = [
  {
    title: 'Audit',
    keys: ['audit_words', 'audit_places', 'audit_found', 'audit_good', 'audit_what_to_fix', 'audit_people_other', 'audit_programs', 'audit_score_history', 'audit_fix_request'],
  },
  { title: 'Rivals', keys: ['rivals_suggested', 'rivals_ahead_or_behind', 'rivals_line', 'rivals_full_comparison', 'rivals_change'] },
  { title: 'Demand', keys: ['demand_make_three', 'demand_programs', 'demand_everything_else'] },
  { title: 'Leads', keys: ['leads'] },
  { title: 'Reports and emails', keys: ['monthly_summary', 'monthly_report', 'audit_ready_email', 'alerts'] },
  { title: 'AdmitLabs service', keys: ['team_acts_on_it', 'team_work'] },
];
