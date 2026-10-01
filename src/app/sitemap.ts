import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { isWebsiteAddress } from '@/lib/hosts';
import { APP_URL, PRODUCT_URL, SITE_URL } from '@/lib/urls';
import { CTA } from '@/site/content';

// The website's public pages, for search engines, on the website's address only (robots.txt
// names it there). Anywhere else the list is empty: the dashboard has nothing to crawl.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? '';
  if (!isWebsiteAddress(host, { site: SITE_URL, app: APP_URL })) return [];
  const pages = [`${SITE_URL}/`, `${SITE_URL}${CTA.enquiryPath}`];
  // The product page, when it lives on the website's address (it does unless set elsewhere).
  if (PRODUCT_URL.startsWith(`${SITE_URL}/`)) pages.splice(1, 0, PRODUCT_URL);
  return pages.map((url) => ({ url }));
}
