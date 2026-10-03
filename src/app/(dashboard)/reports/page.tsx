import { historyByMonth, monthScore } from '@/audit/view';
import { SectionHead } from '@/components/audit/AuditHeader';
import { EarlierReports, LatestReport, ReportsUnlockCard, type ReportScore } from '@/components/report/Reports';
import { PaidAction } from '@/components/plan/PaidAction';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { monthKey } from '@/domain/dates';
import { formatDate, formatMonth } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadHistory } from '@/lib/audit/load';
import { loadReports } from '@/lib/reports/load';
import { nextReport } from '@/report/schedule';
import audit from '@/components/audit/audit.module.css';

export const metadata = { title: 'Reports' };

const QUESTION = 'Our monthly report.';
/** Months on the small score line beside the latest report. */
const TREND_MONTHS = 6;

// Reports answers "Our monthly report.": the latest report with its score and how it got there,
// the one download button, then earlier reports.
export default async function ReportsPage() {
  const viewer = await requireInstitutionViewer();
  const { institution } = viewer.membership;
  const onPlan = viewer.tier !== 'free';
  // Score history is a Paid and Client feature: a plan that has ended keeps its reports, without the scores beside them.
  const [reports, history] = await Promise.all([loadReports(institution.id), onPlan ? loadHistory(institution.id) : Promise.resolve([])]);
  const next = nextReport(new Date());
  // A Paid plan that has ended: past reports stay, new ones stop.
  const endedOn = !onPlan && viewer.plan?.tier === 'paid' && viewer.plan.endsAt ? viewer.plan.endsAt : null;
  const [latest, ...earlier] = reports;

  const caption = [
    'One PDF a month, made on the 1st',
    'Readable in 5 minutes',
    ...(onPlan ? [`Next report ${formatDate(next.on)}, for ${formatMonth(next.month)}`] : []),
  ];

  if (!latest) {
    return (
      <div className={audit.page}>
        <PageHead title="Reports" question={QUESTION} caption={caption} />
        {onPlan ? (
          <EmptyState icon="reports" title={`Your first report arrives on ${formatDate(next.on)}`}>
            It covers {formatMonth(next.month)}: your score, what to fix, your rivals and what students want, with 3 things to do. It shows here and in
            Notifications.
          </EmptyState>
        ) : (
          <ReportsUnlockCard place={institution.city} action={<PaidAction viewer={viewer} />} />
        )}
      </div>
    );
  }

  const points = historyByMonth(history, (runAt) => monthKey(new Date(runAt)));
  const scores = new Map<string, ReportScore>();
  for (const report of reports) {
    const score = monthScore(points, report.month);
    if (score) scores.set(report.month, score);
  }

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Reports" question={QUESTION} caption={caption} />
        {endedOn ? (
          <Notice
            title={`Your Paid plan ended on ${formatDate(endedOn)}.`}
            action={<PaidAction viewer={viewer} variant="secondary" size="sm" note={false} />}
          >
            Your past reports stay here to download. New reports are made on Paid.
          </Notice>
        ) : null}
      </div>

      <LatestReport
        report={latest}
        place={institution.city}
        score={scores.get(latest.month) ?? null}
        trend={points.filter((point) => point.month <= latest.month).slice(-TREND_MONTHS)}
      />

      {earlier.length ? (
        <section className={audit.section} aria-labelledby="earlier-title">
          <SectionHead id="earlier-title" icon="reports" title="Earlier reports" help="Each one is a snapshot of its month, as it was then." />
          <EarlierReports reports={earlier} scores={scores} />
        </section>
      ) : null}
    </div>
  );
}
