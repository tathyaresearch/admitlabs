import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionTitle } from '@/components/audit/PlaceBits';
import { ApproveButton } from '@/components/team/ReviewRows';
import { SummaryLines, type SummaryLineData } from '@/components/team/SummaryLines';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, formatMonth, formatMonthName } from '@/domain/format';
import { requireTeamViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { loadSummaryReview } from '@/report/jobs';
import { SUMMARY_TARGET_LABELS, thingLine } from '@/report/summary';
import { waitedFor } from '@/team/review';
import { approveSummaryAction, fixSummaryLineAction } from '../../actions';
import audit from '@/components/audit/places.module.css';
import styles from '@/components/team/review.module.css';

export const metadata: Metadata = { title: 'Review' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A monthly summary waiting for the team (spec section 25): the summary line by line, each to fix
// where a provider got it wrong, the PDF as it would go out, and Approve and send.
export default async function SummaryReviewPage({ params }: { params: Promise<{ reportId: string }> }) {
  await requireTeamViewer();
  const { reportId } = await params;
  if (!UUID.test(reportId)) notFound();
  const state = await loadSummaryReview(await createClient(), reportId);
  if (!state) notFound();
  const month = formatMonthName(state.month);

  if (state.review !== 'waiting') {
    return (
      <div className={audit.page}>
        <PageHead back={{ href: '/team/review', label: 'To review' }} title={state.name} question="Is this right before it goes out?" />
        <EmptyState icon="checkCircle" title={`The ${month} summary has been approved`} action={<ButtonLink href={`/team/institutions/${state.institutionId}`}>Open their page</ButtonLink>}>
          It shows on their Reports page with its PDF, and the email went. Every change made in its review is kept.
        </EmptyState>
      </div>
    );
  }

  // The last change to each line, with what it was before the first.
  const changed = new Map<string, NonNullable<SummaryLineData['changed']>>();
  for (const edit of state.edits) {
    const target = edit.target.replace(/^summary:/, '');
    changed.set(target, { by: edit.by, before: changed.get(target)?.before ?? edit.before, reason: edit.reason });
  }
  const lines: SummaryLineData[] = state.lines.map((line) => {
    const index = line.target.startsWith('things.') ? Number(line.target.split('.')[1]) - 1 : -1;
    const thing = index >= 0 ? state.summary.things[index] : undefined;
    return { target: line.target, label: SUMMARY_TARGET_LABELS[line.target], value: line.value, meta: thing ? thingLine(thing) : null, changed: changed.get(line.target) ?? null };
  });
  const editCount = state.edits.length;
  const words = state.summary.words.map((word) => `${word.name} ${word.word}`).join(', ');

  return (
    <div className={[audit.page, styles.withBar].join(' ')}>
      <div className={audit.top}>
        <PageHead
          back={{ href: '/team/review', label: 'To review' }}
          title={state.name}
          question="Is this right before it goes out?"
          caption={[`${month} summary, made ${formatDate(state.madeAt)}`, `Waiting ${waitedFor(state.madeAt, new Date())}`, 'Review first']}
        />
      </div>

      <section className={audit.block} aria-labelledby="lines-title">
        <SectionTitle
          id="lines-title"
          icon="reports"
          title={`The ${month} summary, line by line`}
          help="Fix a line where a provider got it wrong. It goes in the email, on their Reports page and in the PDF. Every change is kept."
          action={
            <AnchorButton href={`/team/review/summary/${state.reportId}/pdf`} variant="secondary" size="sm" icon="download">
              The PDF as it would go out
            </AnchorButton>
          }
        />
        <div className={audit.card}>
          <p className={audit.miniTitle}>Visibility, Trust and Chosen</p>
          <p className={audit.quiet}>
            {state.summary.words.map((word) => `${word.name} ${word.word} (${word.note})`).join('. ')}. From the approved Audit: a result is fixed in that Audit’s review.
          </p>
        </div>
        <div className={audit.card}>
          <SummaryLines reportId={state.reportId} lines={lines} onFix={fixSummaryLineAction} />
        </div>
        <p className={audit.quiet}>
          {formatMonth(state.month)}
          {state.pages ? `: the PDF has ${state.pages} pages.` : '.'} It goes to the owner and the members who keep the monthly summary on in Settings, Notifications.
        </p>
      </section>

      <div className={styles.approveBar}>
        <span className={styles.approveText}>
          <span className={audit.strongText}>{editCount ? `${editCount} ${editCount === 1 ? 'change' : 'changes'}.` : 'No changes.'}</span>
          <span className={styles.approveMore}> {words}. Approving makes the PDF again with these lines, shows it on their Reports page and sends the email.</span>
        </span>
        <ApproveButton id={state.reportId} onApprove={approveSummaryAction} />
      </div>
    </div>
  );
}
