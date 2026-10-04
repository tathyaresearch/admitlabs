import type { Metadata } from 'next';
import { waitingAudits } from '@/audit/review-jobs';
import { Tag } from '@/components/audit/PlaceBits';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { plural } from '@/domain/format';
import { requireTeamViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { waitedFor } from '@/team/review';
import audit from '@/components/audit/places.module.css';
import styles from '@/components/team/review.module.css';

export const metadata: Metadata = { title: 'To review' };

// To review (spec section 25): every new Audit waiting for the team, oldest first, each with the
// college, what it is, its plan, how long it has waited and what changed in one line.
export default async function ReviewListPage({ searchParams }: { searchParams: Promise<{ approved?: string }> }) {
  await requireTeamViewer();
  const db = await createClient();
  const [rows, { approved }, automatic] = await Promise.all([
    waitingAudits(db),
    searchParams,
    db.from('institution_status').select('institutions(name)').eq('claimed', true).eq('review_first', false),
  ]);
  const sendsAutomatically = (automatic.data ?? []).flatMap((row) => (row.institutions?.name ? [row.institutions.name] : []));
  const now = new Date();
  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead
          title="To review"
          question="What needs a look before it goes out?"
          caption={[
            plural(rows.length, 'waiting', 'waiting'),
            'Oldest first',
            ...(sendsAutomatically.length ? [`${sendsAutomatically.join(', ')} ${sendsAutomatically.length === 1 ? 'sends' : 'send'} automatically`] : []),
          ]}
        />
        {approved ? (
          <Notice icon="checkCircle" title="Approved and sent.">
            The college sees it now, and it is in their Notifications.
          </Notice>
        ) : null}
      </div>
      {rows.length ? (
        <div className={audit.card}>
          <ul className={styles.reviewList}>
            {rows.map((row, index) => (
              <li key={row.auditId} className={styles.reviewRow}>
                <span className={styles.reviewMain}>
                  <span className={styles.reviewCollege}>{row.name}</span>
                  <span className={styles.reviewWhat}>
                    <Tag strong={row.first}>{row.what}</Tag>
                    <span>{row.plan}</span>
                  </span>
                  <span className={audit.quiet}>{row.line}</span>
                </span>
                <span className={styles.reviewWait}>
                  <Icon name="stopwatch" size={14} />
                  Waiting {waitedFor(row.runAt, now)}
                </span>
                <ButtonLink href={`/team/review/${row.auditId}`} variant={index === 0 ? 'primary' : 'secondary'} size="sm" iconAfter="arrowRight">
                  Review
                </ButtonLink>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon="checkCircle" title="Nothing waits for review">
          New Audits from colleges with Review first on wait here until the team approves them. Each college’s setting is on its page.
        </EmptyState>
      )}
      <p className={audit.quiet}>Nothing here reaches the college until the team approves it: not the Audit, its alerts or its email. Lead alerts never wait.</p>
    </div>
  );
}
