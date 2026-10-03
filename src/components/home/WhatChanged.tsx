// What changed since the last Audit, where "See what changed" lands: the score, every check that
// moved (its result before and after, bar and word), and the fixes marked done that this Audit
// checked; then, for Paid and Client, the rivals' moves and the big jumps in searches. Free sees
// what Paid would add.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { pointsAddedText, type MarkOutcome } from '@/audit/marks';
import type { MovedCheck } from '@/audit/view';
import { Icon } from '@/components/ui/Icon';
import { ResultBar } from '@/components/ui/Results';
import { formatDate, joinNames } from '@/domain/format';
import type { CheckKey } from '@/domain/types';
import type { RivalMove, Spike } from '@/lib/home/load';
import styles from './homepage.module.css';

export interface CheckedMark {
  key: CheckKey;
  name: string;
  markedAt: string;
  outcome: MarkOutcome;
}

function Moved({ from, to }: { from: MovedCheck['from']; to: MovedCheck['to'] }) {
  return (
    <span className={styles.movedResults}>
      <ResultBar result={from} showPoints={false} size="sm" />
      <Icon name="arrowRight" size={14} label="to" />
      <ResultBar result={to} showPoints={false} size="sm" />
    </span>
  );
}

function ScoreLine({ change, score, first }: { change: number | null; score: number; first: boolean }) {
  if (change === null && first) return <>Your first Audit. The next one shows what moved.</>;
  if (change === null) return <>Your programs changed since then, so the overall score starts again from here.</>;
  const rounded = Math.round(change);
  if (rounded === 0) {
    return (
      <>
        Held at <span className="num">{score}</span>.
      </>
    );
  }
  return (
    <>
      {rounded > 0 ? 'Up' : 'Down'} <span className="num">{Math.abs(rounded)}</span>, to <span className="num">{score}</span>.
    </>
  );
}

export function WhatChanged({
  since,
  first,
  change,
  score,
  moved,
  marks,
  moves,
  spikes,
  checkedOn,
  paidAction,
}: {
  /** The Audit before's date; null when the plan does not show it (Free). */
  since: string | null;
  /** A first Audit: nothing before it to compare with. */
  first: boolean;
  /** The overall change; null on a first Audit, or when the programs changed. */
  change: number | null;
  score: number;
  moved: readonly MovedCheck[];
  /** Fixes marked done that the latest Audit checked. */
  marks: readonly CheckedMark[];
  /** Paid and Client: rival moves since then, and this month's big jumps in searches. Null on Free. */
  moves: readonly RivalMove[] | null;
  spikes: readonly Spike[] | null;
  /** The latest Audit's date. */
  checkedOn: string;
  /** Free: asking for Paid. */
  paidAction: ReactNode;
}) {
  const confirmed = new Map(marks.flatMap((mark) => (mark.outcome.kind === 'confirmed' ? [[mark.key, mark] as const] : [])));
  const notYet = marks.filter((mark) => mark.outcome.kind === 'not_yet');
  return (
    <section id="changed" className={styles.card} aria-labelledby="changed-title">
      <div className={styles.cardHead}>
        <h2 id="changed-title" className={styles.cardTitle}>
          <Icon name="refresh" size={20} className={styles.blockIcon} />
          {first ? 'What changed' : since ? `What changed since ${formatDate(since)}` : 'What changed since your last Audit'}
        </h2>
      </div>
      <div className={styles.changes}>
        <div className={styles.changeGroup}>
          <p className={styles.changeLabel}>
            <Icon name="audit" size={14} />
            Your score
          </p>
          <p className={styles.changeLine}>
            <ScoreLine change={change} score={score} first={first} />
          </p>
          {moved.length ? (
            <ul className={styles.moved} aria-label="Checks that moved">
              {moved.map((item) => {
                const mark = item.to !== item.from ? confirmed.get(item.key) : undefined;
                return (
                  <li key={`${item.key}-${item.from}-${item.to}`} className={styles.movedRow}>
                    <span className={styles.movedName}>
                      {item.name}
                      {item.programs.length ? <span className={styles.movedPrograms}> {joinNames(item.programs)}</span> : null}
                      {mark && mark.outcome.kind === 'confirmed' ? (
                        <span className={styles.movedMark}>
                          <Icon name="check" size={12} />
                          You marked it done. Confirmed, {pointsAddedText(mark.outcome.points).toLowerCase()}.
                        </span>
                      ) : null}
                    </span>
                    <Moved from={item.from} to={item.to} />
                  </li>
                );
              })}
            </ul>
          ) : change !== null ? (
            <p className={styles.quiet}>No check moved this time. The things above are the quickest way to move one.</p>
          ) : null}
          {notYet.length ? (
            <ul className={styles.moved} aria-label="Marked done, not found yet">
              {notYet.map((mark) => (
                <li key={mark.key} className={styles.notYet}>
                  <span className={styles.movedName}>{mark.name}</span>
                  <span className={styles.notYetText}>
                    You marked it done on {formatDate(mark.markedAt)}. Your Audit on {formatDate(checkedOn)} did not find the change yet.
                  </span>
                  {mark.outcome.kind === 'not_yet' && mark.outcome.finding ? <span className={styles.notYetFound}>Found: {mark.outcome.finding}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {moves ? (
          <div className={styles.changeGroup}>
            <p className={styles.changeLabel}>
              <Icon name="rivals" size={14} />
              Your rivals
            </p>
            {moves.length ? (
              <>
                <p className={styles.changeLine}>
                  <span className="num">{moves.length}</span> {moves.length === 1 ? 'move' : 'moves'} on their public pages.
                </p>
                <ul className={styles.changeList}>
                  {moves.slice(0, 2).map((move) => (
                    <li key={move.id} className={styles.changeItem}>
                      <span>
                        <strong>{move.rivalName}</strong> {move.description}
                      </span>
                      <span className={styles.changeMeta}>{formatDate(move.detectedAt)}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/rivals" className={styles.quietLink}>
                  See every move
                  <Icon name="arrowRight" size={14} />
                </Link>
              </>
            ) : (
              <p className={styles.quiet}>No new moves on their public pages.</p>
            )}
          </div>
        ) : null}

        {spikes ? (
          <div className={styles.changeGroup}>
            <p className={styles.changeLabel}>
              <Icon name="demand" size={14} />
              What students search for
            </p>
            {spikes.length ? (
              <ul className={styles.changeList}>
                {spikes.slice(0, 2).map((spike) => (
                  <li key={`${spike.programName}-${spike.text}`} className={styles.changeItem}>
                    <span>
                      <strong>{spike.text}</strong>, up <span className="num">{Math.round(spike.changePct)}%</span> this month
                    </span>
                    <span className={styles.changeMeta}>{spike.programName}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>No big jumps this month.</p>
            )}
          </div>
        ) : null}

        {paidAction ? (
          <div className={styles.changeGroup}>
            <p className={styles.changeLabel}>
              <Icon name="plan" size={14} />
              With Paid
            </p>
            <p className={styles.changeLine}>Paid shows what changed every month: your rivals&apos; moves, what students search for, and all your programs.</p>
            {paidAction}
          </div>
        ) : null}
      </div>
    </section>
  );
}
