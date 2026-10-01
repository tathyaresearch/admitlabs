import type { Metadata, Viewport } from 'next';
import { SiteHeader } from '@/components/site/Header';
import { Hero } from '@/components/site/Hero';
import { System } from '@/components/site/System';
import { loadShowcase } from '@/product/showcase';
import styles from '@/components/site/site.module.css';

// The AdmitLabs website's home page, served at admitlabs.in (src/lib/hosts.ts). Prerendered once
// at build, like the product page: no request data, and its Drishti pictures come from the sample
// world in memory. It sets its own black and ivory sections, whatever the device setting.
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

export default async function SitePage() {
  const showcase = await loadShowcase();
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
        <Hero showcase={showcase} />
        <System />
      </main>
    </div>
  );
}
