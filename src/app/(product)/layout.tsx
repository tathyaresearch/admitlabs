import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PRODUCT_URL } from '@/lib/urls';

// The product page's own address, so its link preview image resolves to it (admitlabs.in/drishti
// once deployed), even if the dashboard lives elsewhere.
export const metadata: Metadata = {
  // The origin only: Next adds the route path (/drishti/...) itself.
  metadataBase: new URL(new URL(PRODUCT_URL).origin),
};

export default function ProductLayout({ children }: { children: ReactNode }) {
  return children;
}
