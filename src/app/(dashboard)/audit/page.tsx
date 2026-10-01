import { historyByMonth, overviewView } from '@/audit/view';
import { AuditScreen } from '@/components/audit/AuditScreen';
import { NoAuditYet } from '@/components/audit/NoAuditYet';
import { RefreshButton } from '@/components/audit/RefreshButton';
import { Notice } from '@/components/ui/Feedback';
import { canSee } from '@/config/entitlements';
import { monthKey } from '@/domain/dates';
import { formatDate } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { auditNote, loadAuditPage, programEntries } from '@/lib/audit/load';

export const metadata = { title: 'Audit' };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const [data, params] = await Promise.all([loadAuditPage(viewer), searchParams]);

  if (!data.audit) {
    return <NoAuditYet tier={viewer.tier} isOwner={role === 'owner'} hasFreeProgram={Boolean(viewer.plan?.freeProgramId)} nextAudit={data.nextAudit} />;
  }

  const view = overviewView(data.audit, { institutionType: institution.type, programNames: data.names });
  const free = viewer.tier === 'free';
  const history = canSee('audit_score_history', viewer.tier) ? data.history : null;

  return (
    <AuditScreen
      view={view}
      tier={viewer.tier}
      caption={viewer.tier === 'client' ? ['Your AdmitLabs team can refresh it at any time'] : undefined}
      actions={data.refresh ? <RefreshButton left={data.refresh.left} resetsOn={formatDate(data.refresh.resetsOn)} /> : undefined}
      notice={
        params.welcome === '1' ? (
          <Notice tone="inverse" icon="spark" title="Your first Audit is ready.">
            Here is where you stand. Start with the first fix below.
          </Notice>
        ) : undefined
      }
      entries={programEntries(data, viewer.tier, viewer.plan?.freeProgramId ?? null)}
      allLabel={free ? null : 'All programs'}
      scoreCaption="Overall score"
      checkedAt={data.audit.runAt}
      trend={history ? { points: historyByMonth(history, (runAt) => monthKey(new Date(runAt))) } : null}
      note={auditNote(data, viewer.tier)}
      history={history}
      historyLabel="Overall score by month"
    />
  );
}
