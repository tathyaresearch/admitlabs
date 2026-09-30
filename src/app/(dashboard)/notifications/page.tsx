import Link from 'next/link';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/Layout';
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

const LINK_TEXT: Readonly<Record<string, string>> = {
  audit_ready: 'See your Audit',
  rival_move: 'See the rival',
  demand_spike: 'See Demand',
  report_ready: 'See your report',
};

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

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Notifications"
        title="What's new"
        description={unread ? `${unread} new since you last looked.` : 'You are up to date.'}
      />
      {notifications.length ? (
        <ol className={styles.list}>
          {notifications.map((item) => (
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
                      {LINK_TEXT[item.kind] ?? 'Open'}
                      <Icon name="arrowRight" size={14} />
                    </Link>
                  ) : null}
                </p>
              </div>
              {!item.read ? <span className={styles.dot} aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon="bell" title="Nothing here yet">
          You will see a note here when your next Audit is ready.
        </EmptyState>
      )}
      {unread ? <MarkRead /> : null}
    </div>
  );
}
