// The website's header: the wordmark, links to the home page's sections with the Products menu,
// and two buttons: Talk to us, outlined, then Sign in, filled, last. Wide: everything in one row.
// Narrow: the wordmark, Talk to us and a menu, with both buttons inside it. Sticky: clear over the
// light at the top of the page, glass once the page moves.

import Link from 'next/link';
import { Wordmark } from '@/components/ui/Brand';
import { AnchorButton } from '@/components/ui/Button';
import { NAV, PRODUCTS } from '@/site/content';
import { headerButtons } from '@/site/way-in';
import { ProductsMenu } from './ProductsMenu';
import { SiteMenu } from './SiteMenu';
import styles from './site.module.css';

/** Sign in, and "Talk to us" (once Drishti opens, "Get your free Audit"): src/site/way-in.ts. */
const BUTTONS = headerButtons();

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
          <AnchorButton href={BUTTONS.talk.href} variant="secondary" size="sm" className={`${styles.ghost} ${styles.headerCta}`}>
            {BUTTONS.talk.label}
          </AnchorButton>
          <AnchorButton href={BUTTONS.signIn.href} size="sm" className={`${styles.cta} ${styles.signInButton}`}>
            {BUTTONS.signIn.label}
          </AnchorButton>
          <SiteMenu nav={NAV} products={PRODUCTS} buttons={[{ ...BUTTONS.talk, filled: false }, { ...BUTTONS.signIn, filled: true }]} />
        </div>
      </div>
    </header>
  );
}
