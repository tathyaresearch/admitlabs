import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import styles from './audit.module.css';

/**
 * One heading and one short helper line, the same for every section on every page, with an
 * optional link on the right ("See all 13 fixes"). Page titles use PageHead (ui/Layout).
 */
export function SectionHead({ id, title, help, action, icon }: { id: string; title: string; help?: string; action?: ReactNode; icon?: IconName }) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionText}>
        <h2 id={id} className={styles.sectionTitle}>
          {icon ? <Icon name={icon} size={20} className={styles.sectionIcon} /> : null}
          {title}
        </h2>
        {help ? <p className={styles.sectionHelp}>{help}</p> : null}
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  );
}
