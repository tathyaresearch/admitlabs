import type { Metadata } from 'next';
import { waitingAudits } from '@/audit/review-jobs';
import { Tag } from '@/components/audit/PlaceBits';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { plural } from '@/domain/format';
import { AuditTabs } from '@/components/team/AuditTabs';
import { isFullTeam } from '@/domain/types';
import { requireFullTeam } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { waitingSummaries } from '@/report/jobs';
import { waitedFor } from '@/team/review';
import audit from '@/components/audit/places.module.css';
import styles from '@/components/team/review.module.css';

// The title only names the page for the full team, so it stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: isFullTeam(viewer?.teamRole) ? 'To review' : 'Page not found' };
}

interface Waiting {
  key: string;
  href: string;
  name: string;
  what: string;
  strong: boolean;
  plan: string;
  since: string;
  line: string;
}

// To review (spec section 25): every new Audit and monthly summary waiting for the team, oldest
// first, each with the college, what it is, its plan, how long it has waited and what changed in
// one line.
export default async function ReviewListPage({ searchParams }: { searchParams: Promise<{ approved?: string }> }) {
  await requireFullTeam();
  const db = await createClient();
  const now = new Date();
  const [audits, summaries, { approved }, automatic] = await Promise.all([
    waitingAudits(db),
    waitingSummaries(db, now),
    searchParams,
    db.from('institution_status').select('institutions(name)').eq('claimed', true).eq('review_first', false),
  ]);
  const rows: Waiting[] = [
    ...audits.map((row) => ({ key: row.auditId, href: `/team/review/${row.auditId}`, name: row.name, what: row.what, strong: row.first, plan: row.plan, since: row.runAt, line: row.line })),
    ...summaries.map((row) => ({ key: row.reportId, href: `/team/review/summary/${row.reportId}`, name: row.name, what: row.what, strong: false, plan: row.plan, since: row.madeAt, line: row.line })),
  ].sort((a, b) => a.since.localeCompare(b.since));
  const sendsAutomatically = (automatic.data ?? []).flatMap((row) => (row.institutions?.name ? [row.institutions.name] : []));
  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead
          title="Audit"
          question="What needs a look before it goes out?"
          caption={[
            plural(rows.length, 'waiting', 'waiting'),
            'Oldest first',
            ...(sendsAutomatically.length ? [`${sendsAutomatically.join(', ')} ${sendsAutomatically.length === 1 ? 'sends' : 'send'} automatically`] : []),
          ]}
        />
        <AuditTabs current="review" />
        {approved ? (
          <Notice icon="checkCircle" title="Approved and sent.">
            {approved === 'summary'
              ? 'The summary and its report show on their Reports page, the email went to the people who keep it on, and it is in their Notifications.'
              : 'The college sees it now, and it is in their Notifications.'}
          </Notice>
        ) : null}
      </div>
      {rows.length ? (
        <div className={audit.card}>
          <ul className={styles.reviewList}>
            {rows.map((row, index) => (
              <li key={row.key} className={styles.reviewRow}>
                <span className={styles.reviewMain}>
                  <span className={styles.reviewCollege}>{row.name}</span>
                  <span className={styles.reviewWhat}>
                    <Tag strong={row.strong}>{row.what}</Tag>
                    <span>{row.plan}</span>
                  </span>
                  <span className={audit.quiet}>{row.line}</span>
                </span>
                <span className={styles.reviewWait}>
                  <Icon name="stopwatch" size={14} />
                  Waiting {waitedFor(row.since, now)}
                </span>
                <ButtonLink href={row.href} variant={index === 0 ? 'primary' : 'secondary'} size="sm" iconAfter="arrowRight">
                  Review
                </ButtonLink>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon="checkCircle" title="Nothing waits for review">
          New Audits and monthly summaries from colleges with Review first on wait here until the team approves them. Each college’s setting is on its page.
        </EmptyState>
      )}
      <p className={audit.quiet}>Nothing here reaches the college until the team approves it: not the Audit, the summary, their alerts or their emails. Lead alerts never wait.</p>
    </div>
  );
}
