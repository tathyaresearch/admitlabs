import { historyByMonth } from '@/audit/view';
import { SectionTitle } from '@/components/audit/PlaceBits';
import { MonthBars } from '@/components/charts/MonthBars';
import { PaidAction } from '@/components/plan/PaidAction';
import { EarlierMonths, LatestMonth, ReportsUnlockCard } from '@/components/report/Reports';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { monthKey } from '@/domain/dates';
import { effectiveTier } from '@/domain/tiers';
import { formatDate, formatMonth } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadHistory } from '@/lib/audit/load';
import { loadReports } from '@/lib/reports/load';
import { nextReport } from '@/report/schedule';
import audit from '@/components/audit/places.module.css';

export const metadata = { title: 'Reports' };

const QUESTION = 'Our monthly report.';
/** Months on the score by month. */
const SCORE_MONTHS = 6;

// Reports (spec section 13): each month's summary with its PDF, the latest in full and earlier ones
// folded, and the score by month with every point's value. Only approved summaries show: one
// waiting for the AdmitLabs team's review is not here yet.
export default async function ReportsPage() {
  const viewer = await requireInstitutionViewer();
  const { institution } = viewer.membership;
  const onPlan = viewer.tier !== 'free';
  // Score history is a Paid and Client feature: a plan that has ended keeps its reports, without the scores beside them.
  const [reports, history] = await Promise.all([loadReports(institution.id), onPlan ? loadHistory(institution.id) : Promise.resolve([])]);
  const next = nextReport(new Date());
  // The next one is made only while the plan is still Paid or Client on the day.
  const nextMade = onPlan && effectiveTier(viewer.plan, next.on) !== 'free';
  // A Paid plan that has ended: past reports stay, new ones stop.
  const endedOn = !onPlan && viewer.plan?.tier === 'paid' && viewer.plan.endsAt ? viewer.plan.endsAt : null;
  const [latest, ...earlier] = reports;

  const caption = [
    'A summary and a PDF a month, made on the 1st',
    'Readable in 5 minutes',
    ...(nextMade ? [`Next on ${formatDate(next.on)}, for ${formatMonth(next.month)}`] : []),
  ];

  if (!latest) {
    return (
      <div className={audit.page}>
        <PageHead title="Reports" question={QUESTION} caption={caption} />
        {onPlan ? (
          <EmptyState icon="reports" title={`Your first summary and report arrive on ${formatDate(next.on)}`}>
            They cover {formatMonth(next.month)}: how you are doing, the 3 things to do, your rivals and what students want. The summary comes by email too, and both show here.
          </EmptyState>
        ) : (
          <ReportsUnlockCard place={institution.city} action={<PaidAction viewer={viewer} />} />
        )}
      </div>
    );
  }

  const scores = historyByMonth(history, (runAt) => monthKey(new Date(runAt)))
    .slice(-SCORE_MONTHS)
    .map((point) => ({ month: point.month, count: point.score }));

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Reports" question={QUESTION} caption={caption} />
        {endedOn ? (
          <Notice title={`Your Paid plan ended on ${formatDate(endedOn)}.`} action={<PaidAction viewer={viewer} variant="secondary" size="sm" note={false} />}>
            Your past summaries and reports stay here to download. New ones are made on Paid.
          </Notice>
        ) : null}
      </div>

      <LatestMonth report={latest} />

      {scores.length > 1 ? (
        <section className={audit.block} aria-labelledby="score-title">
          <SectionTitle id="score-title" icon="arrowUpRight" title="The score by month" help="Your overall score, small, from each month’s latest Audit. Every month’s value is on its bar." />
          <div className={audit.card}>
            <MonthBars points={scores} title="Overall score by month" valueLabel="Score" />
          </div>
        </section>
      ) : null}

      {earlier.length ? (
        <section className={audit.block} aria-labelledby="earlier-title">
          <SectionTitle id="earlier-title" icon="reports" title="Earlier months" help="Each one as it was then: its summary and its PDF." />
          <EarlierMonths reports={earlier} />
        </section>
      ) : null}
    </div>
  );
}
