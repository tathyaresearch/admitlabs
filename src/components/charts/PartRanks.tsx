// Part by part (rule 11, replacing the dot chart): each part of the score as a ranked list of you
// and your rivals, with their real names, the score and a thin bar, your row in the text colour,
// and one plain line about the gap ("You lead Silverline College by 6", "3 behind Silverline
// College"). Three lists side by side when there is room, one under another on a phone. Each bar
// carries data-fill, so the product page can fill them in turn.

import { PillarIcon } from '@/components/ui/Marks';
import { ordinal } from '@/domain/format';
import { PILLAR_LABELS, PILLAR_QUESTIONS } from '@/domain/types';
import { partGap, type PillarSpread } from '@/rivals/trend';
import styles from './charts.module.css';

/** "You lead Silverline College by 6", "3 behind Silverline College", "Level with Highfield University". */
export function GapLine({ row }: { row: PillarSpread }) {
  const gap = partGap(row);
  if (!gap) return null;
  if (gap.kind === 'level') return <>Level with {gap.name}</>;
  if (gap.kind === 'lead') {
    return (
      <>
        You lead {gap.name} by <span className="num">{gap.points}</span>
      </>
    );
  }
  return (
    <>
      <span className="num">{gap.points}</span> behind {gap.name}
    </>
  );
}

function PartRank({ row, youName }: { row: PillarSpread; youName: string }) {
  return (
    <section className={styles.rank} aria-label={`${PILLAR_LABELS[row.pillar]}, ranked`}>
      <div className={styles.rankHead}>
        <p className={styles.rankTitle}>
          <PillarIcon pillar={row.pillar} size={16} />
          {PILLAR_LABELS[row.pillar]}
        </p>
        {row.rank ? (
          <p className={styles.rankPlace}>
            <span className="num">{ordinal(row.rank)}</span> of {row.of}
          </p>
        ) : null}
      </div>
      <p className={styles.rankQuestion}>{PILLAR_QUESTIONS[row.pillar]}</p>
      <ol className={styles.rankRows}>
        {row.entries.map((entry) => {
          const place = 1 + row.entries.filter((other) => other.score > entry.score).length;
          return (
            <li key={entry.id} className={styles.rankRow} data-you={entry.you ? 'true' : undefined}>
              <span className={`${styles.rankNumber} num`}>{place}</span>
              <span className={styles.rankName}>{entry.you ? youName : entry.name}</span>
              <span className={styles.rankTrack} aria-hidden="true">
                <span className={styles.rankFill} style={{ width: `${Math.max(0, Math.min(100, entry.score))}%` }} data-fill />
              </span>
              <span className={`${styles.rankScore} num`}>
                {Math.round(entry.score)}
                <span className="visually-hidden"> out of 100</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className={styles.rankGap}>
        <GapLine row={row} />
      </p>
    </section>
  );
}

export function PartRanks({ rows, youName = 'You' }: { rows: readonly PillarSpread[]; youName?: string }) {
  return (
    <div className={styles.ranks}>
      {rows.map((row) => (
        <PartRank key={row.pillar} row={row} youName={youName} />
      ))}
    </div>
  );
}
