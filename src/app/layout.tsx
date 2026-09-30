import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { bricolage } from '@/lib/fonts';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import '@/styles/tokens.css';
import '@/styles/base.css';

export const metadata: Metadata = {
  title: { default: 'Drishti by AdmitLabs', template: '%s | Drishti by AdmitLabs' },
  description: "See where you stand, who's ahead, and what students want. Every month.",
  applicationName: 'Drishti by AdmitLabs',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
    { media: '(prefers-color-scheme: light)', color: '#f2e8d6' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en-IN" data-theme={theme ?? undefined} className={bricolage.variable}>
      <body>{children}</body>
    </html>
  );
}
