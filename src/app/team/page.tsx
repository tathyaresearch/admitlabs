import type { Metadata } from 'next';
import Link from 'next/link';
import { AuditHeader } from '@/components/audit/AuditHeader';
import { InstitutionFilters, InstitutionRows, Pages, ResultLine } from '@/components/team/InstitutionList';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { TEAM_RULES } from '@/config/team';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadInstitutionList, loadListCounts, loadPlaces } from '@/lib/team/load';
import { filtersQuery, NO_FILTERS, parseFilters } from '@/team/filters';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Institutions' : 'Page not found' };
}

export default async function TeamHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeamViewer();
  const filters = parseFilters(await searchParams);
  const now = new Date();
  const [{ rows, total }, counts, places] = await Promise.all([loadInstitutionList(filters, now), loadListCounts(now), loadPlaces()]);

  const shortcuts = [
    { label: 'Signed up', value: counts.signedUp, href: filtersQuery({ ...NO_FILTERS, status: 'signed_up' }) },
    { label: 'Clients', value: counts.clients, href: filtersQuery({ ...NO_FILTERS, tier: 'client' }) },
    { label: 'Prospects', value: counts.prospects, href: filtersQuery({ ...NO_FILTERS, status: 'prospect' }) },
    { label: `Paid ending in ${TEAM_RULES.paidEndingSoonDays} days`, value: counts.endingSoon, href: filtersQuery({ ...NO_FILTERS, tier: 'paid_ending' }) },
  ];

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <AuditHeader
          title="Institutions"
          caption={['Everyone in Drishti: signed up, prospects and rival records', 'Prospects and notes are team only']}
          actions={
            <ButtonLink href="/team/bulk" icon="plus">
              Bulk Audit
            </ButtonLink>
          }
        />
        <div className={styles.counts}>
          {shortcuts.map((item) => (
            <Link key={item.label} href={`/team${item.href}`} className={styles.count}>
              <span className={styles.countValue}>{item.value}</span>
              <span className={styles.countLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <section className={audit.section} aria-label="Institutions">
        <InstitutionFilters filters={filters} cities={places.cities} states={places.states} />
        <ResultLine filters={filters} total={total} />
        {rows.length ? (
          <InstitutionRows rows={rows} />
        ) : (
          <EmptyState icon="search" title="No institutions match" headingLevel={3}>
            Try fewer filters, or add prospects with a bulk Audit.
          </EmptyState>
        )}
        <Pages filters={filters} total={total} perPage={TEAM_RULES.institutionsPerPage} />
      </section>
    </div>
  );
}
