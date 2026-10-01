// The product page's header and footer. Links into the dashboard go through appLink(), so moving
// the page to admitlabs.in/drishti later is a settings change only.

import { ProductLockup } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { istParts } from '@/domain/dates';
import { appLink } from '@/lib/urls';
import { CLIENTS, CTA, FOOTER } from '@/product/content';
import styles from './product.module.css';

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#plans', label: 'Plans' },
] as const;

export function ProductHeader() {
  return (
    <header className={styles.header} data-theme="dark">
      <div className={`${styles.container} ${styles.headerInner}`}>
        <a href="#top" className={styles.homeLink} aria-label="Drishti by AdmitLabs, back to the top">
          <ProductLockup size="md" />
        </a>
        <nav className={styles.nav} aria-label="On this page">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <ButtonLink href={appLink('/login')} variant="quiet" size="sm" className={styles.signIn}>
            {CTA.signIn}
          </ButtonLink>
          <ButtonLink href={appLink('/login')} size="sm">
            {CTA.primary}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

export function ProductFooter() {
  return (
    <footer className={styles.footer} data-theme="dark">
      <div className={styles.container}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <ProductLockup size="md" />
            <p className={styles.footerTagline}>{FOOTER.tagline}</p>
          </div>
          <ul className={styles.footerLinks}>
            <li>
              <a className={styles.footerLink} href={appLink('/login')}>
                {CTA.signIn}
              </a>
            </li>
            <li>
              <a className={styles.footerLink} href={`mailto:${CLIENTS.email}`}>
                {CLIENTS.email}
              </a>
            </li>
            <li>
              <a className={styles.footerLink} href={FOOTER.site.href}>
                {FOOTER.site.label}
              </a>
            </li>
          </ul>
        </div>
        <div className={styles.footerBottom}>
          <span>© {istParts(new Date()).year} AdmitLabs</span>
          <span>{FOOTER.note}</span>
        </div>
      </div>
    </footer>
  );
}
