import Link from 'next/link';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { recentGroup, type RecentGroup } from '@/domain/dates';
import { formatDate } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
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

const GROUPS: ReadonlyArray<{ id: RecentGroup; title: string }> = [
  { id: 'week', title: 'This week' },
  { id: 'month', title: 'This month' },
  { id: 'earlier', title: 'Earlier' },
];

// Notifications answers "What changed lately?": newest first, grouped by this week, this month
// and earlier. Each one opens where it happened.
export default async function NotificationsPage() {
  const viewer = await requireInstitutionViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, kind, text, link, read, created_at')
    .eq('institution_id', viewer.membership.institution.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const notifications = data ?? [];
  const unread = notifications.filter((item) => !item.read).length;
  const now = new Date();
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
        <EmptyState icon="bell" title="Nothing here yet">
          You will see a note here when your next Audit is ready.
        </EmptyState>
      )}
      {/* The AdmitLabs team viewing their dashboard only looks: nothing is marked read. */}
      {unread && !viewer.viewingAs ? <MarkRead /> : null}
    </div>
  );
}
