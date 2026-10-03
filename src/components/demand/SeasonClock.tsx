// The season clock (spec 9.4): where the admission year is now and what comes next. The stages
// ahead as one strip, each piece named on its own months with when it runs (rule 11), the one
// running now in the text colour. On a phone, one stage a line. Then now and next in words.

import type { CSSProperties } from 'react';
import { STAGE_LABELS, stageWhen, type SeasonClock as Clock, type SeasonStage } from '@/demand/season';
import { istParts } from '@/domain/dates';
import styles from './demand.module.css';

/** Stages shown on the strip: the one running now and the next few. */
const STAGES_SHOWN = 4;
const MONTH_MS = 30.4 * 86_400_000;

export function SeasonClock({ clock, stages, today }: { clock: Clock; stages: readonly SeasonStage[]; today: Date }) {
  const { year, month, day: date } = istParts(today);
  const day = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  const ahead = [...stages]
    .filter((stage) => stage.to >= day)
    .sort((a, b) => a.from.localeCompare(b.from))
    .slice(0, STAGES_SHOWN);
  // Each piece is as wide as the months it has left, and never narrower than its name.
  const months = (stage: SeasonStage) => Math.max(1, Math.round((Date.parse(stage.to) - Math.max(Date.parse(stage.from), Date.parse(day))) / MONTH_MS));
  return (
    <div className={styles.season}>
      <p className={styles.seasonTitle}>Admission year, from this month</p>
      {ahead.length ? (
        <ol className={styles.stages} style={{ '--stage-columns': ahead.map((stage) => `minmax(max-content, ${months(stage)}fr)`).join(' ') } as CSSProperties}>
          {ahead.map((stage) => {
            const now = stage === clock.now;
            return (
              <li key={`${stage.stage}-${stage.from}`} className={styles.stage} data-now={now ? 'true' : undefined}>
                <span className={styles.stagePiece} aria-hidden="true" />
                <span className={styles.stageName}>
                  {now ? 'Now: ' : ''}
                  {STAGE_LABELS[stage.stage]}
                </span>
                <span className={styles.stageWhen}>{stageWhen(stage)}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
      <div className={styles.seasonFacts}>
        <div className={styles.seasonFact}>
          <p className={styles.seasonLabel}>Now{clock.now ? `: ${STAGE_LABELS[clock.now.stage]}` : ''}</p>
          <p className={styles.seasonText}>{clock.now ? clock.now.text : 'A quiet stretch before the next season: a good time to build content.'}</p>
        </div>
        {clock.next ? (
          <div className={styles.seasonFact}>
            <p className={styles.seasonLabel}>
              Next: {STAGE_LABELS[clock.next.stage]}, {stageWhen(clock.next)}
            </p>
            <p className={styles.seasonText}>{clock.next.text}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
