// Fake shapes for a locked check detail (spec section 10: blurred content is placeholder
// content, never real data hidden with CSS). Nothing here comes from an Audit.

import styles from './audit.module.css';

const WIDTHS = ['32%', '92%', '74%', '28%', '86%', '60%'] as const;

export function PlaceholderDetail() {
  return (
    <div className={styles.placeholderDetail}>
      {WIDTHS.map((width, index) => (
        <span key={index} className={styles.placeholderBar} style={{ width }} />
      ))}
    </div>
  );
}
