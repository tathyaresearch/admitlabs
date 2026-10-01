// The website's header: the wordmark, links to the home page's sections, and the two buttons.
// Wide: everything in one row. Narrow: the wordmark, the main button and a menu.

import { Wordmark } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { appLink } from '@/lib/urls';
import { CTA, NAV } from '@/site/content';
import { SiteMenu } from './SiteMenu';
import styles from './site.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header} data-theme="dark">
      <div className={`${styles.container} ${styles.headerInner}`}>
        <a href="#top" className={styles.homeLink} aria-label="AdmitLabs, back to the top">
          <Wordmark height={21} />
        </a>
        <nav className={styles.nav} aria-label="On this page">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <ButtonLink href={CTA.enquiryPath} variant="secondary" size="sm" className={styles.workLink}>
            {CTA.secondary}
          </ButtonLink>
          <ButtonLink href={appLink('/login')} size="sm">
            {CTA.primary}
          </ButtonLink>
          <SiteMenu links={NAV} work={{ href: CTA.enquiryPath, label: CTA.secondary }} />
        </div>
      </div>
    </header>
  );
}
