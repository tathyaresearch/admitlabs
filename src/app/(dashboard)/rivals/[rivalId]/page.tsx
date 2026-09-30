import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuditHeader, SectionHead } from '@/components/audit/AuditHeader';
import { ActivityTabs } from '@/components/rivals/Activity';
import { CompareChecks } from '@/components/rivals/CompareChecks';
import { RivalBand } from '@/components/rivals/RivalBand';
import { RivalCheckPanel } from '@/components/rivals/RivalCheckPanel';
import { Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { formatDate, hostAndPath } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadRivalDetail } from '@/lib/rivals/load';
import { admissionPushText, reviewTrendText } from '@/rivals/text';
import { admissionPush } from '@/rivals/timing';
import { rivalVerdict } from '@/rivals/verdict';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/rivals/rivals.module.css';

export const metadata = { title: 'Rival' };

export default async function RivalPage({ params }: { params: Promise<{ rivalId: string }> }) {
  const viewer = await requireInstitutionViewer();
  // Free sees ahead or behind only, on the Rivals page. The full view of a rival is Paid.
  if (viewer.tier === 'free') redirect('/rivals');
  const { rivalId } = await params;
  const detail = await loadRivalDetail(viewer, rivalId);
  if (!detail) notFound();

  const { rival, audit: theirs, you } = detail;
  const institution = viewer.membership.institution;
  const names = new Map([[rival.id, rival.name]]);
  const push = admissionPush(detail.allMoves, new Date());
  const shared = [...new Set(detail.comparisons.flatMap((item) => item.programs))];

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <Link href="/rivals" className={styles.back}>
          <Icon name="chevronLeft" size={14} />
          Rivals
        </Link>
        <AuditHeader
          title={rival.name}
          caption={[
            `${INSTITUTION_TYPE_LABELS[rival.type]} in ${rival.city}, ${rival.state}`,
            <a key="site" href={rival.website} target="_blank" rel="noreferrer">
              {hostAndPath(rival.website)}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>,
            theirs ? `Checked ${formatDate(theirs.runAt)}` : 'Being checked now',
          ]}
        />
        {theirs ? (
          <RivalBand
            rivalName={rival.name}
            them={theirs.scores}
            change={theirs.changes.overall}
            you={you?.scores ?? null}
            verdict={you ? rivalVerdict(you.scores, theirs.scores) : ''}
            facts={[
              { label: 'Admission push', value: admissionPushText(push?.detectedAt ?? null), sub: push?.description ?? null },
              { label: 'Google reviews', value: reviewTrendText(detail.reviews) },
            ]}
          />
        ) : (
          <Notice icon="info" title={`Drishti is checking ${rival.name} now.`}>
            Their score shows here once the first check is done.
          </Notice>
        )}
      </div>

      {theirs && you ? (
        <section className={audit.section} aria-labelledby="compare-title">
          <SectionHead
            id="compare-title"
            title="Where they lead, where you lead"
            help={`All 17 checks side by side.${shared.length ? ` Program checks compare the programs you both offer: ${shared.join(', ')}.` : ''} Open one to see what was found.`}
          />
          <CompareChecks comparisons={detail.comparisons} institutionType={institution.type} rivalName={rival.name} />
        </section>
      ) : null}

      <section className={audit.section} aria-labelledby="activity-title">
        <SectionHead id="activity-title" title="What they're doing" help="Their moves, best content and ads. Every item links to where it was found." />
        <ActivityTabs
          activity={detail.activity}
          moves={detail.allMoves}
          names={names}
          showRival={false}
          movesNote="Every move Drishti has found on their website, newest first. Checked every Monday."
        />
      </section>

      <Suspense fallback={null}>
        <RivalCheckPanel comparisons={detail.comparisons} rivalName={rival.name} institutionType={institution.type} />
      </Suspense>
    </div>
  );
}
