import { FixPanelHandlers } from '@/components/audit/handlers';
import { NoAuditYet } from '@/components/audit/NoAuditYet';
import { PlacesAudit } from '@/components/audit/PlacesAudit';
import { RefreshButton } from '@/components/audit/RefreshButton';
import { FirstAuditWaiting, WaitingNotice } from '@/components/audit/Waiting';
import { PaidAction } from '@/components/plan/PaidAction';
import { PageHead } from '@/components/ui/Layout';
import { canSee } from '@/config/entitlements';
import { formatDate, plural } from '@/domain/format';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, nextAuditText, programEntries } from '@/lib/audit/load';
import { loadPlacesPage } from '@/lib/audit/places';
import { loadProgress } from '@/lib/audit/progress';
import { loadRivalList } from '@/lib/rivals/load';
import styles from '@/components/audit/places.module.css';

export const metadata = { title: 'Audit' };

export default async function AuditPage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const data = await loadAuditPage(viewer);

  if (!data.audit) {
    if (data.waiting) {
      const rivals = await loadRivalList(institution.id);
      return (
        <div className={styles.page}>
          <PageHead title="Audit" question="What does the internet say about us?" />
          <FirstAuditWaiting ranAt={data.waiting.runAt} isOwner={role === 'owner' && !viewer.viewingAs} hasRivals={rivals.length > 0} city={institution.city} />
        </div>
      );
    }
    return <NoAuditYet tier={viewer.tier} isOwner={role === 'owner'} hasFreeProgram={Boolean(viewer.plan?.freeProgramId)} nextAudit={data.nextAudit} />;
  }

  const free = viewer.tier === 'free';
  const history = canSee('audit_score_history', viewer.tier) ? data.history : null;
  const [page, months] = await Promise.all([
    loadPlacesPage(viewer, data, null),
    history ? loadProgress({ history, names: data.names, type: institution.type, institutionId: institution.id }) : Promise.resolve(null),
  ]);
  if (!page) return null;

  const covered = data.audit.programs.map((program) => data.names.get(program.programId) ?? 'Program');
  return (
    <PlacesAudit
      view={page.view}
      tier={viewer.tier}
      caption={[
        `Checked ${formatDate(data.audit.runAt)}`,
        free ? `Free covers ${covered[0] ?? 'one program'}` : plural(covered.length, 'program', 'programs'),
        ...(data.nextAudit && data.nextAudit.tier === viewer.tier ? [nextAuditText(data)] : []),
        ...(viewer.tier === 'client' ? ['Your AdmitLabs team can refresh it at any time'] : []),
      ]}
      actions={data.refresh ? <RefreshButton left={data.refresh.left} resetsOn={formatDate(data.refresh.resetsOn)} /> : undefined}
      notice={data.waiting ? <WaitingNotice shownRunAt={data.audit.runAt} /> : undefined}
      entries={programEntries(data, viewer.tier, viewer.plan?.freeProgramId ?? null)}
      allLabel={free ? null : 'All programs'}
      programId={null}
      state={page.state}
      handlers={FixPanelHandlers}
      added={page.added}
      progress={history && months ? { months, history, scoreLabel: 'Score', label: 'Your score month by month' } : null}
      paidAction={free ? <PaidAction viewer={viewer} /> : null}
    />
  );
}
