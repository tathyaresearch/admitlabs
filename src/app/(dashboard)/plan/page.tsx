import { Notice } from '@/components/ui/Feedback';
import { Icon, type IconName } from '@/components/ui/Icon';
import { KpiCard, KpiNote, KpiNumber, KpiWord } from '@/components/ui/Kpi';
import { SectionHead } from '@/components/audit/AuditHeader';
import { PaidAction } from '@/components/plan/PaidAction';
import { Card, PageHead } from '@/components/ui/Layout';
import { CellText } from '@/components/ui/Results';
import { ENTITLEMENTS, PLAN_PAGE_GROUPS, type EntitlementCell, type EntitlementRow } from '@/config/entitlements';
import { PLAN_RULES } from '@/config/plans';
import { SCHEDULES } from '@/config/schedules';
import { formatDate, formatInr } from '@/domain/format';
import { planReminder } from '@/domain/tiers';
import { TIER_LABELS, TIERS, type Tier } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import audit from '@/components/audit/audit.module.css';
import styles from './plan.module.css';

export const metadata = { title: 'Plan' };

const ROWS = new Map(ENTITLEMENTS.map((row) => [row.key, row]));

const GROUP_ICONS: Readonly<Record<string, IconName>> = { Audit: 'audit', Rivals: 'rivals', Demand: 'demand', Reports: 'reports', 'AdmitLabs service': 'team' };

/** The line under each plan's name: what it costs, or how it comes. */
function priceLine(tier: Tier) {
  if (tier === 'paid') {
    return (
      <>
        <span className="num">{formatInr(PLAN_RULES.paid.priceInr)}</span> for {PLAN_RULES.paid.lengthMonths} months
      </>
    );
  }
  if (tier === 'free') return `One program, every ${SCHEDULES.free.auditEveryMonths} months`;
  return 'With your AdmitLabs service';
}

/** A tick when it is included, a short value when it is partly included, nothing when it is not. */
function PlanCell({ cell }: { cell: EntitlementCell }) {
  if (cell.access === 'none') return <span className="visually-hidden">Not included</span>;
  if (cell.text === 'Yes' || cell.text === 'Full') {
    return (
      <>
        <Icon name="check" size={18} className={styles.tick} />
        <span className="visually-hidden">Included</span>
      </>
    );
  }
  return (
    <span className={cell.access === 'placeholder' ? styles.quietValue : styles.value}>
      <CellText text={cell.text} />
    </span>
  );
}

function daysText(days: number): string {
  if (days === 0) return 'today';
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

// Plan answers "What's in our plan?": the plan and its dates, what to do next (on Free, what Paid
// adds and "Ask for Paid"; near the end of Paid, the reminder and "Ask to continue Paid"), then
// one table that compares the plans.
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
      ? 'You see your overall score and its three parts, and the top 3 things working and to fix, for one program. A new free Audit is ready every 3 months.'
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
        <Notice
          title={`Your Paid plan ends ${daysText(reminder.daysLeft ?? 0)}, on ${formatDate(plan?.endsAt as Date)}.`}
          action={<PaidAction viewer={viewer} variant="secondary" size="sm" note={false} />}
        >
          It does not renew on its own. When it ends you move to Free, and you keep your last Audit score. Ask AdmitLabs to continue it: the same price and
          terms, and nothing is paid here.
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
          <div className={styles.offerAsk}>
            <PaidAction viewer={viewer} note="short" />
          </div>
        </Card>
      ) : null}

      <section className={audit.section} aria-labelledby="compare-title">
        <SectionHead id="compare-title" icon="plan" title="Compare plans" help="What each plan sees in Drishti. No discounts: one plan, one price." />
        <div className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.compare}>
              <caption className="visually-hidden">What each plan sees, by feature. Your plan is {TIER_LABELS[tier]}.</caption>
              <colgroup>
                <col className={styles.featureColumn} />
                {TIERS.map((column) => (
                  <col key={column} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={styles.featureHead}>
                    <span className="visually-hidden">Feature</span>
                  </th>
                  {TIERS.map((column) => (
                    <th key={column} scope="col" className={column === tier ? styles.currentHead : styles.planHead}>
                      {column === tier ? <span className={styles.yours}>Your plan</span> : null}
                      <span className={styles.planName}>{TIER_LABELS[column]}</span>
                      <span className={styles.planPrice}>{priceLine(column)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              {PLAN_PAGE_GROUPS.map((group) => (
                <tbody key={group.title}>
                  <tr className={styles.groupRow}>
                    <th scope="colgroup" colSpan={TIERS.length + 1}>
                      <span className={styles.groupName}>
                        <Icon name={GROUP_ICONS[group.title] ?? 'plan'} size={16} />
                        {group.title}
                      </span>
                    </th>
                  </tr>
                  {group.keys.map((key) => {
                    const row = ROWS.get(key) as EntitlementRow;
                    return (
                      <tr key={key}>
                        <th scope="row" className={styles.featureCell}>
                          {row.label}
                        </th>
                        {TIERS.map((column) => (
                          <td key={column} className={column === tier ? styles.currentCell : undefined}>
                            <PlanCell cell={row.cells[column]} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        </div>
        <p className={styles.fine}>
          Paid is {formatInr(PLAN_RULES.paid.priceInr)} for {PLAN_RULES.paid.lengthMonths} months, with no auto-renew. Clients get it as part of their AdmitLabs service.
        </p>
      </section>
    </div>
  );
}
