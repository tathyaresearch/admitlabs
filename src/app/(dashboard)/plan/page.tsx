import { Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { Card, FactList, Highlight, PageHeader, Section } from '@/components/ui/Layout';
import { ENTITLEMENTS, paidUnlocks, type EntitlementGroup } from '@/config/entitlements';
import { PLAN_RULES } from '@/config/plans';
import { SCHEDULES } from '@/config/schedules';
import { formatDate, formatInr } from '@/domain/format';
import { planReminder } from '@/domain/tiers';
import { TIER_LABELS, TIERS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import styles from './plan.module.css';

export const metadata = { title: 'Plan' };

const GROUPS: readonly EntitlementGroup[] = ['Audit', 'Rivals', 'Demand', 'Other'];

function daysText(days: number): string {
  if (days === 0) return 'today';
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

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
  const title =
    tier === 'client' ? (
      <>
        You&apos;re an AdmitLabs <Highlight>client</Highlight>.
      </>
    ) : (
      <>
        You&apos;re on <Highlight>{TIER_LABELS[tier]}</Highlight>.
      </>
    );

  const description = paidEnded
    ? `Your Paid plan ended on ${formatDate(plan.endsAt as Date)}. You're on Free now, and you still see your last Audit score.`
    : tier === 'free'
      ? 'You see your overall score, your three pillar scores, and the top 3 things working and to fix, for one program. A new free Audit is ready every 3 months.'
      : tier === 'paid'
        ? 'You see everything Drishti finds: every check with its source, all your programs, your rivals, what students want, and a monthly report.'
        : 'Everything in Paid, and the AdmitLabs team acts on it with you.';

  const facts = [
    { label: 'Plan', value: TIER_LABELS[tier] },
    ...(plan ? [{ label: 'Started', value: formatDate(plan.startsAt) }] : []),
    ...(tier === 'paid' && plan?.endsAt ? [{ label: 'Ends', value: formatDate(plan.endsAt) }] : []),
    ...(tier === 'paid' && reminder.daysLeft !== null ? [{ label: 'Days left', value: String(reminder.daysLeft) }] : []),
    ...(tier === 'client' ? [{ label: 'Ends', value: 'While your AdmitLabs service is active' }] : []),
    ...(freeProgramName ? [{ label: 'Free Audit program', value: freeProgramName }] : []),
    { label: 'Audits', value: schedule.auditEveryMonths === 1 ? 'Every month' : `Every ${schedule.auditEveryMonths} months` },
    {
      label: 'Extra refresh',
      value: schedule.manualRefresh === 'none' ? 'Not included' : schedule.manualRefresh === 'once_a_month' ? 'Once a month' : 'Anytime, by the AdmitLabs team',
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Plan and access" title={title} description={description} />

      {reminder.stage === 'ends_soon' || reminder.stage === 'ends_very_soon' ? (
        <Notice title={`Your Paid plan ends ${daysText(reminder.daysLeft ?? 0)}, on ${formatDate(plan?.endsAt as Date)}.`}>
          It does not renew on its own. When it ends you move to Free, and you keep your last Audit score.
        </Notice>
      ) : null}

      <div className={styles.top}>
        <Card>
          <h2 className={styles.cardTitle}>Your plan</h2>
          <FactList items={facts} />
        </Card>

        {tier === 'free' ? (
          <Card inverted className={styles.offer}>
            <p className={styles.offerName}>Paid</p>
            <p className={styles.offerPrice}>{formatInr(PLAN_RULES.paid.priceInr)}</p>
            <p className={styles.offerLength}>for {PLAN_RULES.paid.lengthMonths} months</p>
            <ul className={styles.offerPoints}>
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
        ) : (
          <Card>
            <h2 className={styles.cardTitle}>{tier === 'client' ? 'Included with your service' : 'What your plan includes'}</h2>
            <ul className={styles.unlocks}>
              {paidUnlocks().map((row) => (
                <li key={row.key}>
                  <Icon name="check" size={16} />
                  <span>
                    <span className={styles.unlockLabel}>
                      {row.group === 'Other' ? row.label : `${row.group}: ${row.label.charAt(0).toLowerCase()}${row.label.slice(1)}`}
                    </span>
                    <span className={styles.unlockValue}>{row.cells[tier].text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {tier === 'free' ? (
        <Section title="What Paid unlocks" description="Everything Free shows stays. Paid adds the rest.">
          <ul className={styles.unlockGrid}>
            {paidUnlocks().map((row) => (
              <li key={row.key} className={styles.unlockCard}>
                <span className={styles.unlockGroup}>{row.group}</span>
                <span className={styles.unlockLabel}>{row.label}</span>
                <span className={styles.unlockValue}>{row.cells.paid.text}</span>
              </li>
            ))}
          </ul>
        </Section>
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
                          {row.cells[column].access === 'none' ? <span className={styles.no}>No</span> : row.cells[column].text}
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
