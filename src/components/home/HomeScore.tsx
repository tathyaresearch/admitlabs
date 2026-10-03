// Home's score, after what to do and what changed: the gauge with its band and change, how far it
// moved since the first month in words, how far the next band is; then each part of the score
// with the question it answers, its score and change, its checks as one bar split by result with
// the counts written out, and the check to fix first. The month by month chart and every check
// by name stay on the Audit.

import Link from 'next/link';
import { pillarChecks, type AuditView } from '@/audit/view';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { FixFirst, SplitBar } from '@/components/ui/CheckSummary';
import { Icon } from '@/components/ui/Icon';
import { PillarIcon } from '@/components/ui/Marks';
import { Change, Delta, ScoreLabel } from '@/components/ui/Results';
import { formatDate, formatMonthName } from '@/domain/format';
import { nextBandText } from '@/domain/scores';
import { PILLAR_LABELS, PILLAR_QUESTIONS, PILLARS } from '@/domain/types';
import styles from './homepage.module.css';

export function HomeScore({
  view,
  checkedAt,
  since,
  note,
  checkLinks,
  upsell,
}: {
  view: AuditView;
  checkedAt: string;
  /** "Up 14 since April": the first month with a score and the overall change since. Null without history. */
  since: { month: string; change: number } | null;
  /** One quiet line, like "Next Audit on 15 Oct 2026." */
  note: string | null;
  /** The start of a check's address ("/audit?check="). */
  checkLinks: string;
  /** Free: the quiet way to more. */
  upsell: { href: string; text: string } | null;
}) {
  const quiet = view.firstAudit || view.programsChanged;
  const parts = new Map(pillarChecks(view).map((entry) => [entry.pillar, entry]));
  return (
    <section className={styles.card} aria-labelledby="score-title">
      <div className={styles.cardHead}>
        <h2 id="score-title" className={styles.cardTitle}>
          <Icon name="audit" size={20} className={styles.blockIcon} />
          Your score
        </h2>
        <span className={styles.cardAside}>Checked {formatDate(checkedAt)}</span>
      </div>
      <div className={styles.scoreLayout}>
        <div className={styles.scoreTop}>
          <ScoreGauge score={view.scores.overall} />
          <div className={styles.scoreFacts}>
            <div className={styles.scoreChips}>
              <ScoreLabel label={view.label} />
              {view.programsChanged ? null : <Delta change={view.firstAudit ? null : view.changes.overall} size="sm" />}
            </div>
            {since ? (
              <p className={styles.scoreFact}>
                {since.change === 0 ? (
                  <>The same as in {formatMonthName(since.month)}</>
                ) : (
                  <>
                    {since.change > 0 ? 'Up' : 'Down'} <span className="num">{Math.abs(since.change)}</span> since {formatMonthName(since.month)}
                  </>
                )}
              </p>
            ) : null}
            <p className={styles.scoreFact}>{nextBandText(view.scores.overall)}</p>
            {note ? <p className={styles.scoreFact}>{note}</p> : null}
          </div>
        </div>
        <ul className={styles.partRows}>
          {PILLARS.map((pillar) => {
            const part = parts.get(pillar);
            const change = quiet ? null : view.changes[pillar];
            return (
              <li key={pillar} className={styles.partRow}>
                <div className={styles.partRowHead}>
                  <span className={styles.partRowName}>
                    <PillarIcon pillar={pillar} size={16} />
                    {PILLAR_LABELS[pillar]}
                    <span className={styles.partQuestion}>{PILLAR_QUESTIONS[pillar]}</span>
                  </span>
                  <span className={styles.partRowScore}>
                    <span className={`${styles.partRowNumber} num`}>
                      {view.scores[pillar]}
                      <span className="visually-hidden"> out of 100</span>
                    </span>
                    {change === null ? null : (
                      <span className={styles.partChange}>
                        <Change value={change} />
                      </span>
                    )}
                  </span>
                </div>
                {part ? (
                  <>
                    <SplitBar checks={part.checks} label={`${PILLAR_LABELS[pillar]} checks`} />
                    <FixFirst check={part.weakest} checkLinks={checkLinks} />
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
      {upsell ? (
        <Link href={upsell.href} className={styles.quietLink}>
          {upsell.text}
          <Icon name="arrowRight" size={14} />
        </Link>
      ) : null}
    </section>
  );
}
