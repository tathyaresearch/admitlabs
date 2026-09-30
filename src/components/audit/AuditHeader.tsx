import type { ReactNode } from 'react';
import styles from './audit.module.css';

/** The page title, one small caption line (checked, next Audit, plan), and actions on the right. */
export function AuditHeader({ title, caption, actions }: { title: string; caption: readonly ReactNode[]; actions?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.caption}>
          {caption.map((item, index) => (
            <span key={index}>{item}</span>
          ))}
        </p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

/** One heading and one short helper line, the same for every section. */
export function SectionHead({ id, title, help }: { id: string; title: string; help: string }) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      <p className={styles.sectionHelp}>{help}</p>
    </div>
  );
}
