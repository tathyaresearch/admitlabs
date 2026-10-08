import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHead } from '@/components/audit/AuditHeader';
import { BulkAudit } from '@/components/team/BulkAudit';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { TEAM_RULES } from '@/config/team';
import { formatDateTime, plural } from '@/domain/format';
import { AuditTabs } from '@/components/team/AuditTabs';
import { requireFullTeam } from '@/lib/auth/guards';
import { isFullTeam } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { loadBulkRuns } from '@/lib/team/load';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: isFullTeam(viewer?.teamRole) ? 'Bulk Audit' : 'Page not found' };
}

export default async function BulkAuditPage() {
  await requireFullTeam();
  const runs = await loadBulkRuns();
  return (
    <div className={audit.page}>
      <PageHead
        title="Audit"
        question={`Audit up to ${TEAM_RULES.bulkMaxRows} institutions at once.`}
        caption={['Each is added as a prospect', 'Team Audits stay private until shared']}
      />
      <AuditTabs current="bulk" />
      <BulkAudit maxRows={TEAM_RULES.bulkMaxRows} />
      <section className={audit.section} aria-labelledby="runs-title">
        <SectionHead id="runs-title" title="Earlier runs" help="The last 10, newest first." />
        {runs.length ? (
          <div className={styles.list}>
            {runs.map((run) => (
              <Link key={run.id} href={`/team/bulk/${run.id}`} className={`${styles.listRow} ${styles.runRow}`}>
                <span className={styles.rowName}>
                  {formatDateTime(run.createdAt)}
                  <span className={styles.rowSub}>By {run.createdBy}</span>
                </span>
                <span className={styles.rowScore}>
                  {plural(run.audited, 'Audit', 'Audits')}
                  {run.failed ? `, ${run.failed} not run` : ''}
                </span>
                <Icon name="chevronRight" size={16} className={styles.chevron} />
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No bulk runs yet.</p>
        )}
      </section>
    </div>
  );
}
