import Link from 'next/link';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { nextPullOn } from '@/demand/schedule';
import { alertsAhead } from '@/domain/alerts';
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
// and earlier. Each one opens where it happened. While the list is short, what arrives here next.
export default async function NotificationsPage() {
  const viewer = await requireInstitutionViewer();
  const { institution } = viewer.membership;
  const supabase = await createClient();
  const [{ data }, audits, rivals] = await Promise.all([
    supabase.from('notifications').select('id, kind, text, link, read, created_at').eq('institution_id', institution.id).order('created_at', { ascending: false }).limit(50),
    loadAuditPage(viewer),
    loadRivalList(institution.id),
  ]);
  const notifications = data ?? [];
  const unread = notifications.filter((item) => !item.read).length;
  const now = new Date();
  const ahead = alertsAhead({
    tier: viewer.tier,
    nextAudit: audits.nextAudit,
    hasRivals: rivals.length > 0,
    city: institution.city,
    nextUpdate: nextPullOn(now),
    nextReport: nextReport(now).on,
  });
  const grouped = GROUPS.map((group) => ({ ...group, items: notifications.filter((item) => recentGroup(new Date(item.created_at), now) === group.id) })).filter(
    (group) => group.items.length,
  );

  return (
    <div className={styles.page}>
      <PageHead title="Notifications" question="What changed lately?" caption={unread ? `${unread} new since you last looked` : 'You are up to date'} />
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
                          Open
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
      {grouped.length && notifications.length < SHORT_LIST ? (
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
