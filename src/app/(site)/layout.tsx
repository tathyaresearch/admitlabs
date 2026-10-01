import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/urls';

// The website's pages (admitlabs.in). They live at /site inside the app; src/proxy.ts serves them
// at the website's address. Their links and preview images resolve to that address.
export const metadata: Metadata = {
  metadataBase: new URL(new URL(SITE_URL).origin),
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return children;
}
