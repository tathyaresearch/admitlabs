// The team's list of institutions: search, filters, sort and page, read from the address so a
// filtered list can be bookmarked and shared (spec section 13). Pure.

import { SCORING_V1 } from '../config/scoring.v1.ts';
import { TEAM_RULES } from '../config/team.ts';
import { INSTITUTION_TYPES, TIER_LABELS, TIERS, type InstitutionType } from '../domain/types.ts';

export const TEAM_STATUSES = ['prospect', 'signed_up', 'rival_record'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export const TEAM_STATUS_LABELS: Readonly<Record<TeamStatus, string>> = {
  prospect: 'Prospect',
  signed_up: 'Signed up',
  rival_record: 'Rival record',
};

export const SCORE_BANDS = ['strong', 'needs_work', 'getting_started', 'none'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const SCORE_BAND_LABELS: Readonly<Record<ScoreBand, string>> = {
  strong: 'Strong',
  needs_work: 'Needs work',
  getting_started: 'Getting started',
  none: 'No Audit yet',
};

/** A plan, or "Ending soon": Paid plans ending within TEAM_RULES.paidEndingSoonDays (the count at the top of the list). */
export const PLAN_FILTERS = [...TIERS, 'paid_ending'] as const;
export type PlanFilter = (typeof PLAN_FILTERS)[number];

export const PLAN_FILTER_LABELS: Readonly<Record<PlanFilter, string>> = {
  ...TIER_LABELS,
  paid_ending: 'Ending soon',
};

/** "Needs attention" first: the most urgent reason at the top (src/team/attention.ts). */
export const TEAM_SORTS = ['attention', 'name', 'score', 'checked'] as const;
export type TeamSort = (typeof TEAM_SORTS)[number];

export const TEAM_SORT_LABELS: Readonly<Record<TeamSort, string>> = {
  attention: 'Needs attention',
  name: 'Name',
  score: 'Score',
  checked: 'Last checked',
};

export interface TeamFilters {
  q: string;
  type: InstitutionType | null;
  city: string | null;
  state: string | null;
  status: TeamStatus | null;
  tier: PlanFilter | null;
  score: ScoreBand | null;
  sort: TeamSort;
  page: number;
}

export const NO_FILTERS: TeamFilters = { q: '', type: null, city: null, state: null, status: null, tier: null, score: null, sort: 'attention', page: 1 };

type Params = Readonly<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

function pick<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Filters from the address. Anything unknown is ignored rather than failing. */
export function parseFilters(params: Params): TeamFilters {
  const page = Number.parseInt(one(params.page), 10);
  return {
    q: one(params.q).slice(0, 80),
    type: pick(one(params.type), INSTITUTION_TYPES),
    city: one(params.city) || null,
    state: one(params.state) || null,
    status: pick(one(params.status), TEAM_STATUSES),
    tier: pick(one(params.tier), PLAN_FILTERS),
    score: pick(one(params.score), SCORE_BANDS),
    sort: pick(one(params.sort), TEAM_SORTS) ?? 'attention',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** The address query for these filters, leaving out what is the default. */
export function filtersQuery(filters: TeamFilters, changes: Partial<TeamFilters> = {}): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  for (const key of ['type', 'city', 'state', 'status', 'tier', 'score'] as const) {
    const value = next[key];
    if (value) params.set(key, value);
  }
  if (next.sort !== 'attention') params.set('sort', next.sort);
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function hasFilters(filters: TeamFilters): boolean {
  return Boolean(filters.q || filters.type || filters.city || filters.state || filters.status || filters.tier || filters.score);
}

const BAND_LABEL: Readonly<Record<Exclude<ScoreBand, 'none'>, string>> = { strong: 'Strong', needs_work: 'Needs work', getting_started: 'Getting started' };

/** The scores a band covers, from the scoring config: Strong is 70 to 100. */
export function scoreRange(band: Exclude<ScoreBand, 'none'>): { min: number; max: number } {
  const found = SCORING_V1.labels.find((entry) => entry.label === BAND_LABEL[band]);
  if (!found) throw new Error(`No score band for ${band}`);
  return { min: found.min, max: found.max };
}

/** The search as a quoted "contains" pattern for a name or website match. Characters that would change the filter are dropped. */
export function searchPattern(q: string): string | null {
  const clean = q.replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim();
  return clean ? `"*${clean}*"` : null;
}

/** Which rows a page shows: 1 is the first. */
export function pageRange(page: number, perPage: number = TEAM_RULES.institutionsPerPage): { from: number; to: number } {
  const from = (Math.max(1, page) - 1) * perPage;
  return { from, to: from + perPage - 1 };
}
