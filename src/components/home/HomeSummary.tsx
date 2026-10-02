// Home's summary: the answer to "How are we doing this month?" in one sentence, then the numbers
// behind it. The overall score on its gauge beside the score by month, then the three pillars.
// Each pillar card has the same parts, so the row is even by its content: the score and its band,
// its trend, its checks at a glance and the weakest one. Without score history the space beside
// the gauge shows what Paid adds (Free), or what each result earns (a shared Audit).

import Link from 'next/link';
import { auditVerdict } from '@/audit/verdict';
import { pillarChecks, type AuditView, type PillarChecks, type ScoreSet } from '@/audit/view';
import { HistoryLine } from '@/components/charts/HistoryLine';
import { PillarTrend } from '@/components/charts/PillarTrend';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { Icon } from '@/components/ui/Icon';
import { KpiCard, KpiNumber } from '@/components/ui/Kpi';
import { LockedPanel } from '@/components/ui/LockedPanel';
import { PillarIcon } from '@/components/ui/Marks';
import { Change, Delta, ResultBar, ResultKey, ResultSquares, ScoreLabel } from '@/components/ui/Results';
import { CHECKS } from '@/domain/checks';
import { formatDate } from '@/domain/format';
import { nextBandText, resultShareText } from '@/domain/scores';
import { PILLAR_LABELS, PILLARS, RESULTS, type Pillar } from '@/domain/types';
import { scoreRange } from '@/graphics/range';
import styles from './home.module.css';

/** The scores by month, oldest first ('YYYY-MM' keys), one Audit a month. */
export type MonthScores = ReadonlyArray<{ month: string; scores: ScoreSet }>;

/** A made-up line, only to give the locked preview its shape. Never real data. */
function PlaceholderChart() {
  return (
    <svg viewBox="0 0 320 150" preserveAspectRatio="none" className={styles.placeholderChart} aria-hidden="true" focusable="false">
      {[20, 60, 100, 140].map((y) => (
        <line key={y} x1="0" x2="320" y1={y} y2={y} />
      ))}
      <polyline points="10,110 70,96 130,100 190,70 250,58 310,40" />
    </svg>
  );
}

/** Beside the gauge: the score by month, Free's locked preview of it, or what each result earns. */
function ScoreSide({ trend, side, label }: { trend: MonthScores | null; side: 'locked' | 'explain'; label: string }) {
  if (trend && trend.length) {
    return (
      <figure className={styles.scoreSide}>
        <figcaption className={styles.sideTitle}>{label}</figcaption>
        <HistoryLine points={trend.map((point) => ({ month: point.month, score: point.scores.overall }))} label={label} height={210} fit labelEvery />
      </figure>
    );
  }
  if (side === 'locked') {
    return (
      <div className={styles.scoreSide}>
        <p className={styles.sideTitle}>{label}</p>
        <LockedPanel
          title="See your score month by month"
          description="Paid shows every month's score, with the lines where Needs work and Strong begin."
          placeholder={<PlaceholderChart />}
        />
      </div>
    );
  }
  return (
    <div className={styles.scoreSide}>
      <p className={styles.sideTitle}>What each result earns</p>
      <ul className={styles.earns}>
        {RESULTS.map((result) => (
          <li key={result} className={styles.earn}>
            <ResultBar result={result} />
            <span>{resultShareText(result)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.sideNote}>
        The score is the average of three pillars, from {CHECKS.length} checks. Every check shows what was found.
      </p>
    </div>
  );
}

/** A pillar's checks at a glance, and its weakest check (a link where the page has a check panel). */
function PillarChecksRow({ pillar, checks, checkLinks }: { pillar: Pillar; checks: PillarChecks; checkLinks: string | null }) {
  const weakest = checks.weakest;
  const weakestBody = weakest ? (
    <>
      <span className={styles.weakestName}>{weakest.name}</span>
      <ResultBar result={weakest.result} points={weakest.points} max={weakest.maxPoints} showPoints={false} size="sm" />
    </>
  ) : null;
  return (
    <>
      <div className={styles.pillarChecks}>
        <ResultSquares checks={checks.checks} label={`${PILLAR_LABELS[pillar]} checks`} />
        <p className={styles.strongCount}>{checks.strong ? `${checks.strong} of ${checks.checks.length} checks Strong` : 'No checks Strong yet'}</p>
      </div>
      {weakest ? (
        <p className={styles.weakest}>
          <span className={styles.weakestLabel}>Weakest</span>
          {checkLinks ? (
            <Link href={`${checkLinks}${weakest.key}`} className={styles.weakestCheck}>
              {weakestBody}
              <Icon name="arrowRight" size={16} className={styles.weakestGo} />
            </Link>
          ) : (
            <span className={styles.weakestCheck}>{weakestBody}</span>
          )}
        </p>
      ) : (
        <p className={styles.weakest}>
          <span className={styles.weakestLabel}>Every check is Strong</span>
        </p>
      )}
    </>
  );
}

export function HomeSummary({
  view,
  checkedAt,
  trend = null,
  side = 'explain',
  note,
  auditHref,
  checkLinks = null,
  scoreLabel = 'Overall score',
  showChange = true,
  historyLabel = 'Overall score by month',
  verdict = true,
}: {
  view: AuditView;
  checkedAt: string;
  /** The scores by month (Paid, Client and the team). Null when the viewer has no score history. */
  trend?: MonthScores | null;
  /** Without history: Free's locked preview, or what each result earns (a shared Audit). */
  side?: 'locked' | 'explain';
  /** One quiet line under the score, like "Next free Audit on 10 Dec 2026". */
  note?: string | null;
  /** Where "Open Audit" goes. Left out in the product page's picture of Home. */
  auditHref?: string | null;
  /** The start of a check's address ("/audit?check="), where the page can open a check. */
  checkLinks?: string | null;
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
  const checks = new Map(pillarChecks(view).map((entry) => [entry.pillar, entry]));
  const months = trend && trend.length > 1 ? trend : null;
  // One range for the three pillar trends, so their lines compare.
  const range = months ? scoreRange(months.flatMap((point) => PILLARS.map((pillar) => point.scores[pillar]))) : null;
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
      <div className={styles.overview}>
        <KpiCard label={scoreLabel} aside={`Checked ${formatDate(checkedAt)}`}>
          <div className={styles.scoreBody}>
            <div className={styles.scoreMain}>
              <ScoreGauge score={view.scores.overall} label={scoreLabel} />
              <div className={styles.scoreMeta}>
                <ScoreLabel label={view.label} />
                {view.programsChanged || !showChange ? null : <Delta change={view.firstAudit ? null : view.changes.overall} size="sm" />}
              </div>
              <p className={styles.nextBand}>{nextBandText(view.scores.overall)}</p>
              {note ? <p className={styles.nextBand}>{note}</p> : null}
            </div>
            <ScoreSide trend={trend} side={side} label={historyLabel} />
          </div>
        </KpiCard>
        <div className={styles.pillars}>
          {PILLARS.map((pillar) => {
            const score = view.scores[pillar];
            const change = quiet ? null : view.changes[pillar];
            const pillarChecksOf = checks.get(pillar);
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
                aside={change === null ? undefined : <Change value={change} />}
              >
                <div className={styles.pillarMain}>
                  <div className={styles.pillarNumber}>
                    <KpiNumber value={score} suffix="/100" numericSuffix spoken=" out of 100" />
                    <ScoreLabel score={score} />
                  </div>
                  {months && range ? (
                    <PillarTrend
                      points={months.map((point) => ({ month: point.month, score: point.scores[pillar] }))}
                      range={range}
                      label={`${PILLAR_LABELS[pillar]} by month`}
                    />
                  ) : null}
                </div>
                {pillarChecksOf ? <PillarChecksRow pillar={pillar} checks={pillarChecksOf} checkLinks={checkLinks} /> : null}
              </KpiCard>
            );
          })}
        </div>
        {checks.size ? <ResultKey className={styles.resultKey} /> : null}
      </div>
    </section>
  );
}
