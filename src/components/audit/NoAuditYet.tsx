import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Layout';
import { formatDate } from '@/domain/format';
import type { Tier } from '@/domain/types';
import styles from './audit.module.css';

/** Before the first Audit: either pick the Free program, or wait for the first run. */
export function NoAuditYet({
  tier,
  isOwner,
  hasFreeProgram,
  nextAudit,
}: {
  tier: Tier;
  isOwner: boolean;
  hasFreeProgram: boolean;
  nextAudit: { on: Date; tier: Tier } | null;
}) {
  const needsProgram = tier === 'free' && !hasFreeProgram;
  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Audit" title="How you look to students" description="What a student or parent sees when they look you up." />
      {needsProgram ? (
        <EmptyState
          icon="audit"
          title="Pick the program your free Audit covers"
          action={
            isOwner ? (
              <ButtonLink href="/onboarding" iconAfter="arrowRight">
                Pick a program
              </ButtonLink>
            ) : undefined
          }
        >
          {isOwner ? 'Your first Audit runs as soon as you pick it.' : 'The owner of this account picks it. Your first Audit runs straight after.'}
        </EmptyState>
      ) : (
        <EmptyState icon="audit" title="Your first Audit is on its way">
          {nextAudit ? `It runs on ${formatDate(nextAudit.on)}. You will see a note here when it is ready.` : 'You will see a note here when it is ready.'}
        </EmptyState>
      )}
    </div>
  );
}
