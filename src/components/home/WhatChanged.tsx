// What changed since the last Audit (spec section 13), as the version 2 mock was approved: each
// word that moved, each check that moved with its result before and after, the fixes marked done
// that this Audit checked; then, for Paid and Client, the rivals' alerts and the fast rises in
// what students search, in words. Free sees what Paid adds. Each word with its number out of 100.

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { MarkOutcome } from '@/audit/marks';
import type { WordView } from '@/audit/places';
import type { MovedCheck } from '@/audit/view';
import { Moved } from '@/components/audit/PlaceBits';
import { Icon } from '@/components/ui/Icon';
import { trendWord } from '@/demand/text';
import { formatDate, joinNames } from '@/domain/format';
import type { CheckKey } from '@/domain/types';
import type { RivalMove, Spike } from '@/lib/home/load';
import { wordScoreText } from '@/domain/scores';
import audit from '@/components/audit/places.module.css';
import styles from './today.module.css';

export interface CheckedMark {
  key: CheckKey;
  name: string;
  markedAt: string;
  outcome: MarkOutcome;
}

/** "up from Okay in June", inside a sentence. */
const inLine = (moved: string) => moved.charAt(0).toLowerCase() + moved.slice(1);

export function WhatChanged({
  since,
  first,
  words,
  moved,
  marks,
  moves,
  spikes,
  place,
  checkedOn,
  paidAction,
}: {
  /** When the Audit before ran; null on a first Audit, or when the plan does not show it. */
  since: string | null;
  first: boolean;
  words: readonly WordView[];
  moved: readonly MovedCheck[];
  /** Fixes marked done that the latest Audit checked. */
  marks: readonly CheckedMark[];
  /** Paid and Client: rival alerts since then, and this month's fast rises in searches. Null on Free. */
  moves: readonly RivalMove[] | null;
  spikes: readonly Spike[] | null;
  place: string;
  checkedOn: string;
  /** Free: asking for Paid. */
  paidAction: ReactNode;
}) {
  const movedWords = words.filter((word) => word.moved);
  const confirmed = new Set(marks.flatMap((mark) => (mark.outcome.kind === 'confirmed' ? [mark.key] : [])));
  const notYet = marks.filter((mark) => mark.outcome.kind === 'not_yet');
  return (
    <section id="changed" className={audit.block} aria-labelledby="changed-title">
      <div className={audit.sectionHead}>
        <div className={audit.sectionText}>
          <h2 id="changed-title" className={audit.sectionTitle}>
            <Icon name="refresh" size={18} className={audit.sectionIcon} />
            {first ? 'What changed' : since ? `What changed since ${formatDate(since)}` : 'What changed since your last Audit'}
          </h2>
        </div>
      </div>
      <div className={audit.card}>
        <div className={audit.changedGrid}>
          <div className={styles.changeGroup}>
            <p className={audit.miniTitle}>Your three words</p>
            {first ? (
              <p className={audit.quiet}>Your first Audit. The next one shows what moved.</p>
            ) : movedWords.length ? (
              <ul className={audit.plainList}>
                {movedWords.map((word) => (
                  <li key={word.pillar}>
                    <span className={audit.strongText}>{wordScoreText(word.name, word.score, word.word)}</span>, {inLine(word.moved ?? '')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={audit.quiet}>No word moved: {words.map((word) => wordScoreText(word.name, word.score, word.word)).join(', ')}.</p>
            )}
          </div>

          {first ? null : (
            <div className={styles.changeGroup}>
              <p className={audit.miniTitle}>Checks that moved</p>
              {moved.length ? (
                <ul className={audit.plainList}>
                  {moved.slice(0, 5).map((check) => (
                    <li key={`${check.key}-${check.from}-${check.to}`} className={audit.movedRow}>
                      <span>
                        {check.name}
                        {check.programs.length ? <span className={audit.muted}> {joinNames(check.programs)}</span> : null}
                        {confirmed.has(check.key) && check.to !== check.from ? (
                          <span className={styles.markLine}>
                            <Icon name="check" size={12} />
                            You marked it done. Confirmed.
                          </span>
                        ) : null}
                      </span>
                      <Moved before={check.from} after={check.to} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={audit.quiet}>Every check held its result. The things above are the quickest way to move one.</p>
              )}
              {notYet.length ? (
                <ul className={audit.plainList}>
                  {notYet.map((mark) => (
                    <li key={mark.key} className={styles.notYet}>
                      <span className={audit.strongText}>{mark.name}</span>: marked done on {formatDate(mark.markedAt)}. The Audit on {formatDate(checkedOn)} did not find the change yet.
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {moves ? (
            <div className={styles.changeGroup}>
              <p className={audit.miniTitle}>Your rivals</p>
              {moves.length ? (
                <>
                  <ul className={audit.plainList}>
                    {moves.slice(0, 2).map((move) => (
                      <li key={move.id}>
                        <span className={audit.strongText}>{move.rivalName}</span>: {move.description} <span className={audit.muted}>{formatDate(move.detectedAt)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/rivals#alerts-title" className={styles.quietLink}>
                    See every alert
                    <Icon name="arrowRight" size={14} />
                  </Link>
                </>
              ) : (
                <p className={audit.quiet}>No new moves on their public pages.</p>
              )}
            </div>
          ) : null}

          {spikes ? (
            <div className={styles.changeGroup}>
              <p className={audit.miniTitle}>What students search</p>
              {spikes.length ? (
                <ul className={audit.plainList}>
                  {spikes.slice(0, 2).map((spike) => (
                    <li key={`${spike.programName}-${spike.text}`}>
                      <span className={audit.strongText}>{spike.text}</span> is {(trendWord(spike.changePct) ?? 'Rising').toLowerCase()} in {place}. <span className={audit.muted}>{spike.programName}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={audit.quiet}>Nothing is rising fast this month.</p>
              )}
            </div>
          ) : null}

          {paidAction ? (
            <div className={styles.changeGroup}>
              <p className={audit.miniTitle}>With Paid</p>
              <p className={audit.quiet}>Paid shows what changed every month: your rivals’ moves, what students in {place} search for, and all your programs.</p>
              {paidAction}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
