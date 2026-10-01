// Home's rival snapshot in one card. Paid and Client: your rank, the sentence, and you and your
// rivals by overall score. Free: who is ahead, level or behind, by name, with no numbers.

import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { KpiNumber } from '@/components/ui/Kpi';
import { Change } from '@/components/ui/Results';
import type { LadderRow, Standing } from '@/rivals/compare';
import styles from './home.module.css';

/** 1st, 2nd, 3rd, 4th ... */
export function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'}`;
}

export interface StandingName {
  id: string;
  name: string;
  standing: Standing;
}

const GROUPS: ReadonlyArray<{ standing: Standing; label: string; icon: IconName }> = [
  { standing: 'ahead', label: 'Ahead of you', icon: 'arrowUp' },
  { standing: 'level', label: 'Level with you', icon: 'equal' },
  { standing: 'behind', label: 'Behind you', icon: 'arrowDown' },
  { standing: 'unscored', label: 'Checking now', icon: 'refresh' },
];

/** You and your rivals by overall score: rank, name, a bar, the score and its change. */
export function RivalLadder({ rows }: { rows: readonly LadderRow[] }) {
  return (
    <ol className={styles.ladder} aria-label="You and your rivals by overall score">
      {rows.map((row) => (
        <li key={row.id} className={[styles.ladderRow, row.you ? styles.ladderYou : ''].join(' ')}>
          <span className={`${styles.ladderRank} num`}>{row.rank ?? ''}</span>
          <span className={styles.ladderName}>{row.you ? 'You' : row.name}</span>
          <span className={styles.ladderBar} aria-hidden="true">
            <span className={styles.ladderFill} style={{ width: `${Math.max(0, Math.min(100, row.overall ?? 0))}%` }} />
          </span>
          <span className={`${styles.ladderScore} num`}>
            {row.overall ?? ''}
            <span className="visually-hidden">{row.overall === null ? 'Checking now' : ' out of 100'}</span>
          </span>
          <span className={styles.ladderChange}>{row.overall === null ? 'Checking now' : <Change value={row.change} />}</span>
        </li>
      ))}
    </ol>
  );
}

export function RivalsCard({
  ladder,
  standings,
  verdict,
  rivalsHref,
  chooseHref,
}: {
  ladder: readonly LadderRow[] | null;
  standings: readonly StandingName[] | null;
  verdict: string;
  /** Where "Open Rivals" goes. Null in the product page's picture of Home. */
  rivalsHref: string | null;
  /** Owners with no rivals yet: where to pick them. */
  chooseHref?: string | null;
}) {
  const you = ladder?.find((row) => row.you);
  const scored = ladder?.filter((row) => row.overall !== null) ?? [];
  const hasRivals = Boolean(ladder?.length || standings?.length);
  return (
    <section className={`${styles.card} ${styles.rivalsCard}`} aria-labelledby="home-rivals-title">
      <div className={styles.cardHead}>
        <h2 id="home-rivals-title" className={styles.cardTitle}>
          <Icon name="rivals" size={20} className={styles.blockIcon} />
          Your rivals
        </h2>
        {rivalsHref && hasRivals ? (
          <Link href={rivalsHref} className={styles.headLink}>
            Open Rivals
            <Icon name="arrowRight" size={16} />
          </Link>
        ) : null}
      </div>

      {!hasRivals ? (
        <div className={styles.cardEmpty}>
          <p className={styles.cardText}>Pick 3 to 5 rivals to see who&apos;s ahead, pillar by pillar. Rivals never know who tracks them.</p>
          {chooseHref ? (
            <div>
              <ButtonLink href={chooseHref} size="sm" icon="rivals">
                Choose rivals
              </ButtonLink>
            </div>
          ) : null}
        </div>
      ) : null}

      {ladder && you?.rank ? (
        <KpiNumber value={ordinal(you.rank)} suffix={`of ${scored.length}`} spoken=" by overall score" />
      ) : null}
      {hasRivals && verdict ? <p className={styles.cardText}>{verdict}</p> : null}

      {ladder?.length ? <RivalLadder rows={ladder} /> : null}

      {standings?.length ? (
        <div className={styles.standings}>
          {GROUPS.map((group) => {
            const names = standings.filter((rival) => rival.standing === group.standing).sort((a, b) => a.name.localeCompare(b.name));
            if (!names.length) return null;
            return (
              <div key={group.standing} className={styles.standingGroup}>
                <p className={styles.standingLabel}>
                  <Icon name={group.icon} size={14} />
                  {group.label}
                </p>
                <ul className={styles.standingNames}>
                  {names.map((rival) => (
                    <li key={rival.id}>{rival.name}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
