import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/team/InstitutionPanels';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { formatDateTime, plural } from '@/domain/format';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadEnquiries, type EnquiryRow } from '@/lib/team/enquiries';
import { ENQUIRY_ROLE_LABELS, formatPhone } from '@/site/enquiry';
import { setEnquiryHandledAction } from './actions';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/enquiries.module.css';
import team from '@/components/team/team.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Enquiries' : 'Page not found' };
}

function Enquiry({ enquiry }: { enquiry: EnquiryRow }) {
  return (
    <article className={team.item} aria-labelledby={`enquiry-${enquiry.id}`}>
      <div className={team.itemHead}>
        <h2 id={`enquiry-${enquiry.id}`} className={team.itemTitle}>
          {enquiry.name}
          <span className={team.itemQuiet}>, {ENQUIRY_ROLE_LABELS[enquiry.role]}</span>
        </h2>
        <span className={team.itemRole}>{enquiry.institution}</span>
      </div>
      <p className={team.itemMeta}>
        <span>Sent {formatDateTime(enquiry.createdAt)}</span>
        {enquiry.program ? <span>Program: {enquiry.program}</span> : null}
      </p>
      <p className={styles.contact}>
        <a className={team.link} href={`mailto:${enquiry.email}`}>
          {enquiry.email}
        </a>
        <a className={team.link} href={`tel:${enquiry.phone}`}>
          {formatPhone(enquiry.phone)}
        </a>
      </p>
      {enquiry.message ? <p className={team.itemBody}>{enquiry.message}</p> : null}
      <div className={team.itemActions}>
        {enquiry.handledAt ? (
          <>
            <span className={styles.handled}>Handled {formatDateTime(enquiry.handledAt)}</span>
            <ActionButton action={setEnquiryHandledAction.bind(null, enquiry.id, false)} label="Mark as new" variant="quiet" />
          </>
        ) : (
          <ActionButton action={setEnquiryHandledAction.bind(null, enquiry.id, true)} label="Mark as handled" variant="secondary" />
        )}
      </div>
    </article>
  );
}

// Enquiries: who wrote in through the website's "Work with us" form, newest first. New ones until
// someone on the team marks them handled. No emails are sent.
export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireTeamViewer();
  const showAll = (await searchParams).show === 'all';
  const all = await loadEnquiries();
  const fresh = all.filter((enquiry) => !enquiry.handledAt);
  const shown = showAll ? all : fresh;

  return (
    <div className={audit.page}>
      <PageHead
        title="Enquiries"
        question="Who wants to work with us?"
        caption={[`${fresh.length} new`, `${plural(all.length, 'enquiry', 'enquiries')} in all`, 'From the website’s Work with us form']}
      />
      <nav className={styles.filter} aria-label="Show">
        <Link href="/team/enquiries" className={styles.filterLink} aria-current={showAll ? undefined : 'page'}>
          New
        </Link>
        <Link href="/team/enquiries?show=all" className={styles.filterLink} aria-current={showAll ? 'page' : undefined}>
          All
        </Link>
      </nav>
      {shown.length ? (
        <div className={team.rows}>
          {shown.map((enquiry) => (
            <Enquiry key={enquiry.id} enquiry={enquiry} />
          ))}
        </div>
      ) : (
        <EmptyState icon="enquiry" title={showAll ? 'No enquiries yet' : 'Nothing new'}>
          <p>{showAll ? 'They arrive here from the website’s Work with us form.' : 'Every enquiry has been handled. See them all under All.'}</p>
        </EmptyState>
      )}
    </div>
  );
}
