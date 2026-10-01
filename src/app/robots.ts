import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { isWebsiteAddress } from '@/lib/hosts';
import { APP_URL, SITE_URL } from '@/lib/urls';

// robots.txt, by the address it is asked for (src/proxy.ts leaves it alone). The website may be
// crawled and names its sitemap. The dashboard's address, previews and a single shared address
// ask search engines to stay out.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? '';
  if (!isWebsiteAddress(host, { site: SITE_URL, app: APP_URL })) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${SITE_URL}/sitemap.xml` };
}
