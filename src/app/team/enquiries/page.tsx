import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/team/InstitutionPanels';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { formatDateTime, plural } from '@/domain/format';
import { PAID_PRICE_BY_MONTHS, PAID_PRICE_LINE } from '@/domain/tiers';
import { PLACE_LABELS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadEnquiries, type EnquiryRow, type FixAsk, type FormEnquiry, type PaidAsk, type ServicesAsk } from '@/lib/team/enquiries';
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

function Handled({ enquiry }: { enquiry: EnquiryRow }) {
  return (
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
  );
}

/** An owner's request from the dashboard: what they asked for, for which period, who, and where to switch it on. */
function Ask({ enquiry }: { enquiry: PaidAsk }) {
  const price = enquiry.paidMonths ? PAID_PRICE_BY_MONTHS[enquiry.paidMonths] : null;
  return (
    <article className={team.item} aria-labelledby={`enquiry-${enquiry.id}`}>
      <div className={team.itemHead}>
        <h2 id={`enquiry-${enquiry.id}`} className={team.itemTitle}>
          {enquiry.kind === 'ask_paid' ? 'Wants to subscribe to Paid' : 'Wants to renew Paid'}
          {price ? `, ${price.label}` : ''}
        </h2>
        <Link href={`/team/institutions/${enquiry.institutionId}`} className={team.link}>
          {enquiry.institution}
        </Link>
      </div>
      <p className={team.itemMeta}>
        <span>Sent {formatDateTime(enquiry.createdAt)}, from their dashboard</span>
      </p>
      <p className={styles.contact}>
        <span>The owner:</span>
        <a className={team.link} href={`mailto:${enquiry.email}`}>
          {enquiry.email}
        </a>
      </p>
      <p className={team.itemBody}>
        {price ? `They picked ${price.label}: ${price.text} ${price.term}` : `Paid is ${PAID_PRICE_LINE}`}, with no auto-renew. They clicked {enquiry.kind === 'ask_paid' ? 'Subscribe now' : 'Renew now'}: write back to complete payment, then an Admin switches it on from their page{price ? `, for ${price.months === 1 ? 'one month' : `${price.months} months`}` : ''}.
      </p>
      <Handled enquiry={enquiry} />
    </article>
  );
}

/** Someone at a Free or Paid institution clicked Talk to AdmitLabs on the sidebar's services card. */
function ServicesRequest({ enquiry }: { enquiry: ServicesAsk }) {
  return (
    <article className={team.item} aria-labelledby={`enquiry-${enquiry.id}`}>
      <div className={team.itemHead}>
        <h2 id={`enquiry-${enquiry.id}`} className={team.itemTitle}>
          Wants to talk about our services
        </h2>
        <Link href={`/team/institutions/${enquiry.institutionId}`} className={team.link}>
          {enquiry.institution}
        </Link>
      </div>
      <p className={team.itemMeta}>
        <span>Sent {formatDateTime(enquiry.createdAt)}, from their dashboard</span>
      </p>
      <p className={styles.contact}>
        <span>From:</span>
        <a className={team.link} href={`mailto:${enquiry.email}`}>
          {enquiry.email}
        </a>
      </p>
      <p className={team.itemBody}>They saw Program Growth, Institution Branding and Admit Campaign. Write back to talk about what they need.</p>
      <Handled enquiry={enquiry} />
    </article>
  );
}

/** An owner asks AdmitLabs to fix one thing from their Audit. */
function FixRequest({ enquiry }: { enquiry: FixAsk }) {
  return (
    <article className={team.item} aria-labelledby={`enquiry-${enquiry.id}`}>
      <div className={team.itemHead}>
        <h2 id={`enquiry-${enquiry.id}`} className={team.itemTitle}>
          Asks AdmitLabs to fix this
        </h2>
        <Link href={`/team/institutions/${enquiry.institutionId}`} className={team.link}>
          {enquiry.institution}
        </Link>
      </div>
      <p className={team.itemMeta}>
        <span>Sent {formatDateTime(enquiry.createdAt)}, from their Audit</span>
        {enquiry.place ? <span>{PLACE_LABELS[enquiry.place]}</span> : null}
      </p>
      <p className={team.itemBody}>{enquiry.fixTitle}</p>
      <p className={styles.contact}>
        <span>The owner:</span>
        <a className={team.link} href={`mailto:${enquiry.email}`}>
          {enquiry.email}
        </a>
      </p>
      <Handled enquiry={enquiry} />
    </article>
  );
}

function Enquiry({ enquiry }: { enquiry: EnquiryRow }) {
  if (enquiry.kind === 'work_with_us') return <FormRow enquiry={enquiry} />;
  if (enquiry.kind === 'ask_services') return <ServicesRequest enquiry={enquiry} />;
  return enquiry.kind === 'fix_request' ? <FixRequest enquiry={enquiry} /> : <Ask enquiry={enquiry} />;
}

function FormRow({ enquiry }: { enquiry: FormEnquiry }) {
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
      <Handled enquiry={enquiry} />
    </article>
  );
}

// Enquiries: who wrote in through the website's "Work with us" form, and requests from dashboards
// (to subscribe or renew, to talk about the services, to fix something), newest first. New ones
// until someone on the team marks them handled. No emails are sent.
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
        caption={[`${fresh.length} new`, `${plural(all.length, 'enquiry', 'enquiries')} in all`, 'From the website’s Work with us form, and requests from dashboards: to subscribe or renew, to talk about our services, or to fix something']}
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
        // None at all reads as none yet under either filter; only handled ones read as nothing new.
        <EmptyState icon="enquiry" title={all.length === 0 ? 'No enquiries yet' : 'Nothing new'}>
          <p>
            {all.length === 0
              ? 'They arrive here when someone sends the Work with us form on the website, or clicks Subscribe now, Renew now or Talk to AdmitLabs in their dashboard. Each one shows who it is, how to reach them and what they need.'
              : 'Every enquiry has been handled. See them all under All.'}
          </p>
        </EmptyState>
      )}
    </div>
  );
}
