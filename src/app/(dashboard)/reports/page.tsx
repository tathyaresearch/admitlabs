import { AuditHeader, SectionHead } from '@/components/audit/AuditHeader';
import { EarlierReports, LatestReport, ReportsUnlockCard } from '@/components/report/Reports';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { formatDate, formatMonth } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadReports } from '@/lib/reports/load';
import { nextReport } from '@/report/schedule';
import audit from '@/components/audit/audit.module.css';

export const metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const viewer = await requireInstitutionViewer();
  const { institution } = viewer.membership;
  const reports = await loadReports(institution.id);
  const next = nextReport(new Date());
  const onPlan = viewer.tier !== 'free';
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
        <AuditHeader title="Reports" caption={caption} />
        {onPlan ? (
          <EmptyState icon="reports" title={`Your first report arrives on ${formatDate(next.on)}`}>
            It covers {formatMonth(next.month)}: your score, what to fix, your rivals and what students want, with 3 things to do. It shows here and in
            Notifications.
          </EmptyState>
        ) : (
          <ReportsUnlockCard place={institution.city} />
        )}
      </div>
    );
  }

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <AuditHeader title="Reports" caption={caption} />
        {endedOn ? (
          <Notice
            title={`Your Paid plan ended on ${formatDate(endedOn)}.`}
            action={
              <ButtonLink href="/plan" size="sm" iconAfter="arrowRight">
                Unlock with Paid
              </ButtonLink>
            }
          >
            Your past reports stay here to download. New reports are made on Paid.
          </Notice>
        ) : null}
        <LatestReport report={latest} place={institution.city} />
      </div>

      {earlier.length ? (
        <section className={audit.section} aria-labelledby="earlier-title">
          <SectionHead id="earlier-title" title="Earlier reports" help="Each one is a snapshot of its month, as it was then." />
          <EarlierReports reports={earlier} />
        </section>
      ) : null}
    </div>
  );
}
