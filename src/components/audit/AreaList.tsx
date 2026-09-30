// Area by area: every check in its pillar, with its result. Each row opens the check detail.

import Link from 'next/link';
import type { AuditView } from '@/audit/view';
import { Icon } from '@/components/ui/Icon';
import { PILLAR_LABELS } from '@/domain/types';
import { changedParts, PartResults, WasMarker } from './Parts';
import styles from './audit.module.css';

export function AreaList({ view }: { view: AuditView }) {
  return (
    <div className={styles.areas}>
      {view.areas.map((area) => (
        <section key={area.pillar} className={styles.area} aria-labelledby={`area-${area.pillar}`}>
          <header className={styles.areaHead}>
            <h3 id={`area-${area.pillar}`} className={styles.areaTitle}>
              {PILLAR_LABELS[area.pillar]}
            </h3>
            <span className={styles.areaScore}>
              {view.scores[area.pillar]}
              <span className="visually-hidden"> out of 100</span>
            </span>
          </header>
          {area.rows.map((row) => {
            const several = row.level === 'program' && row.parts.length > 1;
            const moved = changedParts(row.parts);
            return (
              <Link key={row.key} href={`?check=${row.key}`} scroll={false} className={styles.areaRow}>
                <span className={styles.areaRowTop}>
                  <span className={styles.areaName}>{row.name}</span>
                  <Icon name="chevronRight" size={16} className={styles.areaChevron} />
                </span>
                <span className={styles.areaLooks}>{row.looksAt}</span>
                <PartResults parts={row.parts} showNames={several} />
                {!several && moved[0] ? <WasMarker part={moved[0]} /> : null}
                {several && moved.length ? (
                  <span className={styles.was}>
                    {moved.length === 1 ? `${moved[0]?.programName}: changed since the last Audit` : `${moved.length} programs changed since the last Audit`}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}
