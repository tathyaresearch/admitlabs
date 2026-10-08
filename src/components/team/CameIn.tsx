// What came in for one lead (spec section 27): each enquiry as it was sent, newest first. The
// website's Talk to us form (with the tracking link it came through), a request from a dashboard
// (Paid with its period and price, the services card, a fix with its place), a new Free college.

import Link from 'next/link';
import { formatDateTime } from '@/domain/format';
import { PAID_PRICE_BY_MONTHS } from '@/domain/tiers';
import { PLACE_LABELS } from '@/domain/types';
import type { EnquiryRow } from '@/lib/team/enquiries';
import { ENQUIRY_ROLE_LABELS, formatPhone } from '@/site/enquiry';
import styles from './team.module.css';

function what(enquiry: EnquiryRow): string {
  switch (enquiry.kind) {
    case 'work_with_us':
      return enquiry.linkName ? `Sent the Talk to us form, from ${enquiry.linkName}` : 'Sent the Talk to us form';
    case 'ask_paid':
    case 'continue_paid': {
      const price = enquiry.paidMonths ? PAID_PRICE_BY_MONTHS[enquiry.paidMonths] : null;
      return `${enquiry.kind === 'ask_paid' ? 'Asked for Paid' : 'Asked to renew Paid'}${price ? `, ${price.label} (${price.text} ${price.term})` : ''}, from their dashboard`;
    }
    case 'ask_services':
      return 'Asked to talk about our services, from the card in their dashboard';
    case 'fix_request':
      return `Asked AdmitLabs to fix this, from their Audit${enquiry.place ? ` (${PLACE_LABELS[enquiry.place]})` : ''}`;
    case 'free_signup':
      return 'Signed up for Drishti, on Free';
  }
}

export function CameIn({ enquiries }: { enquiries: readonly EnquiryRow[] }) {
  if (!enquiries.length) return <p className={styles.empty}>Added by hand: nothing came in from the website or a dashboard.</p>;
  return (
    <ul className={styles.cameIn}>
      {enquiries.map((enquiry) => (
        <li key={enquiry.id} className={styles.cameInItem}>
          <p className={styles.itemMeta}>
            <span>{formatDateTime(enquiry.createdAt)}</span>
            {'institutionId' in enquiry ? (
              <Link href={`/team/institutions/${enquiry.institutionId}`} className={styles.link}>
                {enquiry.institution}
              </Link>
            ) : (
              <span>{enquiry.institution}</span>
            )}
          </p>
          <p className={styles.cameInWhat}>{what(enquiry)}</p>
          {enquiry.kind === 'work_with_us' ? (
            <>
              <p className={styles.itemBody}>
                {enquiry.name}, {ENQUIRY_ROLE_LABELS[enquiry.role]}. {formatPhone(enquiry.phone)}, {enquiry.email}
                {enquiry.program ? `. Program: ${enquiry.program}` : ''}
              </p>
              {enquiry.message ? <p className={styles.itemBody}>{enquiry.message}</p> : null}
            </>
          ) : enquiry.kind === 'fix_request' ? (
            <p className={styles.itemBody}>
              {enquiry.fixTitle}. From {enquiry.email}
            </p>
          ) : (
            <p className={styles.itemBody}>From {enquiry.email}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
