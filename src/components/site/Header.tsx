// The website's header: the wordmark, links to the home page's sections with the Products menu,
// and the two buttons. Wide: everything in one row. Narrow: the wordmark, the main button and a
// menu. Sticky: clear over the light at the top of the page, glass once the page moves.

import Link from 'next/link';
import { Wordmark } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { appLink } from '@/lib/urls';
import { CTA, NAV, PRODUCTS } from '@/site/content';
import { ProductsMenu } from './ProductsMenu';
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
          {NAV.map((entry) =>
            'href' in entry ? (
              <a key={entry.href} href={entry.href} className={styles.navLink}>
                {entry.label}
              </a>
            ) : (
              <ProductsMenu key={entry.label} products={PRODUCTS} />
            ),
          )}
        </nav>
        <div className={styles.headerActions}>
          <ButtonLink href={CTA.enquiryPath} variant="secondary" size="sm" className={`${styles.workLink} ${styles.ghost}`}>
            {CTA.secondary}
          </ButtonLink>
          <ButtonLink href={appLink('/login')} size="sm" className={`${styles.cta} ${styles.headerCta}`}>
            {CTA.primary}
          </ButtonLink>
          <SiteMenu nav={NAV} products={PRODUCTS} work={{ href: CTA.enquiryPath, label: CTA.secondary }} />
        </div>
      </div>
    </header>
  );
}
