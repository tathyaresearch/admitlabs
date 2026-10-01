import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { historyByMonth, programView } from '@/audit/view';
import { AuditScreen } from '@/components/audit/AuditScreen';
import { ProgramTabs } from '@/components/audit/Programs';
import { UnlockCard } from '@/components/audit/UnlockCard';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { monthKey } from '@/domain/dates';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { auditNote, loadAuditPage, loadProgramHistory, loadPrograms, nextAuditText, programEntries } from '@/lib/audit/load';
import { loadAddedDetails } from '@/lib/details/load';
import styles from '@/components/audit/audit.module.css';

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
      <PageHead title="Audit" question="How do we look to students?" />
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
        />
      </div>
    );
  }

  const view = programView(data.audit, programId, { institutionType: institution.type, programNames: data.names });
  if (!view) {
    return (
      <div className={styles.page}>
        {top('All programs')}
        <EmptyState icon="audit" title={`${program.name} is in your next Audit`}>
          {`It was added after your latest Audit. ${nextAuditText(data)}.`}
        </EmptyState>
      </div>
    );
  }

  const [history, details] = await Promise.all([loadProgramHistory(programId), loadAddedDetails(institution.id)]);
  return (
    <AuditScreen
      view={view}
      tier={viewer.tier}
      caption={viewer.tier === 'client' ? ['Your AdmitLabs team can refresh it at any time'] : undefined}
      entries={entries}
      allLabel="All programs"
      scoreCaption={`${program.name} score`}
      checkedAt={data.audit.runAt}
      trend={{ points: historyByMonth(history, (runAt) => monthKey(new Date(runAt))) }}
      note={auditNote(data, viewer.tier)}
      history={history}
      historyLabel={`${program.name} score by month`}
      details={details}
      institutionType={institution.type}
    />
  );
}
