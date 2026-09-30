import { overviewView } from '@/audit/view';
import { AuditScreen } from '@/components/audit/AuditScreen';
import { NoAuditYet } from '@/components/audit/NoAuditYet';
import { RefreshButton } from '@/components/audit/RefreshButton';
import { Tag } from '@/components/ui/Data';
import { Notice } from '@/components/ui/Feedback';
import { canSee } from '@/config/entitlements';
import { formatDate, formatDateLong, plural } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, nextAuditText, programEntries } from '@/lib/audit/load';

export const metadata = { title: 'Audit' };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const [data, params] = await Promise.all([loadAuditPage(viewer), searchParams]);

  if (!data.audit) {
    return <NoAuditYet tier={viewer.tier} isOwner={role === 'owner'} hasFreeProgram={Boolean(viewer.plan?.freeProgramId)} nextAudit={data.nextAudit} />;
  }

  const view = overviewView(data.audit, { institutionType: institution.type, programNames: data.names });
  const entries = programEntries(data, viewer.tier, viewer.plan?.freeProgramId ?? null);
  const scored = entries.filter((entry) => entry.state === 'scored').length;
  const free = viewer.tier === 'free';

  return (
    <AuditScreen
      view={view}
      tier={viewer.tier}
      eyebrow="Audit"
      title="How you look to students"
      description={`What a student or parent sees when they look you up. Checked on ${formatDateLong(data.audit.runAt)}.`}
      actions={data.refresh ? <RefreshButton left={data.refresh.left} resetsOn={formatDate(data.refresh.resetsOn)} /> : undefined}
      meta={
        <>
          <Tag>{nextAuditText(data)}</Tag>
          {viewer.tier === 'paid' && viewer.plan?.endsAt ? <Tag variant="quiet">Paid until {formatDate(viewer.plan.endsAt)}</Tag> : null}
          {viewer.tier === 'client' ? <Tag variant="quiet">Your AdmitLabs team can refresh it at any time</Tag> : null}
          <Tag variant="quiet">{free ? 'Your free Audit covers 1 program' : plural(scored, 'program', 'programs')}</Tag>
        </>
      }
      notice={
        params.welcome === '1' ? (
          <Notice tone="inverse" icon="spark" title="Your first Audit is ready.">
            Here is where you stand. Start with what&apos;s working, then the first fix on the list.
          </Notice>
        ) : undefined
      }
      entries={entries}
      allLabel={free ? null : 'All programs'}
      showProgramList={entries.length > 1}
      nextAuditText={nextAuditText(data)}
      history={canSee('audit_score_history', viewer.tier) ? data.history : null}
      historyLabel="Overall score by month"
    />
  );
}
