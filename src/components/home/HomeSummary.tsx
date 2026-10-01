// Home's summary: the answer to "How are we doing this month?" in one sentence, then the numbers
// behind it. The overall score as a half-circle gauge, with how far the next band is and its trend
// where the plan includes history, and the three pillars, each in the same number card.

import Link from 'next/link';
import { auditVerdict } from '@/audit/verdict';
import type { AuditView } from '@/audit/view';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { Sparkline } from '@/components/charts/Sparkline';
import { Icon } from '@/components/ui/Icon';
import { KpiBar, KpiCard, KpiNote, KpiNumber } from '@/components/ui/Kpi';
import { PillarIcon } from '@/components/ui/Marks';
import { Change, Delta, ScoreLabel } from '@/components/ui/Results';
import { formatDate, formatMonthShort } from '@/domain/format';
import { nextBandText } from '@/domain/scores';
import { PILLAR_LABELS, PILLARS } from '@/domain/types';
import styles from './home.module.css';

export interface ScoreTrend {
  /** The overall score, one per month, oldest first ('YYYY-MM' keys). */
  points: ReadonlyArray<{ month: string; score: number }>;
}

export function HomeSummary({
  view,
  checkedAt,
  trend,
  note,
  auditHref,
  scoreLabel = 'Overall score',
  showChange = true,
  historyLabel = 'Overall score by month',
  verdict = true,
}: {
  view: AuditView;
  checkedAt: string;
  /** Paid and Client only: Free has no score history. Hidden with fewer than 2 months. */
  trend?: ScoreTrend | null;
  /** One quiet line under the score, like "Next free Audit on 10 Dec 2026". */
  note?: string | null;
  /** Where "Open Audit" goes. Left out in the product page's picture of Home. */
  auditHref?: string | null;
  /** "MBA score" on a program's Audit. */
  scoreLabel?: string;
  /** Off for an Audit seen on its own (a shared Audit): no change since the last one. */
  showChange?: boolean;
  historyLabel?: string;
  /** Off where the sentence, written to the institution, would be read by someone else (the team). */
  verdict?: boolean;
}) {
  // Same rules as the Audit page: no change on a first Audit, or when the programs changed.
  const quiet = view.firstAudit || view.programsChanged || !showChange;
  const points = trend?.points ?? [];
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <section className={styles.summary} aria-labelledby="summary-title">
      <h2 id="summary-title" className="visually-hidden">
        This month at a glance
      </h2>
      {verdict || auditHref ? (
        <div className={styles.answer}>
          {verdict ? <p className={styles.verdict}>{auditVerdict(view.scores)}</p> : null}
          {auditHref ? (
            <Link href={auditHref} className={styles.headLink}>
              Open Audit
              <Icon name="arrowRight" size={16} />
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className={styles.kpis}>
        <KpiCard className={styles.scoreCard} label={scoreLabel} aside={`Checked ${formatDate(checkedAt)}`}>
          <div className={styles.scoreRow}>
            <div className={styles.scoreMain}>
              <ScoreGauge score={view.scores.overall} label={scoreLabel} />
              <div className={styles.scoreMeta}>
                <ScoreLabel label={view.label} />
                {view.programsChanged || !showChange ? null : <Delta change={view.firstAudit ? null : view.changes.overall} size="sm" />}
              </div>
              <p className={styles.nextBand}>{nextBandText(view.scores.overall)}</p>
            </div>
            {first && last && points.length > 1 ? (
              <figure className={styles.trend}>
                <Sparkline values={points.map((point) => point.score)} label={historyLabel} width={160} height={56} />
                <figcaption className={styles.trendMonths} aria-hidden="true">
                  <span>{formatMonthShort(first.month)}</span>
                  <span>{formatMonthShort(last.month)}</span>
                </figcaption>
              </figure>
            ) : null}
          </div>
          {note ? <KpiNote>{note}</KpiNote> : null}
        </KpiCard>
        {PILLARS.map((pillar) => {
          const score = view.scores[pillar];
          const change = quiet ? null : view.changes[pillar];
          return (
            <KpiCard
              key={pillar}
              className={styles.pillarCard}
              label={
                <span className={styles.pillarLabel}>
                  <PillarIcon pillar={pillar} size={14} />
                  {PILLAR_LABELS[pillar]}
                </span>
              }
            >
              <KpiNumber value={score} spoken=" out of 100" />
              <div className={styles.pillarFoot}>
                <KpiBar value={score} />
                <KpiNote>{change === null ? 'Out of 100' : <Change value={change} />}</KpiNote>
              </div>
            </KpiCard>
          );
        })}
      </div>
    </section>
  );
}
