import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExpiredLink, SharedAuditView } from '@/components/share/SharedAudit';
import { loadSharedLink } from '@/lib/share/load';

// A shared Audit opens from a private link with no sign in. It is never listed or indexed.
const PRIVATE = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } as const;

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const link = await loadSharedLink(token);
  const title = link?.status === 'live' ? `${link.institution.name} Audit` : link ? 'Link expired' : 'Page not found';
  return { title, robots: PRIVATE, referrer: 'no-referrer' };
}

export default async function SharedAuditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await loadSharedLink(token);
  if (!link) notFound();
  if (link.status === 'expired') return <ExpiredLink />;
  return <SharedAuditView shared={link} pdfHref={`/share/${token}/pdf`} />;
}
