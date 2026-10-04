import Link from 'next/link';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { nextPullOn } from '@/demand/schedule';
import { ALERT_FILTER_LABELS, ALERT_FILTERS, alertFilter, alertLinkText, type AlertFilter } from '@/domain/alert-kinds';
import { alertsAhead } from '@/domain/alerts';
import { effectiveTier } from '@/domain/tiers';
import { recentGroup, type RecentGroup } from '@/domain/dates';
import { formatDate } from '@/domain/format';
import { loadAuditPage } from '@/lib/audit/load';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadRivalList } from '@/lib/rivals/load';
import { createClient } from '@/lib/supabase/server';
import { nextReport } from '@/report/schedule';
import { MarkRead } from './MarkRead';
import styles from './notifications.module.css';

export const metadata = { title: 'Notifications' };

const ICONS: Readonly<Record<string, IconName>> = {
  audit_ready: 'audit',
  rival_move: 'rivals',
  demand_spike: 'demand',
  report_ready: 'reports',
  plan_reminder: 'plan',
  plan_ended: 'plan',
};

/** Below this many alerts, the page also says what arrives here and when. */
const SHORT_LIST = 3;

const GROUPS: ReadonlyArray<{ id: RecentGroup; title: string }> = [
  { id: 'week', title: 'This week' },
  { id: 'month', title: 'This month' },
  { id: 'earlier', title: 'Earlier' },
];

// Notifications answers "What changed lately?": newest first, grouped by this week, this month
// and earlier, with filters by what they are about. Each one's link says where it goes. While
// the list is short, what arrives here next.
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const asked = one((await searchParams).show);
  const show: AlertFilter | null = ALERT_FILTERS.includes(asked as AlertFilter) ? (asked as AlertFilter) : null;
  const { institution } = viewer.membership;
  const supabase = await createClient();
  const [{ data }, audits, rivals] = await Promise.all([
    supabase.from('notifications').select('id, kind, text, link, read, created_at').eq('institution_id', institution.id).order('created_at', { ascending: false }).limit(50),
    loadAuditPage(viewer),
    loadRivalList(institution.id),
  ]);
  const all = data ?? [];
  // Only the filters that have alerts, each with how many.
  const counts = ALERT_FILTERS.map((filter) => ({ filter, count: all.filter((item) => alertFilter(item.kind) === filter).length })).filter((entry) => entry.count > 0);
  const notifications = show ? all.filter((item) => alertFilter(item.kind) === show) : all;
  const unread = all.filter((item) => !item.read).length;
  const now = new Date();
  const ahead = alertsAhead({
    tier: viewer.tier,
    nextAudit: audits.nextAudit,
    hasRivals: rivals.length > 0,
    city: institution.city,
    nextUpdate: nextPullOn(now),
    // Made only while the plan is still Paid or Client on the day.
    nextReport: effectiveTier(viewer.plan, nextReport(now).on) === 'free' ? null : nextReport(now).on,
  });
  const grouped = GROUPS.map((group) => ({ ...group, items: notifications.filter((item) => recentGroup(new Date(item.created_at), now) === group.id) })).filter(
    (group) => group.items.length,
  );

  return (
    <div className={styles.page}>
      <PageHead title="Notifications" question="What changed lately?" caption={unread ? `${unread} new since you last looked` : 'You are up to date'} />
      {counts.length > 1 ? (
        <nav className={styles.filters} aria-label="Show">
          <Link href="/notifications" className={styles.filter} aria-current={show === null ? 'page' : undefined} scroll={false}>
            All <span className="num">{all.length}</span>
          </Link>
          {counts.map(({ filter, count }) => (
            <Link key={filter} href={`/notifications?show=${filter}`} className={styles.filter} aria-current={show === filter ? 'page' : undefined} scroll={false}>
              {ALERT_FILTER_LABELS[filter]} <span className="num">{count}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      {grouped.length ? (
        grouped.map((group) => (
          <section key={group.id} className={styles.group} aria-labelledby={`group-${group.id}`}>
            <h2 id={`group-${group.id}`} className={styles.groupTitle}>
              {group.title}
            </h2>
            <ol className={styles.list}>
              {group.items.map((item) => (
                <li key={item.id} className={styles.item} data-unread={item.read ? undefined : 'true'}>
                  <span className={styles.icon} aria-hidden="true">
                    <Icon name={ICONS[item.kind] ?? 'bell'} size={18} />
                  </span>
                  <div className={styles.body}>
                    <p className={styles.text}>
                      {!item.read ? <span className="visually-hidden">New. </span> : null}
                      {item.text}
                    </p>
                    <p className={styles.meta}>
                      <span>{formatDate(item.created_at)}</span>
                      {item.link ? (
                        <Link href={item.link} className={styles.link}>
                          {alertLinkText(item.kind, item.link)}
                          <Icon name="arrowRight" size={14} />
                        </Link>
                      ) : null}
                    </p>
                  </div>
                  {!item.read ? <span className={styles.dot} aria-hidden="true" /> : null}
                </li>
              ))}
            </ol>
          </section>
        ))
      ) : show ? (
        <p className={styles.none}>No {ALERT_FILTER_LABELS[show].toLowerCase()} alerts yet.</p>
      ) : (
        <EmptyState icon="bell" title="No alerts yet">
          <p>What arrives here, and when:</p>
          <ul className={styles.ahead}>
            {ahead.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </EmptyState>
      )}
      {grouped.length && !show && all.length < SHORT_LIST ? (
        <section className={styles.group} aria-labelledby="ahead-title">
          <h2 id="ahead-title" className={styles.groupTitle}>
            What arrives here next
          </h2>
          <ul className={`${styles.ahead} ${styles.aheadCard}`}>
            {ahead.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* The AdmitLabs team viewing their dashboard only looks: nothing is marked read. */}
      {unread && !viewer.viewingAs ? <MarkRead /> : null}
    </div>
  );
}
