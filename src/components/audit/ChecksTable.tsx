// All 17 checks, grouped by part, each part with the question it answers. Each row: the check and
// its result (the bar of points earned against possible, "21 of 30 points" and the word), and a
// chevron to the detail panel. When a check's programs differ, the row shows its weakest program
// by name. Each part's group folds away.

import Link from 'next/link';
import { weakestPart, type AreaRow, type AuditView } from '@/audit/view';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon, PillarIcon } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { PILLAR_LABELS, PILLAR_QUESTIONS, RESULT_LABELS } from '@/domain/types';
import { changedParts } from './Parts';
import styles from './audit.module.css';

function CheckRow({ row }: { row: AreaRow }) {
  const summary = row.summary;
  const moved = row.parts.length === 1 ? changedParts(row.parts)[0] : undefined;
  // Programs that differ: the weakest one speaks for the check.
  const weakest = summary.kind === 'varies' ? weakestPart(row.parts) : null;
  const shown = weakest ? { result: weakest.result, points: weakest.points, maxPoints: weakest.maxPoints } : summary.kind === 'single' ? summary : null;
  const resultWords = shown ? `${RESULT_LABELS[shown.result]}, ${Math.round(shown.points)} of ${shown.maxPoints} points` : 'not in this Audit';
  const where = weakest?.programName ? `, weakest in ${weakest.programName}` : '';
  return (
    <Link href={`?check=${row.key}`} scroll={false} className={`${styles.row} ${styles.checkRow}`} aria-label={`${row.name}: ${resultWords}${where}. Open the detail.`}>
      <span className={styles.rowName}>
        <span className={styles.rowTitle}>
          <CheckIcon check={row.key} size={16} />
          {row.name}
        </span>
        {weakest?.programName ? <span className={styles.rowSub}>Weakest: {weakest.programName}</span> : null}
        {moved?.previousResult ? <span className={styles.rowSub}>Was {RESULT_LABELS[moved.previousResult]}</span> : null}
      </span>
      <span className={styles.checkResult}>
        {shown ? <ResultBar result={shown.result} points={shown.points} max={shown.maxPoints} /> : <span className={styles.varies}>Not in this Audit</span>}
      </span>
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
              <span className={styles.groupTitle}>
                <PillarIcon pillar={area.pillar} size={18} />
                {PILLAR_LABELS[area.pillar]}
                <span className={styles.groupQuestion}>{PILLAR_QUESTIONS[area.pillar]}</span>
              </span>
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
