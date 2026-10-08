import type { Metadata } from 'next';
import Link from 'next/link';
import { InstitutionFilters, InstitutionRows, Pages, ResultLine } from '@/components/team/InstitutionList';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { TEAM_RULES } from '@/config/team';
import { LinkTabs } from '@/components/ui/LinkTabs';
import { requireTeamViewer } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { isFullTeam } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { loadInstitutionList, loadListCounts, loadPlaces } from '@/lib/team/load';
import { filtersQuery, hasFilters, NO_FILTERS, parseFilters } from '@/team/filters';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: isFullTeam(viewer?.teamRole) ? 'Institutions' : 'Page not found' };
}

// Institutions by plan (spec section 27): All, then Free, Paid and Client. Those not signed up
// (prospects and rival records) show under All.
const PLAN_TABS: ReadonlyArray<{ tier: 'free' | 'paid' | 'client' | null; label: string }> = [
  { tier: null, label: 'All' },
  { tier: 'free', label: 'Free' },
  { tier: 'paid', label: 'Paid' },
  { tier: 'client', label: 'Client' },
];

// The team's home answers "Who needs attention?": four counts that also filter the list, then the
// list itself with search and filters.
export default async function TeamHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireTeamViewer();
  // A Client manager's team area starts at their Clients.
  if (!isFullTeam(viewer.teamRole)) redirect('/team/clients');
  const filters = parseFilters(await searchParams);
  const now = new Date();
  const [{ rows, total }, counts, places] = await Promise.all([loadInstitutionList(filters), loadListCounts(), loadPlaces()]);

  // A count is "on" when the list shows exactly what it counts.
  const current = filtersQuery({ ...filters, sort: 'name', page: 1 });
  const shortcuts = [
    { label: 'Signed up', value: counts.signedUp, href: filtersQuery({ ...NO_FILTERS, status: 'signed_up' }) },
    { label: 'Clients', value: counts.clients, href: filtersQuery({ ...NO_FILTERS, tier: 'client' }) },
    { label: 'Prospects', value: counts.prospects, href: filtersQuery({ ...NO_FILTERS, status: 'prospect' }) },
    { label: 'Paid ending soon', value: counts.endingSoon, href: filtersQuery({ ...NO_FILTERS, tier: 'paid_ending' }) },
  ];

  return (
    <div className={audit.page}>
      <PageHead
        title="Institutions"
        question="Who needs attention?"
        caption={['Everyone in Drishti: signed up, prospects and rival records', 'Prospects and notes are team only']}
        actions={
          <ButtonLink href="/team/bulk" icon="plus">
            Bulk Audit
          </ButtonLink>
        }
      />

      <nav className={styles.counts} aria-label="Show only">
        {shortcuts.map((item) => {
          const on = current === item.href;
          return (
            <Link key={item.label} href={on ? '/team' : `/team${item.href}`} className={styles.count} aria-current={on ? 'true' : undefined}>
              <span className={styles.countLabel}>{item.label}</span>
              <span className={`${styles.countValue} num`}>{item.value}</span>
              <span className={styles.countAction}>{on ? 'Show all' : 'Show these'}</span>
            </Link>
          );
        })}
      </nav>

      <section className={audit.section} aria-label="Institutions">
        <LinkTabs
          label="Plan"
          tabs={PLAN_TABS.map((tab) => ({
            href: `/team${filtersQuery({ ...filters, tier: tab.tier, page: 1 })}`,
            label: tab.label,
            current: tab.tier === null ? filters.tier === null : tab.tier === 'paid' ? filters.tier === 'paid' || filters.tier === 'paid_ending' : filters.tier === tab.tier,
          }))}
        />
        <InstitutionFilters filters={filters} cities={places.cities} states={places.states} />
        <ResultLine filters={filters} total={total} />
        {rows.length ? (
          <InstitutionRows rows={rows} now={now} />
        ) : hasFilters(filters) || filters.page > 1 ? (
          <EmptyState icon="search" title="No institutions match" headingLevel={3}>
            Try fewer filters, or add prospects with a bulk Audit.
          </EmptyState>
        ) : (
          <EmptyState
            icon="institution"
            title="No institutions yet"
            headingLevel={3}
            action={
              <ButtonLink href="/team/bulk" size="sm" icon="plus">
                Run a bulk Audit
              </ButtonLink>
            }
          >
            Institutions that sign up show here on their own. To add prospects, run a bulk Audit: paste a list or choose a CSV file, and each one gets a private team Audit.
          </EmptyState>
        )}
        <Pages filters={filters} total={total} perPage={TEAM_RULES.institutionsPerPage} />
      </section>
    </div>
  );
}
