import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { FixPanelHandlers } from '@/components/audit/handlers';
import { PlacesAudit } from '@/components/audit/PlacesAudit';
import { ProgramTabs } from '@/components/audit/Programs';
import { UnlockCard } from '@/components/audit/UnlockCard';
import { WaitingNotice } from '@/components/audit/Waiting';
import { PaidAction } from '@/components/plan/PaidAction';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { formatDate } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, loadProgramHistory, loadPrograms, nextAuditText, programEntries } from '@/lib/audit/load';
import { loadPlacesPage } from '@/lib/audit/places';
import { loadProgress } from '@/lib/audit/progress';
import styles from '@/components/audit/places.module.css';

interface Props {
  params: Promise<{ programId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ programId }, viewer] = await Promise.all([params, requireInstitutionViewer()]);
  const program = (await loadPrograms(viewer.membership.institution.id)).find((candidate) => candidate.id === programId);
  return { title: program ? `${program.name} Audit` : 'Audit' };
}

export default async function ProgramAuditPage({ params }: Props) {
  const [{ programId }, viewer] = await Promise.all([params, requireInstitutionViewer()]);
  const { institution } = viewer.membership;
  const data = await loadAuditPage(viewer);
  const program = data.programs.find((candidate) => candidate.id === programId);
  if (!program) notFound();
  if (!data.audit) redirect('/audit');

  const entries = programEntries(data, viewer.tier, viewer.plan?.freeProgramId ?? null);
  const top = (allLabel: string | null) => (
    <div className={styles.top}>
      <PageHead title="Audit" question="What does the internet say about us?" />
      <ProgramTabs entries={entries} active={programId} allLabel={allLabel} />
    </div>
  );

  // Free covers one program: that program is the Audit itself. Others come with Paid.
  if (viewer.tier === 'free') {
    if (data.audit.programs.some((entry) => entry.programId === programId)) redirect('/audit');
    if (programId === viewer.plan?.freeProgramId) {
      return (
        <div className={styles.page}>
          {top(null)}
          <EmptyState icon="audit" title={`${program.name} is in your next free Audit`}>
            {`You chose it after your latest Audit. ${nextAuditText(data)}.`}
          </EmptyState>
        </div>
      );
    }
    const scored = data.audit.programs.length;
    return (
      <div className={styles.page}>
        {top(null)}
        <UnlockCard
          moreFixes={0}
          moreStrengths={0}
          lockedPrograms={entries.filter((entry) => entry.state === 'locked').length || Math.max(0, data.programs.length - scored)}
          action={<PaidAction viewer={viewer} />}
        />
      </div>
    );
  }

  if (!data.audit.programs.some((entry) => entry.programId === programId)) {
    return (
      <div className={styles.page}>
        {top('All programs')}
        <EmptyState icon="audit" title={`${program.name} is in your next Audit`}>
          {`It was added after your latest Audit. ${nextAuditText(data)}.`}
        </EmptyState>
      </div>
    );
  }

  const [page, history] = await Promise.all([loadPlacesPage(viewer, data, programId), loadProgramHistory(programId)]);
  if (!page) return null;
  const months = await loadProgress({ history, names: data.names, type: institution.type, programId });
  return (
    <PlacesAudit
      view={page.view}
      tier={viewer.tier}
      caption={[`Checked ${formatDate(data.audit.runAt)}`, program.name, ...(data.nextAudit && data.nextAudit.tier === viewer.tier ? [nextAuditText(data)] : [])]}
      notice={data.waiting ? <WaitingNotice shownRunAt={data.audit.runAt} /> : undefined}
      entries={entries}
      allLabel="All programs"
      programId={programId}
      state={page.state}
      handlers={FixPanelHandlers}
      added={page.added}
      progress={{ months, history, scoreLabel: `${program.name} score`, label: `${program.name} score month by month` }}
    />
  );
}
