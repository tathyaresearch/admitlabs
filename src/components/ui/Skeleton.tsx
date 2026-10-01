// Loading placeholders in the shape of the page that is coming: the title and question, a row of
// number cards, then a list. A soft fade, no shimmer; still when the device asks for less motion.

import styles from './Skeleton.module.css';

export function Skeleton({ width, height, className }: { width?: string; height?: string; className?: string }) {
  return <span className={['skeleton', className].filter(Boolean).join(' ')} style={{ width, height }} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className={styles.page} role="status" aria-live="polite">
      <span className="visually-hidden">Loading</span>
      <div className={styles.head}>
        <Skeleton width="7rem" height="2rem" />
        <Skeleton width="min(18rem, 70%)" height="1rem" />
      </div>
      <Skeleton width="min(30rem, 90%)" height="1.5rem" />
      <div className={styles.cards}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={styles.card}>
            <Skeleton width="45%" height="0.75rem" />
            <Skeleton width={index === 0 ? '6rem' : '3rem'} height={index === 0 ? '3.5rem' : '1.75rem'} />
            <Skeleton width="70%" height="0.5rem" />
          </div>
        ))}
      </div>
      <div className={styles.list}>
        {[0, 1, 2].map((index) => (
          <div key={index} className={styles.row}>
            <Skeleton width="1.75rem" height="1.75rem" className={styles.round} />
            <div className={styles.lines}>
              <Skeleton width="min(24rem, 80%)" height="1rem" />
              <Skeleton width="min(36rem, 95%)" height="0.75rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
