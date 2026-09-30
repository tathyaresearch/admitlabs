// The season clock (spec 9.4): the months ahead as a strip, where the admission year is now,
// and what comes next. Without colour: the stage running now is solid, later stages are grey.

import { STAGE_LABELS, stageWhen, type SeasonClock as Clock, type SeasonStage } from '@/demand/season';
import styles from './demand.module.css';

export function SeasonClock({ clock, stages }: { clock: Clock; stages: readonly SeasonStage[] }) {
  const later = stages.filter((stage) => stage !== clock.now && stage !== clock.next && stage.from > (clock.next?.from ?? '')).sort((a, b) => a.from.localeCompare(b.from));
  return (
    <div className={styles.season}>
      <p className={styles.seasonTitle}>Admission year</p>
      <ol className={styles.months} aria-hidden="true">
        {clock.months.map((month) => (
          <li key={month.key} className={styles.month} data-current={month.current}>
            <span className={styles.monthLabel}>{month.label}</span>
            <span className={styles.monthBar} data-stage={month.phase} />
          </li>
        ))}
      </ol>
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
        {later.length ? <p className={styles.seasonLater}>Later: {later.map((stage) => `${STAGE_LABELS[stage.stage]}, ${stageWhen(stage)}`).join('. ')}.</p> : null}
      </div>
    </div>
  );
}
