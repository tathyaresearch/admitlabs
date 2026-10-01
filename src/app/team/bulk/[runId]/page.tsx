import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, formatTime, plural } from '@/domain/format';
import { scoreLabel } from '@/domain/scores';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadBulkRun } from '@/lib/team/load';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Bulk Audit results' : 'Page not found' };
}

export default async function BulkRunPage({ params }: { params: Promise<{ runId: string }> }) {
  await requireTeamViewer();
  const { runId } = await params;
  if (!UUID.test(runId)) notFound();
  const loaded = await loadBulkRun(runId);
  if (!loaded) notFound();
  const { run, rows } = loaded;

  return (
    <div className={audit.page}>
      <PageHead
        back={{ href: '/team/bulk', label: 'Bulk Audit' }}
        title={`Bulk Audit of ${formatDate(run.createdAt)}`}
        question="What each institution scored."
        caption={[`Started ${formatTime(run.createdAt)}`, `By ${run.createdBy}`, plural(run.audited, 'Audit', 'Audits'), ...(run.failed ? [`${run.failed} not run`] : [])]}
        actions={
          <ButtonLink href="/team/bulk" variant="secondary" icon="plus">
            New bulk Audit
          </ButtonLink>
        }
      />
      <div className={styles.results}>
        {rows.map((row) => (
          <div key={row.position} className={styles.resultRow}>
            <span className={styles.rowName}>
              {row.name}
              <span className={styles.rowSub}>
                {row.outcome === 'audited' ? `${row.place}. ${row.reused ? 'Record reused' : 'New prospect'}` : (row.message ?? 'Waiting to run')}
              </span>
            </span>
            <span className={styles.rowScore}>
              {row.overall !== null ? <span className={`${styles.rowScoreNumber} num`}>{row.overall}</span> : null}
              <span>{row.overall !== null ? scoreLabel(row.overall) : 'No Audit'}</span>
            </span>
            <span className={styles.pillarsMini}>
              {row.pillars ? (
                <>
                  <span>
                    Discovered <strong className="num">{row.pillars.discovered}</strong>
                  </span>
                  <span>
                    Trusted <strong className="num">{row.pillars.trusted}</strong>
                  </span>
                  <span>
                    Chosen <strong className="num">{row.pillars.chosen}</strong>
                  </span>
                </>
              ) : null}
            </span>
            <span className={styles.topFix}>{row.topFix ? `Top fix: ${row.topFix}` : ''}</span>
            <span className={styles.resultActions}>
              {row.institutionId ? (
                <ButtonLink href={`/team/institutions/${row.institutionId}`} size="sm" variant="secondary">
                  Open
                </ButtonLink>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
