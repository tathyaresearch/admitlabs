import { ComingSoon } from '@/components/shell/ComingSoon';

export const metadata = { title: 'Audit' };

export default function AuditPage() {
  return (
    <ComingSoon title="Audit" question="How do we look to a student searching for us?" phase={2} icon="audit">
      Your score, the three pillars (Discovered, Trusted, Chosen), every check with what was found and where, what&apos;s working, and what to fix
      first.
    </ComingSoon>
  );
}
