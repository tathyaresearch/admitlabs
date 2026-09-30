import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { programView } from '@/audit/view';
import { AuditScreen } from '@/components/audit/AuditScreen';
import { PlaceholderList } from '@/components/audit/Placeholders';
import { ProgramTabs } from '@/components/audit/Programs';
import { Tag } from '@/components/ui/Data';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Layout';
import { LockedPanel } from '@/components/ui/LockedPanel';
import { formatDateLong } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, loadProgramHistory, loadPrograms, nextAuditText, programEntries } from '@/lib/audit/load';
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
  const header = <PageHeader eyebrow="Audit" title={program.name} description={`${institution.name}. One program, with its own checks and the ones it shares.`} />;

  // Free covers one program: that program is the Audit itself. Others are included with Paid.
  if (viewer.tier === 'free') {
    if (data.audit.programs.some((entry) => entry.programId === programId)) redirect('/audit');
    if (programId === viewer.plan?.freeProgramId) {
      return (
        <div className={styles.page}>
          {header}
          <EmptyState icon="audit" title={`${program.name} is in your next free Audit`}>
            {`You chose it after your latest Audit. ${nextAuditText(data)}.`}
          </EmptyState>
        </div>
      );
    }
    return (
      <div className={styles.page}>
        {header}
        <div className={styles.top}>
          <ProgramTabs entries={entries} active={programId} allLabel={null} />
        </div>
        <LockedPanel
          title={`See how ${program.name} looks to students`}
          description="Paid audits every program you offer, each with its own score, strengths and fixes."
          placeholder={<PlaceholderList rows={4} />}
        />
      </div>
    );
  }

  const view = programView(data.audit, programId, { institutionType: institution.type, programNames: data.names });
  if (!view) {
    return (
      <div className={styles.page}>
        {header}
        <EmptyState icon="audit" title={`${program.name} is in your next Audit`}>
          {`It was added after your latest Audit. ${nextAuditText(data)}.`}
        </EmptyState>
      </div>
    );
  }

  return (
    <AuditScreen
      view={view}
      tier={viewer.tier}
      eyebrow="Audit"
      title={program.name}
      description={`How ${program.name} looks to a student searching for it. Checked on ${formatDateLong(data.audit.runAt)}.`}
      meta={<Tag>{nextAuditText(data)}</Tag>}
      entries={entries}
      allLabel="All programs"
      showProgramList={false}
      nextAuditText={nextAuditText(data)}
      history={await loadProgramHistory(programId)}
      historyLabel={`${program.name} score by month`}
    />
  );
}
