import type { Metadata } from 'next';
import Link from 'next/link';
import { AddLeadForm, TeamLinkForm } from '@/components/team/EnquiryForms';
import { CopyLink } from '@/components/team/InstitutionPanels';
import { Button, AnchorButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { SelectField, TextField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { LinkTabs } from '@/components/ui/LinkTabs';
import { formatDate, plural } from '@/domain/format';
import { isFullTeam } from '@/domain/types';
import { leadTitle, sourceLine, TEAM_LEAD_SOURCE_LABELS, TEAM_LEAD_SOURCES, TEAM_LEAD_STATUS_LABELS } from '@/enquiries/model';
import { followUpState, followUpWords, hasLeadFilters, indiaToday, LEAD_VIEW_LABELS, LEAD_VIEWS, leadFiltersQuery, parseLeadFilters } from '@/enquiries/view';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadLeadCounts, loadLeadList, loadTeamLinks } from '@/lib/team/enquiries';
import { loadTeamPeople } from '@/lib/team/load';
import { SITE_URL } from '@/lib/urls';
import { getLeadImportProvider } from '@/providers/registry';
import { addLeadAction, archiveLinkAction, createLinkAction } from './actions';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Enquiries' : 'Page not found' };
}

// Enquiries (spec section 27): AdmitLabs' own leads, never students. The open ones first, by the
// next follow-up; filters by status, source and owner; add one by hand; the CSV. The full team
// sees every lead and the tracking links; a Client manager sees the leads they own.
export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireTeamViewer();
  const full = isFullTeam(viewer.teamRole);
  const filters = parseLeadFilters(await searchParams);
  const today = indiaToday(new Date());
  const [{ rows, total, capped }, counts, people, links, importer] = await Promise.all([
    loadLeadList(filters, viewer.userId, today),
    loadLeadCounts(today),
    full ? loadTeamPeople() : Promise.resolve([]),
    full ? loadTeamLinks() : Promise.resolve([]),
    full ? getLeadImportProvider().status() : Promise.resolve(null),
  ]);
  const owners = people.filter((person) => person.userId && !person.pending).map((person) => ({ value: person.userId as string, label: person.userId === viewer.userId ? `${person.name ?? person.email} (you)` : (person.name ?? person.email) }));
  const csv = `/team/enquiries/csv${leadFiltersQuery(filters)}`;

  return (
    <div className={audit.page}>
      <PageHead
        title="Enquiries"
        question={full ? 'Who wants to work with AdmitLabs?' : 'Who are you following up?'}
        caption={[
          `${counts.open} open`,
          `${counts.fresh} new`,
          counts.due ? `${plural(counts.due, 'follow-up', 'follow-ups')} due` : 'No follow-ups due',
          full ? 'Our own leads, never students' : 'The enquiries you own',
        ]}
        actions={
          <AnchorButton href={csv} variant="secondary" icon="download">
            Download CSV
          </AnchorButton>
        }
      />

      <details className={styles.addLead}>
        <summary className={styles.addLeadSummary}>
          <Icon name="plus" size={16} />
          Add a lead by hand
        </summary>
        <p className={styles.formNote}>
          From a call, an event or a message. The same phone or email joins the lead there is.{full ? '' : ' It is yours.'}
        </p>
        <AddLeadForm action={addLeadAction} owners={full ? owners : null} today={today} />
      </details>

      <section className={audit.section} aria-label="Enquiries">
        <LinkTabs
          label="Status"
          tabs={LEAD_VIEWS.map((view) => ({ href: `/team/enquiries${leadFiltersQuery(filters, { view })}`, label: LEAD_VIEW_LABELS[view], current: filters.view === view }))}
        />
        <form method="get" action="/team/enquiries" className={styles.leadFilters} role="search" aria-label="Find enquiries">
          {filters.view !== 'open' ? <input type="hidden" name="view" value={filters.view} /> : null}
          <TextField id="lead-q" name="q" type="search" label="Search" placeholder="Name, institution, email or phone" defaultValue={filters.q} />
          <SelectField id="lead-source-filter" name="source" label="Source" defaultValue={filters.source ?? ''} options={[{ value: '', label: 'Any source' }, ...TEAM_LEAD_SOURCES.map((value) => ({ value, label: TEAM_LEAD_SOURCE_LABELS[value] }))]} />
          {full ? (
            <SelectField
              id="lead-owner-filter"
              name="owner"
              label="Owner"
              defaultValue={filters.owner ?? ''}
              options={[{ value: '', label: 'Anyone' }, { value: 'me', label: 'Mine' }, { value: 'none', label: 'Nobody yet' }, ...owners]}
            />
          ) : null}
          <label className={styles.dueToggle}>
            <input type="checkbox" name="due" value="1" defaultChecked={filters.due} />
            Follow-up due
          </label>
          <Button type="submit" variant="secondary" icon="search">
            Find
          </Button>
        </form>
        <p className={styles.resultLine}>
          {capped ? `The first 500 of ${total}` : plural(total, 'lead', 'leads')}
          {hasLeadFilters(filters) ? (
            <Link href={`/team/enquiries${leadFiltersQuery({ ...filters, source: null, owner: null, due: false, q: '' })}`} className={styles.link}>
              Clear filters
            </Link>
          ) : null}
        </p>

        {rows.length ? (
          <div className={styles.list}>
            <div className={`${styles.listHead} ${styles.leadHead}`} aria-hidden="true">
              <span>Lead</span>
              <span>Status</span>
              <span>Source</span>
              <span>Owner</span>
              <span>Next follow-up</span>
              <span />
            </div>
            {rows.map((lead) => {
              const due = followUpState(lead.nextFollowUp, lead.status, today);
              return (
                <Link key={lead.id} href={`/team/enquiries/${lead.id}`} className={`${styles.listRow} ${styles.leadRow}`}>
                  <span className={styles.rowName}>
                    {leadTitle(lead)}
                    <span className={styles.rowSub}>{[lead.name ? lead.institution : null, lead.city].filter(Boolean).join(', ') || 'No institution yet'}</span>
                    {lead.wants ? <span className={styles.leadWants}>{lead.wants}</span> : null}
                    <span className={styles.leadPhoneOnly}>
                      {TEAM_LEAD_STATUS_LABELS[lead.status]}. {sourceLine(lead.source, lead.sourceDetail)}. {lead.owner ?? 'Nobody owns it yet'}
                    </span>
                    {lead.cameBack || due === 'overdue' || due === 'today' ? (
                      <span className={styles.rowReasons}>
                        {due === 'overdue' || due === 'today' ? <span className={styles.rowReason}>{due === 'overdue' ? 'Follow-up overdue' : 'Follow up today'}</span> : null}
                        {lead.cameBack ? <span className={styles.rowReason}>Came back {formatDate(lead.lastInAt)}</span> : null}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.rowCell}>
                    <span className={styles.rowStatus}>{TEAM_LEAD_STATUS_LABELS[lead.status]}</span>
                    <span className={styles.rowSub}>Came in {formatDate(lead.createdAt)}</span>
                  </span>
                  <span className={styles.rowCell}>{sourceLine(lead.source, lead.sourceDetail)}</span>
                  <span className={styles.rowCell}>{lead.ownerId === viewer.userId ? 'You' : (lead.owner ?? 'Nobody yet')}</span>
                  <span className={styles.rowCell}>{followUpWords(lead.nextFollowUp, lead.status, today)}</span>
                  <Icon name="chevronRight" size={16} className={styles.chevron} />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="enquiry" title={hasLeadFilters(filters) || filters.view !== 'open' ? 'No leads match' : full ? 'No open leads' : 'No enquiries of yours yet'} headingLevel={2}>
            {full
              ? 'Leads come in from the website’s Talk to us form, new Free colleges, Let AdmitLabs fix this, the services card and Paid requests. Add one by hand from a call or an event.'
              : 'When the team gives you an enquiry, or you add one by hand, it shows here.'}
          </EmptyState>
        )}
      </section>

      {full ? (
        <section className={audit.section} aria-labelledby="links-title">
          <h2 id="links-title" className={styles.sectionTitle}>
            Tracking links
          </h2>
          <p className={styles.formNote}>Put one in a bio, a post or an event’s QR code. It opens the Talk to us form, and what comes in through it is tagged with its source.</p>
          <TeamLinkForm action={createLinkAction} />
          {links.length ? (
            <ul className={styles.linkList}>
              {links.map((link) => {
                const url = `${SITE_URL}/talk/${link.code}`;
                return (
                  <li key={link.id} className={styles.linkRow}>
                    <span className={styles.rowName}>
                      {link.name}
                      <span className={styles.rowSub}>
                        {TEAM_LEAD_SOURCE_LABELS[link.source]}. {url.replace(/^https?:\/\//, '')}
                        {link.archivedAt ? `. Archived ${formatDate(link.archivedAt)}` : ''}
                      </span>
                    </span>
                    <span className={styles.linkCounts}>
                      <span className="num">{link.thisMonth}</span> this month, <span className="num">{link.total}</span> in all
                    </span>
                    {link.archivedAt ? null : (
                      <span className={styles.itemActions}>
                        <CopyLink url={url} />
                        <form action={archiveLinkAction.bind(null, link.id)}>
                          <Button type="submit" size="sm" variant="quiet">
                            Archive
                          </Button>
                        </form>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className={styles.importCard}>
            <span className={styles.rowName}>
              Meta lead ads
              <span className={styles.rowSub}>Leads from the forms on our Facebook and Instagram ads would come in here, tagged with their source, joining a lead with the same email or phone.</span>
            </span>
            <span className={styles.importState}>{importer?.connected ? 'Connected' : 'Not connected'}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

