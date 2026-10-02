// The website's header: the wordmark, links to the home page's sections, and the two buttons.
// Wide: everything in one row. Narrow: the wordmark, the main button and a menu. Sticky: clear
// over the light at the top of the page, glass once the page moves.

import Link from 'next/link';
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
        {/* No prefetch: on the home page it would fetch the page that is already open. */}
        <Link href="/" prefetch={false} className={styles.homeLink} aria-label="AdmitLabs, home">
          <Wordmark height={21} />
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <ButtonLink href={CTA.enquiryPath} variant="secondary" size="sm" className={`${styles.workLink} ${styles.ghost}`}>
            {CTA.secondary}
          </ButtonLink>
          <ButtonLink href={appLink('/login')} size="sm" className={styles.cta}>
            {CTA.primary}
          </ButtonLink>
          <SiteMenu links={NAV} work={{ href: CTA.enquiryPath, label: CTA.secondary }} />
        </div>
      </div>
    </header>
  );
}
