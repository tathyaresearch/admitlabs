import { notFound } from 'next/navigation';

// Shared Audit links for prospects arrive with the team tools in Phase 6.
// Until then no token is valid, so every link is a plain "not found".
export default async function SharedAuditPage({ params }: { params: Promise<{ token: string }> }) {
  await params;
  notFound();
}
