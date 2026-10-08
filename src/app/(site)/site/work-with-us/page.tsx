import type { Metadata, Viewport } from 'next';
import { WorkWithUs } from '@/components/site/WorkWithUs';
import { ENQUIRY } from '@/site/content';

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
  return <WorkWithUs />;
}
