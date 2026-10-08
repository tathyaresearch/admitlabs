import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BRAIN_SECTIONS, type BrainSection } from '@/brain/model';
import { QUESTION } from '@/components/brain/Bits';
import { BrainScreen } from '@/components/brain/BrainScreen';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { formatDate } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { askBrain, historyTitle, loadBrainPage, loadFactHistory } from '@/lib/brain/page';
import styles from '@/components/brain/brain.module.css';

export const metadata: Metadata = { title: 'Brain' };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

// The Brain answers "What does our AdmitLabs team know about us?" for an AdmitLabs Client: its
// owner and members read and change it with the team (spec section 26). Not found on Free and Paid.
export default async function BrainRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  if (viewer.tier !== 'client') notFound();
  const institutionId = viewer.membership.institution.id;
  const query = await searchParams;
  const page = await loadBrainPage(institutionId, false);
  if (!page) {
    return (
      <div className={styles.page}>
        <PageHead title="Brain" question={QUESTION} />
        <EmptyState icon="brain" title="Your Brain starts with your AdmitLabs team">
          At the start of your service, your AdmitLabs team sets up your Brain with you: your contacts, programs, brand and everything it needs to work for you. It shows here as soon as it has started.
        </EmptyState>
      </div>
    );
  }
  const asked = one(query.section);
  const section: BrainSection | 'overview' = BRAIN_SECTIONS.includes(asked as BrainSection) ? (asked as BrainSection) : 'overview';
  const canEdit = !viewer.viewingAs;
  const target = one(query.history);
  const question = one(query.ask)?.trim().slice(0, 200) || null;
  const [history, answer] = await Promise.all([
    target ? loadFactHistory(page, target, false) : Promise.resolve(null),
    question ? askBrain(page, question, false) : Promise.resolve(null),
  ]);
  const ready = page.brain.status === 'ready';
  return (
    <BrainScreen
      page={page}
      base="/brain"
      section={section}
      edit={canEdit ? one(query.edit) : null}
      canEdit={canEdit}
      team={false}
      history={target && history ? { target, title: historyTitle(page, target), lines: history } : null}
      asked={answer}
      head={
        <PageHead
          title="Brain"
          question={QUESTION}
          caption={[
            ready && page.brain.ready ? `Ready since ${formatDate(page.brain.ready.at)}` : `Being set up with your AdmitLabs team, ${page.progress.percent}% complete`,
            page.recent[0] ? `Last change ${formatDate(page.recent[0].at)}, by ${page.recent[0].who}` : null,
          ]}
          actions={
            canEdit ? (
              <ButtonLink href="/brain/help" variant={ready ? 'secondary' : 'primary'} iconAfter="arrowRight">
                Help us know you
              </ButtonLink>
            ) : undefined
          }
        />
      }
    />
  );
}
