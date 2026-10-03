// Home's summary: the answer to "How are we doing this month?" in one sentence, then the numbers
// behind it. The overall score on its gauge beside the score by month, then the three parts. Each
// part card has the same pieces, so the row is even by its content: its name and the question it
// answers, its score and band, how it moved since the first month in words, and its checks, every
// one named (rule 11): as rows, weakest first, where there's room (the Audit, a program, the
// team's pages, a shared Audit), or as one bar split by result with the counts written out and the
// check to fix first where it's tight (`checks="split"`: Home, and the product's pictures of it).
// Without score history the space beside the gauge shows what Paid adds (Free), or what each
// result earns (a shared Audit); after a first Audit, that the next one shows the change.

import Link from 'next/link';
import { auditVerdict } from '@/audit/verdict';
import { pillarChecks, type AuditView, type PillarChecks, type ScoreSet } from '@/audit/view';
import { HistoryLine } from '@/components/charts/HistoryLine';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { CheckRows, FixFirst, SplitBar } from '@/components/ui/CheckSummary';
import { Icon } from '@/components/ui/Icon';
import { KpiCard, KpiNumber } from '@/components/ui/Kpi';
import { LockedPanel } from '@/components/ui/LockedPanel';
import { PillarIcon } from '@/components/ui/Marks';
import { Change, Delta, ResultBar, ScoreLabel } from '@/components/ui/Results';
import { ScoreHelp } from '@/components/ui/ScoreHelp';
import { CHECKS } from '@/domain/checks';
import { formatDate, formatMonthName } from '@/domain/format';
import { nextBandText, resultShareText } from '@/domain/scores';
import { PILLAR_LABELS, PILLAR_QUESTIONS, PILLARS, RESULTS, type Pillar } from '@/domain/types';
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

/** Beside the gauge: the score by month, a first Audit's note, Free's locked preview, or what each result earns. */
function ScoreSide({ trend, side, label, checkedAt }: { trend: MonthScores | null; side: 'locked' | 'explain'; label: string; checkedAt: string }) {
  if (trend && trend.length > 1) {
    return (
      <figure className={styles.scoreSide}>
        <figcaption className={styles.sideTitle}>{label}</figcaption>
        <HistoryLine points={trend.map((point) => ({ month: point.month, score: point.scores.overall }))} label={label} height={210} fit labelEvery />
      </figure>
    );
  }
  if (trend && trend.length === 1) {
    // One Audit is one point: no chart, the words instead (rule 11).
    return (
      <div className={styles.scoreSide}>
        <p className={styles.sideTitle}>{label}</p>
        <p className={styles.sideFirst}>First Audit, {formatDate(checkedAt)}. The next one shows how the score moves, month by month.</p>
      </div>
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
        The score is the average of three parts, from {CHECKS.length} checks. Every check shows what was found.
      </p>
    </div>
  );
}

/** "Up 17 since April": how a part moved since the first month on the chart, in words. */
function SinceFirst({ months, pillar, score }: { months: MonthScores; pillar: Pillar; score: number }) {
  const first = months[0];
  if (!first) return null;
  const change = Math.round(score - first.scores[pillar]);
  const month = formatMonthName(first.month);
  return (
    <p className={styles.pillarSince}>
      {change === 0 ? (
        <>The same as in {month}</>
      ) : (
        <>
          {change > 0 ? 'Up' : 'Down'} <span className="num">{Math.abs(change)}</span> since {month}
        </>
      )}
    </p>
  );
}

/** A part's checks: every one as a row where there's room, the split bar and what to fix first where it's tight. */
function PartChecks({ pillar, part, mode, checkLinks }: { pillar: Pillar; part: PillarChecks; mode: 'rows' | 'split'; checkLinks: string | null }) {
  if (mode === 'rows') return <CheckRows checks={part.weakestFirst} checkLinks={checkLinks} />;
  return (
    <div className={styles.pillarSplit}>
      <SplitBar checks={part.checks} label={`${PILLAR_LABELS[pillar]} checks`} />
      <FixFirst check={part.weakest} checkLinks={checkLinks} />
    </div>
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
  checks = 'rows',
  scoreLabel = 'Overall score',
  showChange = true,
  historyLabel = 'Overall score by month',
  verdict = true,
  help = false,
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
  /** How each part shows its checks: every one as a row, or the split bar and what to fix first. */
  checks?: 'rows' | 'split';
  /** "MBA score" on a program's Audit. */
  scoreLabel?: string;
  /** Off for an Audit seen on its own (a shared Audit): no change since the last one. */
  showChange?: boolean;
  historyLabel?: string;
  /** Off where the sentence, written to the institution, would be read by someone else (the team). */
  verdict?: boolean;
  /** "What do these mean?" under the parts (the Audit). */
  help?: boolean;
}) {
  // Same rules as the Audit page: no change on a first Audit, or when the programs changed.
  const quiet = view.firstAudit || view.programsChanged || !showChange;
  const parts = new Map(pillarChecks(view).map((entry) => [entry.pillar, entry]));
  const months = trend && trend.length > 1 ? trend : null;
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
            <ScoreSide trend={trend} side={side} label={historyLabel} checkedAt={checkedAt} />
          </div>
        </KpiCard>
        <div className={styles.pillars}>
          {PILLARS.map((pillar) => {
            const score = view.scores[pillar];
            const change = quiet ? null : view.changes[pillar];
            const part = parts.get(pillar);
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
                <p className={styles.pillarQuestion}>{PILLAR_QUESTIONS[pillar]}</p>
                <div className={styles.pillarNumber}>
                  <KpiNumber value={score} suffix="/100" numericSuffix spoken=" out of 100" />
                  <ScoreLabel score={score} />
                  {months ? <SinceFirst months={months} pillar={pillar} score={score} /> : null}
                </div>
                {part ? <PartChecks pillar={pillar} part={part} mode={checks} checkLinks={checkLinks} /> : null}
              </KpiCard>
            );
          })}
        </div>
      </div>
      {help ? <ScoreHelp /> : null}
    </section>
  );
}
