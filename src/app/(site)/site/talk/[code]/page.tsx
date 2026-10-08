import type { Metadata, Viewport } from 'next';
import { WorkWithUs } from '@/components/site/WorkWithUs';
import { ENQUIRY } from '@/site/content';

// A team tracking link (spec section 27): admitlabs.in/talk/<code> opens the Talk to us form, and
// what it sends is tagged with the link's source (Instagram, Event, ...). The database checks the
// link when the form is sent: an archived or unknown code still sends, untagged, so nobody is lost.
// Never indexed: the page is Work with us.

const TITLE = 'Work with us | AdmitLabs';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: ENQUIRY.lede,
  applicationName: 'AdmitLabs',
  alternates: { canonical: '/work-with-us' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  colorScheme: 'dark',
};

export default async function TalkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <WorkWithUs link={/^[a-z0-9]{6,16}$/.test(code) ? code : undefined} />;
}
