import type { ReactNode } from 'react';
import styles from './Feedback.module.css';
import { Icon, type IconName } from './Icon';

/** A callout. `inverse` is the loud one: use it for the single thing that needs attention. */
export function Notice({
  title,
  children,
  icon = 'info',
  tone = 'quiet',
  action,
}: {
  title?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  tone?: 'quiet' | 'inverse';
  action?: ReactNode;
}) {
  return (
    <div className={[styles.notice, tone === 'inverse' ? `invert ${styles.inverse}` : styles.quiet].join(' ')} role="note">
      <Icon name={icon} size={20} className={styles.noticeIcon} />
      <div className={styles.noticeBody}>
        {title ? <p className={styles.noticeTitle}>{title}</p> : null}
        {children ? <div className={styles.noticeText}>{children}</div> : null}
      </div>
      {action ? <div className={styles.noticeAction}>{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = 'grid',
  title,
  children,
  action,
  headingLevel = 2,
}: {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** Use 3 when the empty state sits inside a section that already has an h2. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={24} />
      </span>
      <Heading className={styles.emptyTitle}>{title}</Heading>
      {children ? <div className={styles.emptyText}>{children}</div> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

/** Loading placeholder shapes. Wrap a group of them in <SkeletonGroup> so it is announced once. */
export function Skeleton({ width = '100%', height = '1rem', radius = 'var(--radius-xs)' }: { width?: string; height?: string; radius?: string }) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function SkeletonGroup({ label = 'Loading', children }: { label?: string; children: ReactNode }) {
  return (
    <div className={styles.skeletonGroup} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}
