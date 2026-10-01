// All 17 checks, grouped by pillar. Each row: the check, its result, its points, and a
// chevron to the detail panel. Each pillar group folds away.

import Link from 'next/link';
import { pointsFraction, type AreaRow, type AuditView } from '@/audit/view';
import { Icon } from '@/components/ui/Icon';
import { ResultMeter } from '@/components/ui/Results';
import { PILLAR_LABELS, RESULT_LABELS } from '@/domain/types';
import { changedParts } from './Parts';
import styles from './audit.module.css';

function CheckRow({ row }: { row: AreaRow }) {
  const summary = row.summary;
  const moved = row.parts.length === 1 ? changedParts(row.parts)[0] : undefined;
  const resultWords =
    summary.kind === 'single' ? RESULT_LABELS[summary.result] : summary.kind === 'varies' ? 'varies by program' : 'not in this Audit';
  const points = summary.kind === 'none' ? '' : pointsFraction(summary.points, summary.maxPoints);
  const spoken = summary.kind === 'none' ? '' : `, ${Math.round(summary.points)} of ${summary.maxPoints} points`;
  return (
    <Link href={`?check=${row.key}`} scroll={false} className={styles.row} aria-label={`${row.name}: ${resultWords}${spoken}. Open the detail.`}>
      <span className={styles.rowName}>
        {row.name}
        {moved?.previousResult ? <span className={styles.rowSub}>Was {RESULT_LABELS[moved.previousResult]}</span> : null}
      </span>
      <span>
        {summary.kind === 'single' ? (
          <ResultMeter result={summary.result} size="sm" />
        ) : (
          <span className={styles.varies}>{summary.kind === 'varies' ? 'Varies by program' : 'Not in this Audit'}</span>
        )}
      </span>
      <span className={`${styles.rowMeta} num`}>{points}</span>
      <Icon name="chevronRight" size={16} className={styles.chevron} />
    </Link>
  );
}

export function ChecksTable({ view }: { view: AuditView }) {
  return (
    <div className={styles.groups}>
      {view.areas.map((area) => {
        const toImprove = area.rows.filter((row) => row.parts.some((part) => part.result !== 'strong')).length;
        return (
          <details key={area.pillar} className={styles.group} open>
            <summary className={styles.groupSummary}>
              <span className={styles.groupTitle}>{PILLAR_LABELS[area.pillar]}</span>
              <span className={styles.groupMeta}>
                <span>
                  <span className="num">{area.rows.length}</span> checks
                  {toImprove ? (
                    <>
                      , <span className="num">{toImprove}</span> to improve
                    </>
                  ) : null}
                </span>
                <Icon name="chevronDown" size={16} className={styles.groupIcon} />
              </span>
            </summary>
            <div className={styles.checkRows}>
              {area.rows.map((row) => (
                <CheckRow key={row.key} row={row} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
