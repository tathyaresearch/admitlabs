import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SectionHead } from '@/components/audit/AuditHeader';
import { HeadToHead } from '@/components/charts/HeadToHead';
import { MonthTable } from '@/components/charts/MonthTable';
import { NextSteps, type NextStep } from '@/components/home/NextSteps';
import { ActivityTabs } from '@/components/rivals/Activity';
import { CompareChecks, sideText } from '@/components/rivals/CompareChecks';
import { lessonSteps } from '@/components/rivals/Lessons';
import { RivalCheckPanel } from '@/components/rivals/RivalCheckPanel';
import { Notice } from '@/components/ui/Feedback';
import { KpiCard, KpiNote, KpiNumber } from '@/components/ui/Kpi';
import { PageHead } from '@/components/ui/Layout';
import { Delta, ScoreLabel } from '@/components/ui/Results';
import { Tabs } from '@/components/ui/Tabs';
import { checkName } from '@/domain/checks';
import { formatDate, hostAndPath } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS, PILLAR_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadActions, loadRivalDetail } from '@/lib/rivals/load';
import { whereTheyLead, whereYouLead } from '@/rivals/compare';
import { admissionPushText, reviewTrendText } from '@/rivals/text';
import { admissionPush } from '@/rivals/timing';
import { rivalVerdict } from '@/rivals/verdict';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/rivals/rivals.module.css';

export const metadata = { title: 'Rival' };

// One rival answers "Where do they lead us?": the answer and the scores side by side, what to
// learn from them, then check by check and what they are doing.
export default async function RivalPage({ params }: { params: Promise<{ rivalId: string }> }) {
  const viewer = await requireInstitutionViewer();
  // Free sees ahead or behind only, on the Rivals page. The full view of a rival is Paid.
  if (viewer.tier === 'free') redirect('/rivals');
  const { rivalId } = await params;
  const institution = viewer.membership.institution;
  const [detail, lessons] = await Promise.all([loadRivalDetail(viewer, rivalId), loadActions(institution.id)]);
  if (!detail) notFound();

  const { rival, audit: theirs, you } = detail;
  const names = new Map([[rival.id, rival.name]]);
  const push = admissionPush(detail.allMoves, new Date());
  const shared = [...new Set(detail.comparisons.flatMap((item) => item.programs))];
  const theyLead = whereTheyLead(detail.comparisons);
  const youLead = whereYouLead(detail.comparisons);

  // What to learn from them: this month's lessons from this rival, or else where they lead you.
  const fromThem = lessonSteps(
    lessons.filter((lesson) => lesson.rivalId === rival.id),
    names,
    institution.type,
  );
  const leadSteps: NextStep[] = theyLead.slice(0, 3).map((item) => ({
    key: item.key,
    kicker: `${PILLAR_LABELS[item.pillar]}${item.programs.length ? `, ${item.programs.join(', ')}` : ''}`,
    title: checkName(item.key, institution.type),
    detail: `${rival.name}: ${sideText(item.them)}. You: ${sideText(item.you)}.`,
    href: `?check=${item.key}`,
  }));

  return (
    <div className={audit.page}>
      <PageHead
        back={{ href: '/rivals', label: 'Rivals' }}
        title={rival.name}
        question={`Where does ${rival.name} lead us?`}
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
        <section className={audit.summary} aria-labelledby="rival-summary-title">
          <h2 id="rival-summary-title" className="visually-hidden">
            {rival.name} against you
          </h2>
          {you ? <p className={audit.lead}>{rivalVerdict(you.scores, theirs.scores)}</p> : null}
          <div className={styles.rivalKpis}>
            <KpiCard label="Their score">
              <KpiNumber value={theirs.scores.overall} suffix="/100" numericSuffix spoken=" out of 100" />
              <div className={styles.kpiMeta}>
                <ScoreLabel score={theirs.scores.overall} />
                {theirs.changes.overall !== null ? <Delta change={theirs.changes.overall} since="last month" size="sm" /> : null}
              </div>
            </KpiCard>
            {you ? (
              <KpiCard label="Your score">
                <KpiNumber value={you.scores.overall} suffix="/100" numericSuffix spoken=" out of 100" />
                <div className={styles.kpiMeta}>
                  <ScoreLabel score={you.scores.overall} />
                  {you.changes.overall !== null ? <Delta change={you.changes.overall} since="last Audit" size="sm" /> : null}
                </div>
              </KpiCard>
            ) : null}
            <KpiCard label="They lead on" className={styles.kpiWide}>
              <KpiNumber value={theyLead.length} suffix={theyLead.length === 1 ? 'check' : 'checks'} />
              <KpiNote>You lead on {youLead.length}. Level on the rest.</KpiNote>
            </KpiCard>
            <KpiCard label="Admissions open" className={styles.kpiWide}>
              <p className={styles.kpiText}>{admissionPushText(push?.detectedAt ?? null)}</p>
              {push?.description ? <KpiNote>{push.description}</KpiNote> : null}
            </KpiCard>
          </div>
          {you ? (
            <div className={styles.pillarCard}>
              <div className={styles.pillarCardHead}>
                <p className={styles.standLabel}>How you compare</p>
                <p className={styles.factQuiet}>Google reviews: {reviewTrendText(detail.reviews)}</p>
              </div>
              <Tabs
                label="How you compare"
                items={[
                  {
                    id: 'pillars',
                    label: 'Part by part',
                    content: (
                      <HeadToHead
                        rivalName={rival.name}
                        youName="You"
                        rows={[
                          { label: 'Overall', you: you.scores.overall, rival: theirs.scores.overall },
                          { label: PILLAR_LABELS.discovered, you: you.scores.discovered, rival: theirs.scores.discovered },
                          { label: PILLAR_LABELS.trusted, you: you.scores.trusted, rival: theirs.scores.trusted },
                          { label: PILLAR_LABELS.chosen, you: you.scores.chosen, rival: theirs.scores.chosen },
                        ]}
                      />
                    ),
                  },
                  {
                    id: 'months',
                    label: 'Month by month',
                    content: <MonthTable trend={detail.trend} label={`Overall score by month, you and ${rival.name}`} />,
                  },
                ]}
              />
            </div>
          ) : null}
        </section>
      ) : (
        <Notice icon="info" title={`Drishti is checking ${rival.name} now.`}>
          Their score shows here once the first check is done.
        </Notice>
      )}

      {theirs && you ? (
        <NextSteps
          id="learn"
          icon="rivals"
          title={`What to learn from ${rival.name}`}
          description={fromThem.length ? 'Learned from them this month. Take the idea, never copy.' : 'Where they lead you, biggest first. Open one to see what was found for each of you.'}
          steps={fromThem.length ? fromThem : leadSteps}
          empty={<p className={audit.quietNote}>They do not lead you on any check right now.</p>}
        />
      ) : null}

      {theirs && you ? (
        <section className={audit.section} aria-labelledby="compare-title">
          <SectionHead
            id="compare-title"
            title="Check by check"
            help={`${shared.length ? `Program checks compare the programs you both offer: ${shared.join(', ')}. ` : ''}Open one to see what was found for each of you.`}
          />
          <Tabs
            label="Check by check"
            items={[
              { id: 'they', label: 'Where they lead', count: theyLead.length, content: <CompareChecks comparisons={theyLead} institutionType={institution.type} rivalName={rival.name} /> },
              { id: 'you', label: 'Where you lead', count: youLead.length, content: <CompareChecks comparisons={youLead} institutionType={institution.type} rivalName={rival.name} /> },
              { id: 'all', label: 'All checks', count: detail.comparisons.length, content: <CompareChecks comparisons={detail.comparisons} institutionType={institution.type} rivalName={rival.name} /> },
            ]}
          />
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
