import { Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { KpiCard, KpiNote, KpiNumber, KpiWord } from '@/components/ui/Kpi';
import { Card, PageHead, Section } from '@/components/ui/Layout';
import { CellText } from '@/components/ui/Results';
import { ENTITLEMENTS, type EntitlementGroup } from '@/config/entitlements';
import { PLAN_RULES } from '@/config/plans';
import { SCHEDULES } from '@/config/schedules';
import { formatDate, formatInr } from '@/domain/format';
import { planReminder } from '@/domain/tiers';
import { TIER_LABELS, TIERS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import audit from '@/components/audit/audit.module.css';
import styles from './plan.module.css';

export const metadata = { title: 'Plan' };

const GROUPS: readonly EntitlementGroup[] = ['Audit', 'Rivals', 'Demand', 'Other'];

function daysText(days: number): string {
  if (days === 0) return 'today';
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

// Plan answers "What's in our plan?": the plan and its dates, what to do next (on Free, what Paid
// adds; near the end of Paid, the reminder), then one table that compares the plans.
export default async function PlanPage() {
  const viewer = await requireInstitutionViewer();
  const { tier, plan } = viewer;
  const reminder = planReminder(plan, new Date());
  const paidEnded = plan?.tier === 'paid' && reminder.stage === 'ended';

  let freeProgramName: string | null = null;
  if (tier === 'free' && plan?.freeProgramId) {
    const supabase = await createClient();
    const { data } = await supabase.from('programs').select('name').eq('id', plan.freeProgramId).maybeSingle();
    freeProgramName = data?.name ?? null;
  }

  const schedule = SCHEDULES[tier];
  const audits = schedule.auditEveryMonths === 1 ? 'Every month' : `Every ${schedule.auditEveryMonths} months`;
  const refresh = schedule.manualRefresh === 'none' ? 'No extra refresh' : schedule.manualRefresh === 'once_a_month' ? 'Plus one extra refresh a month' : 'Refreshed any time by the AdmitLabs team';

  const lead = paidEnded
    ? `Your Paid plan ended on ${formatDate(plan.endsAt as Date)}. You're on Free now, and you still see your last Audit score.`
    : tier === 'free'
      ? 'You see your overall score, your three pillar scores, and the top 3 things working and to fix, for one program. A new free Audit is ready every 3 months.'
      : tier === 'paid'
        ? 'You see everything Drishti finds: every check with its source, all your programs, your rivals, what students want, and a monthly report.'
        : 'You are an AdmitLabs client: everything in Paid, and the AdmitLabs team acts on it with you.';

  return (
    <div className={audit.page}>
      <PageHead title="Plan" question="What's in our plan?" />

      <section className={audit.summary} aria-labelledby="plan-summary-title">
        <h2 id="plan-summary-title" className="visually-hidden">
          Your plan
        </h2>
        <p className={audit.lead}>{lead}</p>
        <div className={styles.kpis}>
          <KpiCard label="Your plan">
            <KpiWord>{TIER_LABELS[tier]}</KpiWord>
            {plan ? <KpiNote>{tier === 'free' && paidEnded ? `Since ${formatDate(plan.endsAt as Date)}` : `Since ${formatDate(plan.startsAt)}`}</KpiNote> : null}
          </KpiCard>
          {tier === 'paid' && plan?.endsAt && reminder.daysLeft !== null ? (
            <KpiCard label="Days left">
              <KpiNumber value={reminder.daysLeft} suffix={reminder.daysLeft === 1 ? 'day' : 'days'} />
              <KpiNote>Ends {formatDate(plan.endsAt)}. No auto-renew.</KpiNote>
            </KpiCard>
          ) : null}
          {tier === 'client' ? (
            <KpiCard label="Ends">
              <KpiWord>With your service</KpiWord>
              <KpiNote>Client lasts while your AdmitLabs service is active.</KpiNote>
            </KpiCard>
          ) : null}
          {tier === 'free' ? (
            <KpiCard label="Free Audit program">
              <KpiWord>{freeProgramName ?? 'Not picked yet'}</KpiWord>
              <KpiNote>One program on Free.</KpiNote>
            </KpiCard>
          ) : null}
          <KpiCard label="Audits">
            <KpiWord>{audits}</KpiWord>
            <KpiNote>{refresh}.</KpiNote>
          </KpiCard>
        </div>
      </section>

      {reminder.stage === 'ends_soon' || reminder.stage === 'ends_very_soon' ? (
        <Notice title={`Your Paid plan ends ${daysText(reminder.daysLeft ?? 0)}, on ${formatDate(plan?.endsAt as Date)}.`}>
          It does not renew on its own. When it ends you move to Free, and you keep your last Audit score.
        </Notice>
      ) : null}

      {tier === 'free' ? (
        <Card inverted padding="lg" className={styles.offer}>
          <div className={styles.offerPrice}>
            <p className={styles.offerName}>Paid adds everything else</p>
            <p className={styles.offerAmount}>
              <span className="num">{formatInr(PLAN_RULES.paid.priceInr)}</span>
            </p>
            <p className={styles.offerLength}>for {PLAN_RULES.paid.lengthMonths} months</p>
          </div>
          <ul className={styles.offerPoints}>
            <li>
              <Icon name="check" size={16} />
              Every check, every program, your rivals, what students want and a monthly report
            </li>
            <li>
              <Icon name="check" size={16} />
              Starts the day you pay
            </li>
            <li>
              <Icon name="check" size={16} />
              No auto-renew. We remind you 30 days and 7 days before it ends.
            </li>
            <li>
              <Icon name="check" size={16} />
              One plan, one price
            </li>
          </ul>
          <p className={styles.offerNote}>In this early version, the AdmitLabs team switches Paid on for you.</p>
        </Card>
      ) : null}

      <Section title="Compare plans" description="What each plan sees in Drishti.">
        <Card padding="none" className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.compare}>
              <caption className="visually-hidden">What each plan sees, by feature</caption>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  {TIERS.map((column) => (
                    <th key={column} scope="col" className={column === tier ? `invert ${styles.current}` : undefined}>
                      <span className={styles.columnName}>{TIER_LABELS[column]}</span>
                      {column === tier ? <span className={styles.yours}>Your plan</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              {GROUPS.map((group) => (
                <tbody key={group}>
                  <tr className={styles.groupRow}>
                    <th scope="colgroup" colSpan={4}>
                      {group}
                    </th>
                  </tr>
                  {ENTITLEMENTS.filter((row) => row.group === group).map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.label}</th>
                      {TIERS.map((column) => (
                        <td key={column} data-current={column === tier ? 'true' : undefined}>
                          {row.cells[column].access === 'none' ? <span className={styles.no}>No</span> : <CellText text={row.cells[column].text} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
        <p className={styles.fine}>
          Paid is {formatInr(PLAN_RULES.paid.priceInr)} for {PLAN_RULES.paid.lengthMonths} months. Clients get it as part of their AdmitLabs service.
        </p>
      </Section>
    </div>
  );
}
