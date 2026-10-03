// The frame of both doors into Drishti, /signup and /login: the form first in reading order, and the
// left side (a motion picture for each page, hidden from screen readers) beside it on a wide screen
// and in a small band above it on a phone. The left side carries the logo and one line.

import type { ReactNode } from 'react';
import { ProductLockup } from '@/components/ui/Brand';
import { Notice } from '@/components/ui/Feedback';
import { CODE_COPY } from './content';
import styles from './auth.module.css';
import stage from './stage.module.css';

export function AuthPage({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <main id="main" className={styles.formSide}>
        <div className={styles.formWrap}>{children}</div>
        <p className={styles.trust}>{CODE_COPY.trust}</p>
      </main>
      <aside className={`${styles.stageArea} ${stage.stage}`} data-theme="dark" aria-label="Drishti by AdmitLabs">
        {left}
        <div className={stage.brand}>
          <ProductLockup size="md" motion="blink" />
        </div>
        <p className={stage.line}>{CODE_COPY.line}</p>
      </aside>
    </div>
  );
}

/** Instead of the form while the local database is not running. */
export function DatabaseOff() {
  return (
    <Notice title="The local database is not running" tone="inverse">
      Start it with <code>npm run db:start</code>, load the sample data with <code>npm run db:reset</code>, then restart <code>npm run dev</code>.
    </Notice>
  );
}
