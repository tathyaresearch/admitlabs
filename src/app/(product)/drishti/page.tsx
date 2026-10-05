import type { Metadata, Viewport } from 'next';
import { Faq, ForClients, Plans } from '@/components/product/Offer';
import { ReportShowcase } from '@/components/product/ReportShowcase';
import { Features, FinalCall, Hero, Problem, Reads, Steps, Trust } from '@/components/product/Sections';
import { SiteFooter } from '@/components/site/Footer';
import { SiteHeader } from '@/components/site/Header';
import { PRODUCT_URL } from '@/lib/urls';
import { FOOTER } from '@/product/content';
import { loadShowcase } from '@/product/showcase';
import product from '@/components/product/product.module.css';
import site from '@/components/site/site.module.css';

// The product page (spec section 15), part of the AdmitLabs website: the website's header, footer
// and Spotlight style, with the product itself for pictures. Prerendered once at build: it reads
// no request data, and its pictures come from the sample world in memory, never the database. It
// sets its own black and ivory sections, so it looks the same whatever the device setting.
export const dynamic = 'force-static';

const NAME = 'Drishti by AdmitLabs';

export const metadata: Metadata = {
  title: { absolute: NAME },
  description: FOOTER.tagline,
  alternates: { canonical: PRODUCT_URL },
  openGraph: { type: 'website', url: PRODUCT_URL, siteName: NAME, title: NAME, description: FOOTER.tagline, locale: 'en_IN' },
  twitter: { card: 'summary_large_image', title: NAME, description: FOOTER.tagline },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  colorScheme: 'dark',
};

export default async function ProductPage() {
  const showcase = await loadShowcase();
  return (
    <div id="top" className={`${site.page} ${product.page}`} data-theme="dark">
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
        <Problem showcase={showcase} />
        <Features showcase={showcase} />
        <Reads showcase={showcase} />
        <Trust />
        <Steps />
        <ReportShowcase data={showcase.report} />
        <Plans />
        <ForClients />
        <Faq />
        <FinalCall />
      </main>
      <SiteFooter />
    </div>
  );
}
