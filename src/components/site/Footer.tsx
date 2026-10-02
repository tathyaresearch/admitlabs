// The website's footer: the wordmark and "© 2026 AdmitLabs" (the year it was built), the email, and
// links to Drishti and to sign in.

import { Wordmark } from '@/components/ui/Brand';
import { istParts } from '@/domain/dates';
import { appLink } from '@/lib/urls';
import { CTA, DRISHTI, FOOTER } from '@/site/content';
import sections from './sections.module.css';
import site from './site.module.css';

export function SiteFooter() {
  return (
    <footer className={sections.footer} data-theme="dark">
      <div className={`${site.container} ${sections.footerInner} ${site.reveal}`}>
        <div className={sections.footerBrand}>
          <Wordmark height={20} />
          <p className={sections.copyright}>
            © {istParts(new Date()).year} {FOOTER.name}
          </p>
        </div>
        <ul className={sections.footerLinks}>
          <li>
            <a className={sections.footerLink} href={`mailto:${FOOTER.email}`}>
              {FOOTER.email}
            </a>
          </li>
          <li>
            <a className={sections.footerLink} href={DRISHTI.explorePath}>
              {FOOTER.drishti}
            </a>
          </li>
          <li>
            <a className={sections.footerLink} href={appLink('/login')}>
              {CTA.signIn}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
