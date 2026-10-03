// The frame of both doors into Drishti, /signup and /login: the form first in reading order, and the
// left side (a motion picture for each page, hidden from screen readers) beside it on a wide screen
// and in a small band above it on a phone. The left side carries the logo and one line.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { SITE_SETTINGS } from '@/config/site';
import { APP_OPEN, SITE_URL } from '@/lib/urls';
import { CTA } from '@/site/content';
import { CODE_COPY, SOON_COPY, type AuthMode } from './content';
import styles from './auth.module.css';
import stage from './stage.module.css';

/** The logo goes to the website’s home page: this address while Drishti is closed, the website’s from the dashboard. */
const HOME = APP_OPEN ? `${SITE_URL}/` : '/';

export function AuthPage({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <main id="main" className={styles.formSide}>
        <div className={styles.formWrap}>{children}</div>
        <p className={styles.trust}>{CODE_COPY.trust}</p>
      </main>
      <aside className={`${styles.stageArea} ${stage.stage}`} data-theme="dark" aria-label="Drishti by AdmitLabs">
        {left}
        <a href={HOME} className={stage.brand} aria-label="AdmitLabs, home">
          <ProductLockup size="md" motion="blink" />
        </a>
        <p className={stage.line}>{CODE_COPY.line}</p>
      </aside>
    </div>
  );
}

/**
 * Instead of the form while Drishti is not open yet (production, until it opens): one line and a
 * way to write to us, as everywhere on the website. No email field, no code, no database.
 */
export function OpensSoon({ mode }: { mode: AuthMode }) {
  const foot = SOON_COPY.foot[mode];
  return (
    <div className={styles.soon}>
      <div className={styles.formHead}>
        <h1 className={styles.formTitle}>{SOON_COPY.title}</h1>
        <p className={styles.formText}>{SOON_COPY.text}</p>
      </div>
      <AnchorButton href={`mailto:${SITE_SETTINGS.email}`} size="lg" block icon="mail" className={styles.soonButton}>
        {CTA.talk}
      </AnchorButton>
      <p className={styles.foot}>
        {foot.text}{' '}
        <Link href={foot.href} className={styles.footLink}>
          {foot.link}
        </Link>
      </p>
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
