// The team's list: filters in one row (a plain form, so a filtered list can be bookmarked), and
// one quiet row per institution that opens its page.

import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { SelectField, TextField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { formatDate, hostAndPath, plural } from '@/domain/format';
import { scoreLabel } from '@/domain/scores';
import { INSTITUTION_TYPE_LABELS, INSTITUTION_TYPES, TIER_LABELS } from '@/domain/types';
import type { TeamListRow } from '@/lib/team/load';
import {
  filtersQuery,
  hasFilters,
  PLAN_FILTER_LABELS,
  PLAN_FILTERS,
  SCORE_BAND_LABELS,
  SCORE_BANDS,
  TEAM_SORT_LABELS,
  TEAM_SORTS,
  TEAM_STATUS_LABELS,
  TEAM_STATUSES,
  type TeamFilters,
} from '@/team/filters';
import styles from './team.module.css';

const any = (label: string) => ({ value: '', label });

export function InstitutionFilters({ filters, cities, states }: { filters: TeamFilters; cities: readonly string[]; states: readonly string[] }) {
  return (
    <form method="get" action="/team" className={styles.filters} role="search" aria-label="Find institutions">
      <TextField id="team-q" name="q" type="search" label="Search" placeholder="Name or website" defaultValue={filters.q} />
      <SelectField id="team-status" name="status" label="Status" defaultValue={filters.status ?? ''} options={[any('Any status'), ...TEAM_STATUSES.map((value) => ({ value, label: TEAM_STATUS_LABELS[value] }))]} />
      <SelectField id="team-tier" name="tier" label="Plan" defaultValue={filters.tier ?? ''} options={[any('Any plan'), ...PLAN_FILTERS.map((value) => ({ value, label: PLAN_FILTER_LABELS[value] }))]} />
      <SelectField id="team-score" name="score" label="Score" defaultValue={filters.score ?? ''} options={[any('Any score'), ...SCORE_BANDS.map((value) => ({ value, label: SCORE_BAND_LABELS[value] }))]} />
      <SelectField id="team-type" name="type" label="Type" defaultValue={filters.type ?? ''} options={[any('Any type'), ...INSTITUTION_TYPES.map((value) => ({ value, label: INSTITUTION_TYPE_LABELS[value] }))]} />
      <SelectField id="team-state" name="state" label="State" defaultValue={filters.state ?? ''} options={[any('Any state'), ...states.map((value) => ({ value, label: value }))]} />
      <SelectField id="team-city" name="city" label="City" defaultValue={filters.city ?? ''} options={[any('Any city'), ...cities.map((value) => ({ value, label: value }))]} />
      {filters.sort !== 'name' ? <input type="hidden" name="sort" value={filters.sort} /> : null}
      <div className={styles.filterActions}>
        <Button type="submit" size="md" icon="search">
          Find
        </Button>
      </div>
    </form>
  );
}

export function ResultLine({ filters, total }: { filters: TeamFilters; total: number }) {
  return (
    <div className={styles.resultLine}>
      <p className={styles.sorts}>
        <span>{plural(total, 'institution', 'institutions')}</span>
        {hasFilters(filters) ? (
          <Link href="/team" className={styles.clear}>
            Clear filters
          </Link>
        ) : null}
      </p>
      <p className={styles.sorts}>
        <span>Sort by</span>
        {TEAM_SORTS.map((sort) => (
          <Link key={sort} href={`/team${filtersQuery(filters, { sort, page: 1 })}`} className={styles.sort} aria-current={filters.sort === sort ? 'true' : undefined}>
            {TEAM_SORT_LABELS[sort]}
          </Link>
        ))}
      </p>
    </div>
  );
}

/** Where the latest score comes from: their own Audit once signed up, otherwise a team or rival Audit. */
function auditSource(row: TeamListRow): string {
  if (row.auditKind === 'team') return 'Team Audit';
  if (row.auditKind === 'rival') return 'Rival Audit';
  return row.auditKind ? 'Their Audit' : 'No Audit yet';
}

export function InstitutionRows({ rows }: { rows: readonly TeamListRow[] }) {
  return (
    <div className={styles.list}>
      {rows.map((row) => (
        <Link key={row.id} href={`/team/institutions/${row.id}`} className={styles.listRow}>
          <span className={styles.rowName}>
            {row.name}
            <span className={styles.rowSub}>{hostAndPath(row.website)}</span>
          </span>
          <span className={styles.rowCell}>
            {row.city}
            <span className={styles.rowSub}>{INSTITUTION_TYPE_LABELS[row.type]}</span>
          </span>
          <span className={styles.rowCell}>
            <span>
              <Tag variant={row.status === 'prospect' ? 'solid' : row.status === 'signed_up' ? 'outline' : 'quiet'}>{TEAM_STATUS_LABELS[row.status]}</Tag>
            </span>
            <span className={styles.rowSub}>
              {row.tier ? `${TIER_LABELS[row.tier]}${row.tier === 'paid' && row.planEndsAt ? `, ends ${formatDate(row.planEndsAt)}` : ''}` : 'Not signed up'}
            </span>
          </span>
          <span className={styles.rowScore}>
            {row.score !== null ? <span className={`${styles.rowScoreNumber} num`}>{row.score}</span> : null}
            <span>{row.score !== null ? scoreLabel(row.score) : 'No score'}</span>
          </span>
          <span className={styles.rowCell}>
            {row.checkedAt ? formatDate(row.checkedAt) : 'Not checked'}
            <span className={styles.rowSub}>{auditSource(row)}</span>
          </span>
          <Icon name="chevronRight" size={16} className={styles.chevron} />
        </Link>
      ))}
    </div>
  );
}

export function Pages({ filters, total, perPage }: { filters: TeamFilters; total: number; perPage: number }) {
  const last = Math.max(1, Math.ceil(total / perPage));
  if (last === 1) return null;
  return (
    <nav className={styles.pages} aria-label="Pages">
      {filters.page > 1 ? (
        <ButtonLink href={`/team${filtersQuery(filters, { page: filters.page - 1 })}`} variant="secondary" size="sm" icon="chevronLeft">
          Previous
        </ButtonLink>
      ) : (
        <span />
      )}
      <span>
        Page {Math.min(filters.page, last)} of {last}
      </span>
      {filters.page < last ? (
        <ButtonLink href={`/team${filtersQuery(filters, { page: filters.page + 1 })}`} variant="secondary" size="sm" iconAfter="chevronRight">
          Next
        </ButtonLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
