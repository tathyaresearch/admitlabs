import type { Metadata, Viewport } from 'next';
import { DrishtiSection } from '@/components/site/Drishti';
import { SiteFooter } from '@/components/site/Footer';
import { SiteHeader } from '@/components/site/Header';
import { Hero } from '@/components/site/Hero';
import { Audience, Faq, FinalCall, HowWeWork, OurWork, Tathya } from '@/components/site/Sections';
import { Services } from '@/components/site/Services';
import { System } from '@/components/site/System';
import styles from '@/components/site/site.module.css';

// The AdmitLabs website's home page, served at admitlabs.in (src/lib/hosts.ts), in the Spotlight
// style. Prerendered once at build: no request data, and its pictures are drawn from a made-up
// institution (src/site/scenes.ts). It sets its own black and ivory sections, whatever the device
// setting.
export const dynamic = 'force-static';

const NAME = 'AdmitLabs';
const TITLE = 'AdmitLabs: get discovered, trusted, and chosen';
const DESCRIPTION = 'AdmitLabs helps private colleges, universities and skilling institutes grow admissions. We measure where you stand, then build the content students choose.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  applicationName: NAME,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', siteName: NAME, title: TITLE, description: DESCRIPTION, locale: 'en_IN' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  colorScheme: 'dark',
};

export default function SitePage() {
  return (
    <div id="top" className={styles.page} data-theme="dark">
      {/* The page behind the page (overscroll) stays black; section links land below the header. */}
      <style href="admitlabs-site" precedence="default">
        {'html,body{background:#0a0a0c}html{scroll-behavior:smooth;scroll-padding-top:4.5rem}'}
      </style>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <System />
        <Services />
        <DrishtiSection />
        <Audience />
        <OurWork />
        <HowWeWork />
        <Tathya />
        <Faq />
        <FinalCall />
      </main>
      <SiteFooter />
    </div>
  );
}
