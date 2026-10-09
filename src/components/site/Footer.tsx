// The website's footer: the wordmark and "© 2026 AdmitLabs" (the year it was built), the email,
// links to Drishti and to sign in, and AdmitLabs on LinkedIn, X and Instagram, as icons in the
// footer's own link colour.

import { Wordmark } from '@/components/ui/Brand';
import { BRAND_MARKS, LINKEDIN_MARK } from '@/graphics/brands';
import { istParts } from '@/domain/dates';
import { DRISHTI, FOOTER } from '@/site/content';
import { signIn } from '@/site/way-in';
import sections from './sections.module.css';
import site from './site.module.css';

/** Sign in, to /login (src/site/way-in.ts). */
const SIGN_IN = signIn();

const MARKS = { linkedin: LINKEDIN_MARK, x: BRAND_MARKS.x, instagram: BRAND_MARKS.instagram } as const;

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
            <a className={sections.footerLink} href={SIGN_IN.href}>
              {SIGN_IN.label}
            </a>
          </li>
          <li>
            <ul className={sections.footerSocial}>
              {FOOTER.social.map((item) => (
                <li key={item.key}>
                  <a className={`${sections.footerLink} ${sections.socialLink}`} href={item.href} target="_blank" rel="noopener" aria-label={item.label}>
                    <svg viewBox={MARKS[item.key].viewBox} width={18} height={18} aria-hidden="true" focusable="false">
                      <path d={MARKS[item.key].path} fill="currentColor" fillRule="evenodd" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </footer>
  );
}
