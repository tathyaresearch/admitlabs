import type { Metadata, Viewport } from 'next';
import { ProductFooter, ProductHeader } from '@/components/product/Chrome';
import { Faq, ForClients, Plans } from '@/components/product/Offer';
import { ReportShowcase } from '@/components/product/ReportShowcase';
import { Features, FinalCall, Hero, Problem, Steps } from '@/components/product/Sections';
import { PRODUCT_URL } from '@/lib/urls';
import { FOOTER } from '@/product/content';
import { loadShowcase } from '@/product/showcase';
import styles from '@/components/product/product.module.css';

// The product page (spec section 15). Prerendered once at build: it reads no request data, and
// its previews come from the sample world in memory, never the database. It sets its own black
// and ivory sections, so it looks the same whatever the device setting.
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
    <div id="top" className={styles.page} data-theme="dark">
      {/* The page behind the page (overscroll, the top of a long scroll) stays black too. */}
      <style href="drishti-product-page" precedence="default">
        {'html,body{background:#0a0a0c}html{scroll-behavior:smooth}'}
      </style>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ProductHeader />
      <main id="main">
        <Hero showcase={showcase} />
        <Problem />
        <Features showcase={showcase} />
        <Steps />
        <ReportShowcase data={showcase.report} />
        <Plans />
        <ForClients />
        <Faq />
        <FinalCall />
      </main>
      <ProductFooter />
    </div>
  );
}
