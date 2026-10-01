// "Where you stand": the one band at the top of the Rivals page. Paid and Client see the
// ladder of overall scores with your place in it; Free sees ahead or behind for each rival,
// in words, with no scores and no order that could hint at one. Home reuses the lists.

import { Icon } from '@/components/ui/Icon';
import { Change } from '@/components/ui/Results';
import { ordinal } from '@/domain/format';
import type { LadderRow, Standing } from '@/rivals/compare';
import { STANDING_LABELS } from '@/rivals/text';
import audit from '@/components/audit/audit.module.css';
import styles from './rivals.module.css';

/** You and your rivals by overall score, highest first, you in an inverted row. */
export function LadderList({ rows, youName }: { rows: readonly LadderRow[]; youName: string }) {
  return (
    <ol className={styles.ladder} aria-label="You and your rivals by overall score">
      {rows.map((row) => {
        const width = Math.max(0, Math.min(100, row.overall ?? 0));
        return (
          <li key={row.id} className={[styles.ladderRow, row.you ? `invert ${styles.ladderYou}` : ''].join(' ')}>
            <span className={`${styles.ladderRank} num`}>{row.rank ?? ''}</span>
            <span className={styles.ladderName}>
              <span className={styles.ladderNameText}>{row.you ? 'You' : row.name}</span>
              {row.you ? <span className={styles.ladderSub}>{youName}</span> : null}
            </span>
            <span className={styles.ladderTrack} aria-hidden="true">
              <span className={styles.ladderFill} style={{ width: `${width}%` }} />
            </span>
            <span className={`${styles.ladderScore} num`}>
              {row.overall ?? ''}
              <span className="visually-hidden">{row.overall === null ? 'Checking now' : ' out of 100'}</span>
            </span>
            <span className={styles.ladderChange}>{row.overall === null ? 'Checking now' : <Change value={row.change} />}</span>
          </li>
        );
      })}
    </ol>
  );
}

const STANDING_ICON = { ahead: 'arrowUp', behind: 'arrowDown', level: 'equal', unscored: 'refresh' } as const;

export interface StandingEntry {
  id: string;
  name: string;
  city: string;
  standing: Standing;
}

/** Free: rivals ahead of you, then you, then the rest; names in order inside each group, no scores. */
export function StandingList({ rivals, youName }: { rivals: readonly StandingEntry[]; youName: string }) {
  const group = (standing: Standing) => rivals.filter((rival) => rival.standing === standing).sort((a, b) => a.name.localeCompare(b.name));
  const below = (['level', 'behind', 'unscored'] as const).flatMap(group);
  return (
    <ul className={styles.ladder} aria-label="Your rivals, ahead or behind you">
      {group('ahead').map((rival) => (
        <StandingRow key={rival.id} rival={rival} />
      ))}
      <li className={`invert ${styles.standingRow} ${styles.ladderYou}`}>
        <span className={styles.ladderName}>
          <span className={styles.ladderNameText}>You</span>
          <span className={styles.ladderSub}>{youName}</span>
        </span>
      </li>
      {below.map((rival) => (
        <StandingRow key={rival.id} rival={rival} />
      ))}
    </ul>
  );
}

function StandingRow({ rival }: { rival: StandingEntry }) {
  return (
    <li className={styles.standingRow}>
      <span className={styles.ladderName}>
        <span className={styles.ladderNameText}>{rival.name}</span>
        <span className={styles.ladderSub}>{rival.city}</span>
      </span>
      <span className={styles.standing} data-standing={rival.standing}>
        <Icon name={STANDING_ICON[rival.standing]} size={14} />
        {STANDING_LABELS[rival.standing]}
      </span>
    </li>
  );
}

export function PaidStandBand({ rows, verdict, youName }: { rows: readonly LadderRow[]; verdict: string; youName: string }) {
  const mine = rows.find((row) => row.you);
  const scored = rows.filter((row) => row.rank !== null).length;
  return (
    <section className={audit.band} aria-labelledby="stand-title">
      <div className={styles.standBlock}>
        <h2 id="stand-title" className={audit.scoreCaption}>
          Where you stand
        </h2>
        {mine?.rank ? (
          <p className={styles.rankLine}>
            <span className={`${styles.rankNumber} num`}>{mine.rank}</span>
            <span className={`${styles.rankSuffix} num`}>{ordinal(mine.rank).slice(String(mine.rank).length)}</span>
            <span className={styles.rankOf}>of {scored}</span>
          </p>
        ) : null}
        <p className={audit.verdict}>{verdict}</p>
        <p className={audit.bandNote}>Overall scores out of 100. Change is since last month.</p>
      </div>
      <LadderList rows={rows} youName={youName} />
    </section>
  );
}

export function FreeStandBand({ rivals, verdict, youName }: { rivals: readonly StandingEntry[]; verdict: string; youName: string }) {
  return (
    <section className={audit.band} aria-labelledby="stand-title">
      <div className={styles.standBlock}>
        <h2 id="stand-title" className={audit.scoreCaption}>
          Where you stand
        </h2>
        <p className={audit.verdict}>{verdict || 'Your rivals are being checked now.'}</p>
        <p className={audit.bandNote}>Ahead or behind on the overall score, from Drishti&apos;s monthly check of each rival.</p>
      </div>
      <StandingList rivals={rivals} youName={youName} />
    </section>
  );
}
