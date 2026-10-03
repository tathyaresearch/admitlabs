// A part's checks, every one named (rule 11: no shape without its name or number beside it).
//   Where there's room: every check as a row, weakest first: its name, a thin bar and the word.
//   Where it's tight: one bar for the part, split by result, each count written under its own
//   piece ("2 Strong"), then the check to fix first.
// Each piece and bar carries data-fill, so the product pictures can fill them in turn.

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { resultCounts, type PillarCheck } from '@/audit/view';
import { RESULT_LABELS } from '@/domain/types';
import { CheckIcon } from './Marks';
import { ResultBar } from './Results';
import styles from './CheckSummary.module.css';

/**
 * Where there's room: every check as a row, given weakest first. `checkLinks` is the start of a
 * check's address ("?check="), where the page can open a check.
 */
export function CheckRows({ checks, checkLinks = null }: { checks: readonly PillarCheck[]; checkLinks?: string | null }) {
  return (
    <div className={styles.rowsBlock}>
      <p className={styles.caption}>{checks.length} checks, weakest first</p>
      <ul className={styles.rows}>
        {checks.map((check) => {
          const body = (
            <>
              <span className={styles.name}>
                <CheckIcon check={check.key} size={14} />
                <span className={styles.nameText}>{check.name}</span>
              </span>
              <span className={styles.result}>
                <ResultBar result={check.result} points={check.points} max={check.maxPoints} showPoints={false} size="sm" />
              </span>
            </>
          );
          return (
            <li key={check.key}>
              {checkLinks ? (
                <Link href={`${checkLinks}${check.key}`} scroll={false} className={`${styles.row} ${styles.rowLink}`}>
                  {body}
                </Link>
              ) : (
                <span className={styles.row}>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Where it's tight: one bar split by result, each count written under its own piece. */
export function SplitBar({ checks, label }: { checks: ReadonlyArray<{ result: PillarCheck['result'] }>; label: string }) {
  const parts = resultCounts(checks);
  const spoken = parts.map((part) => `${part.count} ${RESULT_LABELS[part.result]}`).join(', ');
  return (
    <div className={styles.split} style={{ gridTemplateColumns: parts.map((part) => `minmax(max-content, ${part.count}fr)`).join(' ') } as CSSProperties} role="img" aria-label={`${label}: ${spoken}`}>
      {parts.map((part) => (
        <span key={part.result} className={styles.splitCell} aria-hidden="true">
          <span className={styles.piece} data-result={part.result} data-fill />
          <span className={styles.splitLabel}>
            <span className="num">{part.count}</span> {RESULT_LABELS[part.result]}
          </span>
        </span>
      ))}
    </div>
  );
}

/** "Fix first: AI answers, Missing": the part's weakest check, or that every check is Strong. */
export function FixFirst({ check, checkLinks = null }: { check: PillarCheck | null; checkLinks?: string | null }) {
  if (!check) {
    return (
      <p className={styles.fixFirst}>
        <span className={styles.fixLabel}>Every check is Strong</span>
      </p>
    );
  }
  const body = (
    <>
      <span className={styles.fixName}>{check.name}</span>
      <ResultBar result={check.result} points={check.points} max={check.maxPoints} showPoints={false} size="sm" />
    </>
  );
  return (
    <p className={styles.fixFirst}>
      <span className={styles.fixLabel}>Fix first</span>
      {checkLinks ? (
        <Link href={`${checkLinks}${check.key}`} scroll={false} className={styles.fixLink}>
          {body}
        </Link>
      ) : (
        <span className={styles.fixLink}>{body}</span>
      )}
    </p>
  );
}
