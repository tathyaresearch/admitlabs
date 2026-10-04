import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SectionTitle, Tag } from '@/components/audit/PlaceBits';
import { AnchorButton } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { KpiCard, KpiNote, KpiNumber } from '@/components/ui/Kpi';
import { PageHead } from '@/components/ui/Layout';
import { PlatformMark } from '@/components/ui/Marks';
import { monthKey, previousMonth } from '@/domain/dates';
import { formatCount, formatDate, formatMonth, formatMonthName, joinNames, plural } from '@/domain/format';
import { LEAD_SOURCE_LABELS, type LeadSource } from '@/domain/types';
import type { Platform } from '@/graphics/platforms';
import { byLink, leadsSummary, monthWords, soFarWords, type LinkCount } from '@/leads/summary';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadHasLeads, loadLeadsPage, type LeadRow } from '@/lib/leads/load';
import { formatPhone } from '@/site/enquiry';
import audit from '@/components/audit/places.module.css';
import styles from '@/components/leads/leads.module.css';

export const metadata = { title: 'Leads' };

const QUESTION = 'What did our content bring in?';
const PLATFORMS: Partial<Record<LeadSource, Platform>> = { instagram: 'instagram', youtube: 'youtube', facebook: 'facebook' };

/** Where a link is used: Instagram, YouTube and Facebook with their marks, the rest by name. */
function UsedOn({ usedOn }: { usedOn: LeadSource }) {
  const platform = PLATFORMS[usedOn];
  return platform ? <PlatformMark platform={platform} name={LEAD_SOURCE_LABELS[usedOn]} /> : <span>{LEAD_SOURCE_LABELS[usedOn]}</span>;
}

// Leads answers "What did our content bring in?" for an AdmitLabs Client (spec section 23), as the
// version 2 mock was approved: this month against last month, the link that brought the most,
// every link with its counts, then every enquiry, newest first, with Download CSV. The team, in
// "view as" too, sees the counts only. Not a CRM: no calls, stages or notes.
export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  if (!(await loadHasLeads(viewer))) notFound();
  const { institution, role } = viewer.membership;
  const all = (await searchParams).all === '1';
  const data = await loadLeadsPage(viewer, { all });
  const owner = role === 'owner' && !viewer.viewingAs;

  const thisMonth = monthKey(new Date());
  const lastMonth = previousMonth(thisMonth);
  const monthBefore = previousMonth(lastMonth);
  const summary = leadsSummary(data.links);
  const links = byLink(data.links);
  const busiest = Math.max(1, ...links.map((link) => link.thisMonth));

  const caption = [
    formatMonth(thisMonth),
    plural(links.length, 'link', 'links'),
    `Kept for ${data.keepMonths} months`,
    data.open ? null : 'Forms closed',
  ];
  const download =
    data.leads?.length && !viewer.viewingAs ? (
      <AnchorButton href="/leads/csv" variant="secondary" size="sm" icon="download">
        Download CSV
      </AnchorButton>
    ) : undefined;

  const linkColumns: Column<LinkCount>[] = [
    {
      key: 'link',
      header: 'Link',
      render: (link) => (
        <span className={styles.linkName}>
          {link.name}
          {link.archivedAt ? <Tag>Closed</Tag> : null}
        </span>
      ),
    },
    { key: 'used', header: 'Used on', render: (link) => <UsedOn usedOn={link.usedOn} /> },
    { key: 'program', header: 'Program', render: (link) => link.programName },
    {
      key: 'this',
      header: 'This month',
      align: 'end',
      render: (link) => (
        <span className={styles.countBar}>
          <span className={styles.countTrack} aria-hidden="true">
            <span style={{ width: `${(link.thisMonth / busiest) * 100}%` }} />
          </span>
          <span className="num">{formatCount(link.thisMonth)}</span>
        </span>
      ),
    },
    { key: 'last', header: formatMonthName(lastMonth), align: 'end', numeric: true, render: (link) => formatCount(link.lastMonth) },
    { key: 'all', header: 'In all', align: 'end', numeric: true, render: (link) => formatCount(link.total) },
  ];

  const leadColumns: Column<LeadRow>[] = [
    { key: 'name', header: 'Name', render: (lead) => lead.name },
    { key: 'course', header: 'Course', render: (lead) => lead.course ?? 'Not given' },
    { key: 'from', header: 'From', render: (lead) => lead.linkName ?? 'A closed link' },
    { key: 'date', header: 'Date', render: (lead) => <span className={styles.nowrap}>{formatDate(lead.sentAt)}</span> },
    { key: 'phone', header: 'Phone', render: (lead) => <span className={`${styles.nowrap} num`}>{formatPhone(lead.phone)}</span> },
    { key: 'email', header: 'Email', render: (lead) => (lead.email ? <span className={styles.email}>{lead.email}</span> : <span className={audit.quiet}>Not given</span>) },
    { key: 'city', header: 'City', render: (lead) => lead.city ?? <span className={audit.quiet}>Not given</span> },
  ];

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Leads" question={QUESTION} caption={caption} actions={download} />
        {data.open ? null : (
          <Notice icon="lock" title="Your forms are closed.">
            Your AdmitLabs service has ended, so your links no longer take enquiries. The ones you have stay here until they are {data.keepMonths} months old.
          </Notice>
        )}
      </div>

      {links.length === 0 ? (
        <EmptyState icon="enquiry" title="No tracking links yet">
          The AdmitLabs team makes a link for each place your content goes, like your Instagram bio or a reel. Each one opens a short form for {institution.name}, and every enquiry shows here.
        </EmptyState>
      ) : (
        <>
          <section className={styles.kpis} aria-label="This month">
            <KpiCard label="This month">
              <KpiNumber value={formatCount(summary.thisMonth)} suffix={summary.thisMonth === 1 ? 'enquiry so far' : 'enquiries so far'} />
              <KpiNote>{soFarWords(summary.thisMonth, summary.lastMonthToDate, lastMonth)}</KpiNote>
            </KpiCard>
            <KpiCard label={formatMonth(lastMonth)}>
              <KpiNumber value={formatCount(summary.lastMonth)} suffix={summary.lastMonth === 1 ? 'enquiry' : 'enquiries'} />
              <KpiNote>{monthWords(summary.lastMonth, summary.monthBefore, monthBefore)}</KpiNote>
            </KpiCard>
            <KpiCard label="Brought the most">
              {summary.top ? (
                <>
                  <p className={styles.kpiText}>{summary.top.link.name}</p>
                  <KpiNote>
                    {plural(summary.top.count, 'enquiry', 'enquiries')} {summary.top.month === 'this' ? 'this month' : `in ${formatMonthName(lastMonth)}`}
                  </KpiNote>
                </>
              ) : (
                <>
                  <p className={styles.kpiText}>No enquiries yet</p>
                  <KpiNote>Each one shows here as it arrives.</KpiNote>
                </>
              )}
            </KpiCard>
          </section>

          <section className={audit.block} aria-labelledby="links-title">
            <SectionTitle id="links-title" icon="share" title="By link" help="Each link the AdmitLabs team made for your content, and what it brought." />
            <div className={audit.card}>
              <DataTable caption="Enquiries by link" hideCaption columns={linkColumns} rows={links} rowKey={(link) => link.id} />
            </div>
          </section>

          <section className={audit.block} aria-labelledby="list-title">
            <SectionTitle
              id="list-title"
              icon="enquiry"
              title="Every enquiry"
              help={`Newest first. Each student agreed to be contacted by ${institution.name} about admission.`}
              action={
                owner && data.leads?.length ? (
                  <Link href="/settings?group=leads#delete" className={styles.actionLink}>
                    Delete a student’s data
                    <Icon name="arrowRight" size={14} />
                  </Link>
                ) : undefined
              }
            />
            {data.leads === null ? (
              <div className={audit.card}>
                <p className={audit.quiet}>
                  {plural(data.leadCount, 'enquiry', 'enquiries')} kept. A student’s details are for {institution.name} only, so the AdmitLabs team sees the counts by link above, in view as too.
                </p>
              </div>
            ) : data.leads.length ? (
              <div className={audit.card}>
                <DataTable caption="Every enquiry, newest first" hideCaption columns={leadColumns} rows={data.leads} rowKey={(lead) => lead.id} />
                {data.leadCount > data.leads.length ? (
                  <p className={audit.quiet}>
                    Showing the newest {formatCount(data.leads.length)} of {formatCount(data.leadCount)}.{' '}
                    <Link href="/leads?all=1" className={styles.inlineLink}>
                      Show all
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={audit.card}>
                <p className={audit.quiet}>No enquiries yet. Each one shows here as it arrives, and goes by email to your admissions team.</p>
              </div>
            )}
            {data.leads !== null ? (
              <p className={audit.quiet}>
                {data.recipients.length ? `New enquiries go by email to ${joinNames(data.recipients)} as they arrive. ` : ''}Drishti keeps them for {data.keepMonths} months, then deletes them for good.{' '}
                <Link href="/settings?group=leads" className={styles.inlineLink}>
                  Change both in Settings, Leads
                </Link>
                .
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
