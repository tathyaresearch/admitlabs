import { Notice } from '@/components/ui/Feedback';
import { Icon, type IconName } from '@/components/ui/Icon';
import { KpiCard, KpiNote, KpiNumber, KpiWord } from '@/components/ui/Kpi';
import { SectionHead } from '@/components/audit/AuditHeader';
import { PaidAction } from '@/components/plan/PaidAction';
import { Card, PageHead } from '@/components/ui/Layout';
import { CellText } from '@/components/ui/Results';
import { ENTITLEMENTS, PLAN_PAGE_GROUPS, type EntitlementCell, type EntitlementRow } from '@/config/entitlements';
import { SCHEDULES } from '@/config/schedules';
import { formatDate } from '@/domain/format';
import { PAID_PRICE_BY_MONTHS, PAID_PRICE_LINE, PAID_PRICES, PLAN_REMINDER_TEXT, planReminder } from '@/domain/tiers';
import { TIER_LABELS, TIERS, type Tier } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadPaidAsk } from '@/lib/plan/ask';
import { createClient } from '@/lib/supabase/server';
import audit from '@/components/audit/audit.module.css';
import { PaidOffer } from './PaidOffer';
import styles from './plan.module.css';

export const metadata = { title: 'Plan' };

const ROWS = new Map(ENTITLEMENTS.map((row) => [row.key, row]));

const GROUP_ICONS: Readonly<Record<string, IconName>> = { Audit: 'audit', Rivals: 'rivals', Demand: 'demand', Leads: 'enquiry', 'Reports and emails': 'reports', 'AdmitLabs service': 'team' };

/** The line under each plan's name: what it costs, or how it comes. Paid: both periods, one to a line. */
function priceLine(tier: Tier) {
  if (tier === 'paid') {
    return PAID_PRICES.map((price) => (
      <span key={price.months} className={styles.planPriceLine}>
        <span className="num">{price.amount}</span> {price.tax} {price.term}
      </span>
    ));
  }
  if (tier === 'free') return `One program, every ${SCHEDULES.free.auditEveryMonths} months`;
  return 'With your AdmitLabs service';
}

/** A tick when it is included, a short value when it is partly included, nothing when it is not (or why, when the plan gets something else instead). */
function PlanCell({ cell }: { cell: EntitlementCell }) {
  if (cell.access === 'none') {
    return cell.text === 'No' ? (
      <span className="visually-hidden">Not included</span>
    ) : (
      <span className={styles.quietValue}>
        <CellText text={cell.text} />
      </span>
    );
  }
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
// adds and "Subscribe now"; near the end of Paid, the reminder and "Renew now"), then one table
// that compares the plans.
export default async function PlanPage() {
  const viewer = await requireInstitutionViewer();
  const { tier, plan } = viewer;
  const reminder = planReminder(plan, new Date());
  const paidEnded = plan?.tier === 'paid' && reminder.stage === 'ended';
  const askState = tier === 'free' ? await loadPaidAsk(viewer) : null;

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
    ? `Your Paid plan ended on ${formatDate(plan.endsAt as Date)}. You're on Free now, and you still see your last Audit.`
    : tier === 'free'
      ? `You see Visibility, Trust and Chosen, place by place, and your top 3 fixes and strengths with proof, for one program. A new free Audit is ready every ${SCHEDULES.free.auditEveryMonths} months.`
      : tier === 'paid'
        ? 'You see everything Drishti finds, with proof: all your programs, your rivals in your city place by place, what students want, and a summary and a report every month.'
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
            {plan ? (
              <KpiNote>
                {tier === 'free' && paidEnded
                  ? `Since ${formatDate(plan.endsAt as Date)}`
                  : tier === 'paid' && plan.paidMonths
                    ? `${PAID_PRICE_BY_MONTHS[plan.paidMonths].label}, since ${formatDate(plan.startsAt)}`
                    : `Since ${formatDate(plan.startsAt)}`}
              </KpiNote>
            ) : null}
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
          It does not renew on its own. When it ends you move to Free, and you keep your last Audit. Renew now to keep it, monthly or for 3 months.
        </Notice>
      ) : null}

      {tier === 'free' && askState ? (
        <Card inverted padding="lg" className={styles.offer}>
          <PaidOffer state={askState}>
          <ul className={styles.offerPoints}>
            <li>
              <Icon name="check" size={16} />
              Everything Drishti finds, every program, your rivals place by place, what students want, and a summary and a report every month
            </li>
            <li>
              <Icon name="check" size={16} />
              Starts the day you pay
            </li>
            <li>
              <Icon name="check" size={16} />
              No auto-renew. {PLAN_REMINDER_TEXT}
            </li>
            <li>
              <Icon name="check" size={16} />
              One plan, billed monthly or for 3 months
            </li>
          </ul>
          </PaidOffer>
        </Card>
      ) : null}

      <section className={audit.section} aria-labelledby="compare-title">
        <SectionHead id="compare-title" icon="plan" title="Compare plans" help="What each plan sees in Drishti. Paid is one plan, billed monthly or for 3 months." />
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
          Paid is {PAID_PRICE_LINE}, with no auto-renew. Clients get it as part of their AdmitLabs service.
        </p>
      </section>
    </div>
  );
}
