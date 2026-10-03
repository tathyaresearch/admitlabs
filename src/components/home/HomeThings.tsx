'use client';

// Home's things to do: "Do these 3 things this month" (Paid and Client) or "Fix these first"
// (Free). Each one says where it comes from, the check and the programs it is about, what to do
// and why, the points it could add (or how often students asked) and how big a job it is. The
// owner marks one done: a fix then waits for the next Audit, which checks it. Everyone else
// sees what was marked.

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { EFFORT_LABELS, IDEA_FORMAT_LABELS, type CheckKey, type Difficulty, type IdeaFormat } from '@/domain/types';
import type { ThingSource } from '@/report/things';
import styles from './homepage.module.css';

export interface HomeThing {
  /** What a mark of it is about: 'check:fees_shown', or '2026-09:<its words>'. */
  key: string;
  source: ThingSource;
  title: string;
  /** The check it is about, as a small label (the fix's one name is its title). */
  check: { key: CheckKey; name: string } | null;
  programs: readonly string[];
  format: IdeaFormat | null;
  detail: string;
  /** What it could add to the score; null when it moves no check directly. */
  points: number | null;
  /** Said instead of points: "Asked about 97 times in Guwahati". */
  weight: string | null;
  effort: Difficulty | null;
  href: string;
  /** What Mark as done saves. */
  mark: { check: CheckKey | null; thing: string | null; month: string | null };
  /** Marked done and not yet checked by an Audit. */
  done: boolean;
}

export interface MarkRequest {
  check: CheckKey | null;
  thing: string | null;
  month: string | null;
  done: boolean;
}

const SOURCES: Readonly<Record<ThingSource, { word: string; icon: IconName }>> = {
  audit: { word: 'From your Audit', icon: 'audit' },
  rivals: { word: 'From your rivals', icon: 'rivals' },
  demand: { word: 'From what students ask', icon: 'demand' },
};

function Points({ points }: { points: number }) {
  const rounded = Math.round(points);
  if (points < 0.5) return <>Could add less than 1 point</>;
  return (
    <>
      Could add <span className="num">+{rounded}</span> {rounded === 1 ? 'point' : 'points'}
    </>
  );
}

export function HomeThings({
  id,
  title,
  description,
  items,
  canMark,
  nextAudit,
  onMark,
  empty,
}: {
  id: string;
  title: string;
  description: string;
  items: readonly HomeThing[];
  /** The owner, signed in as themselves. */
  canMark: boolean;
  /** "15 Oct 2026": when the next Audit checks a fix marked done, when it runs on this plan. */
  nextAudit: string | null;
  onMark: (request: MarkRequest) => Promise<{ ok: boolean; error: string | null }>;
  empty: string;
}) {
  const [done, setDone] = useOptimistic(
    new Set(items.flatMap((item) => (item.done ? [item.key] : []))),
    (current: ReadonlySet<string>, change: { key: string; done: boolean }) => {
      const next = new Set(current);
      if (change.done) next.add(change.key);
      else next.delete(change.key);
      return next;
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (item: HomeThing) => {
    const next = !done.has(item.key);
    startTransition(async () => {
      setDone({ key: item.key, done: next });
      const result = await onMark({ ...item.mark, done: next });
      setError(result.ok ? null : result.error);
    });
  };

  const checkNote = nextAudit ? `Your next Audit, on ${nextAudit}, will check it.` : 'Your next Audit will check it.';

  return (
    <section id={id} className={styles.block} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHead}>
        <h2 id={`${id}-title`} className={styles.blockTitle}>
          <Icon name="wrench" size={20} className={styles.blockIcon} />
          {title}
        </h2>
        <p className={styles.blockText}>{description}</p>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {items.length ? (
        <ol className={styles.things}>
          {items.map((item, index) => {
            const isDone = done.has(item.key);
            const source = SOURCES[item.source];
            const note = isDone ? (item.mark.check ? checkNote : null) : null;
            return (
              <li key={item.key} className={styles.thing} data-done={isDone ? 'true' : undefined}>
                <span className={`${styles.thingNumber} num`} aria-hidden="true">
                  {isDone ? <Icon name="check" size={14} /> : index + 1}
                </span>
                <div className={styles.thingMain}>
                  <div className={styles.thingBody}>
                    <p className={styles.thingSource}>
                      <Icon name={source.icon} size={14} />
                      <span>{source.word}</span>
                      {item.check ? (
                        <>
                          <span className={styles.dot} aria-hidden="true" />
                          <span className={styles.thingCheck}>
                            <CheckIcon check={item.check.key} size={14} />
                            {item.check.name}
                          </span>
                        </>
                      ) : null}
                      {item.programs.length ? (
                        <>
                          <span className={styles.dot} aria-hidden="true" />
                          <span>{item.programs.join(', ')}</span>
                        </>
                      ) : null}
                      {item.format ? <span className={styles.format}>{IDEA_FORMAT_LABELS[item.format]}</span> : null}
                    </p>
                    <p className={styles.thingTitle}>
                      {isDone ? <span className="visually-hidden">Done: </span> : null}
                      {item.title}
                    </p>
                    {item.detail ? <p className={styles.thingDetail}>{item.detail}</p> : null}
                    <div className={styles.thingActions}>
                      {canMark ? (
                        <button type="button" className={styles.doneButton} aria-pressed={isDone} onClick={() => toggle(item)}>
                          <span className={styles.doneBox} aria-hidden="true">
                            {isDone ? <Icon name="check" size={12} /> : null}
                          </span>
                          {isDone ? 'Done' : 'Mark as done'}
                        </button>
                      ) : isDone ? (
                        <span className={styles.doneTag}>
                          <Icon name="check" size={12} />
                          Marked done
                        </span>
                      ) : null}
                      <Link href={item.href} className={styles.goLink}>
                        See how
                        <Icon name="arrowRight" size={16} />
                      </Link>
                      {note ? <span className={styles.doneNote}>{note}</span> : null}
                    </div>
                  </div>
                  <div className={styles.thingSide}>
                    {item.points !== null ? (
                      <span className={styles.thingPoints}>
                        <Points points={item.points} />
                      </span>
                    ) : item.weight ? (
                      <span className={styles.thingPoints}>{item.weight}</span>
                    ) : null}
                    {item.effort ? (
                      <span className={styles.effort}>
                        <span className={styles.effortLabel}>Effort</span>
                        {EFFORT_LABELS[item.effort]}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.blockText}>{empty}</p>
      )}
    </section>
  );
}
