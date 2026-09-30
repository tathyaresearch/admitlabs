import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/Feedback';
import type { IconName } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/Layout';

/** A section that is part of the product but arrives in a later build phase. */
export function ComingSoon({ title, question, phase, icon, children }: { title: string; question: string; phase: number; icon: IconName; children: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow={title} title={question} />
      <EmptyState icon={icon} title={`${title} arrives in Phase ${phase}`}>
        {children}
      </EmptyState>
    </>
  );
}
