// Where you stand, in one card: your rank, then you and each rival by overall score with the three
// pillars beside it. One table instead of a ladder and a head to head that said the same twice.
// Each rival's name opens its page.

import Link from 'next/link';
import { KpiNumber } from '@/components/ui/Kpi';
import { Change } from '@/components/ui/Results';
import { ordinal } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS, PILLAR_LABELS, PILLARS } from '@/domain/types';
import type { RivalScores } from '@/lib/rivals/load';
import type { LadderRow, ScoreSet } from '@/rivals/compare';
import styles from './rivals.module.css';

export function StandTable({ ladder, rows, you }: { ladder: readonly LadderRow[]; rows: readonly RivalScores[]; you: ScoreSet | null }) {
  const byId = new Map(rows.map((row) => [row.rival.id, row]));
  const mine = ladder.find((row) => row.you);
  const scored = ladder.filter((row) => row.rank !== null).length;
  return (
    <div className={styles.standCard}>
      <div className={styles.standHead}>
        <p className={styles.standLabel}>Your rank by overall score</p>
        {mine?.rank ? <KpiNumber value={ordinal(mine.rank)} suffix={`of ${scored}`} spoken=" by overall score" /> : null}
      </div>
      <div className={styles.standScroll}>
        <table className={styles.standTable}>
          <caption className="visually-hidden">You and your rivals by overall score, with the three pillars and the change since last month</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.colRank}>
                <span className="visually-hidden">Rank</span>
              </th>
              <th scope="col">Institution</th>
              <th scope="col" className={styles.colOverall}>
                Overall
              </th>
              {PILLARS.map((pillar) => (
                <th key={pillar} scope="col" className={styles.colPillar}>
                  {PILLAR_LABELS[pillar]}
                </th>
              ))}
              <th scope="col" className={styles.colChange}>
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {ladder.map((row) => {
              const rival = row.you ? null : byId.get(row.id);
              const scores = row.you ? you : (rival?.audit?.scores ?? null);
              return (
                <tr key={row.id} className={row.you ? styles.standYou : undefined}>
                  <td className={`${styles.colRank} num`}>{row.rank ?? ''}</td>
                  <th scope="row" className={styles.standName}>
                    {row.you ? (
                      'You'
                    ) : (
                      <Link href={`/rivals/${row.id}`} className={styles.standLink}>
                        {row.name}
                      </Link>
                    )}
                    <span className={styles.standSub}>{row.you ? row.name : rival ? `${INSTITUTION_TYPE_LABELS[rival.rival.type]}, ${rival.rival.city}` : ''}</span>
                  </th>
                  <td className={styles.colOverall}>
                    {row.overall === null ? (
                      <span className={styles.standQuiet}>Checking now</span>
                    ) : (
                      <span className={styles.overallCell}>
                        <span className={styles.overallBar} aria-hidden="true">
                          <span style={{ width: `${Math.max(0, Math.min(100, row.overall))}%` }} />
                        </span>
                        <span className="num">{row.overall}</span>
                      </span>
                    )}
                  </td>
                  {PILLARS.map((pillar) => (
                    <td key={pillar} className={`${styles.colPillar} num`}>
                      {scores ? scores[pillar] : ''}
                    </td>
                  ))}
                  <td className={styles.colChange}>{row.overall === null ? null : <Change value={row.change} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
