import type { Metadata, Viewport } from 'next';
import { EnquiryForm } from '@/components/site/EnquiryForm';
import { SiteFooter } from '@/components/site/Footer';
import { Frame } from '@/components/site/Frame';
import { SiteHeader } from '@/components/site/Header';
import { AnchorButton } from '@/components/ui/Button';
import { SITE_SETTINGS } from '@/config/site';
import { APP_OPEN } from '@/lib/urls';
import { ENQUIRY } from '@/site/content';
import enquiry from '@/components/site/enquiry.module.css';
import site from '@/components/site/site.module.css';

// "Work with us" (admitlabs.in/work-with-us): a short form that lands in the team area's
// Enquiries list. In the Spotlight style, like the home page. Prerendered; the form sends through
// a server action. While Drishti is not open yet there is no database to send to: an email instead.
export const dynamic = 'force-static';

const TITLE = 'Work with us | AdmitLabs';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: ENQUIRY.lede,
  applicationName: 'AdmitLabs',
  alternates: { canonical: '/work-with-us' },
  openGraph: { type: 'website', url: '/work-with-us', siteName: 'AdmitLabs', title: TITLE, description: ENQUIRY.lede, locale: 'en_IN' },
  twitter: { card: 'summary_large_image', title: TITLE, description: ENQUIRY.lede },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  colorScheme: 'dark',
};

export default function WorkWithUsPage() {
  return (
    <div className={site.page} data-theme="dark">
      <style href="admitlabs-site" precedence="default">
        {'html,body{background:#0a0a0c}html{scroll-behavior:smooth;scroll-padding-top:4.5rem}'}
      </style>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <section className={`${enquiry.section} ${site.grain}`} data-theme="dark" aria-labelledby="enquiry-title">
          <div className={enquiry.light} aria-hidden="true" />
          <Frame draw />
          <div className={`${site.container} ${enquiry.grid}`}>
            <div className={enquiry.intro}>
              <h1 id="enquiry-title" className={enquiry.title}>
                {ENQUIRY.title}
              </h1>
              <p className={enquiry.lede}>{ENQUIRY.lede}</p>
              {APP_OPEN ? (
                <p className={enquiry.write}>
                  {ENQUIRY.orWrite} <a href={`mailto:${SITE_SETTINGS.email}`}>{SITE_SETTINGS.email}</a>.
                </p>
              ) : null}
            </div>
            <div className={enquiry.card} data-theme="light">
              {APP_OPEN ? (
                <EnquiryForm />
              ) : (
                <div className={enquiry.mail}>
                  <AnchorButton href={`mailto:${SITE_SETTINGS.email}`} icon="mail" size="lg" block className={site.ctaInk}>
                    {ENQUIRY.emailUs}
                  </AnchorButton>
                  <p className={enquiry.mailAddress}>{SITE_SETTINGS.email}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
