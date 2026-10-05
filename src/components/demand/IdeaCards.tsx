'use client';

// Make these 3 this month (spec 9.4), as the version 2 mock was approved: one card each with
// what to make, why, the program, the format, a hook line, the key points, where the question
// was asked (./IdeaCard.tsx), and Mark as made (the owner; everyone else sees what was made). The
// month's other ideas as rows that open, with the same parts.

import { useOptimistic, useState, useTransition, type ReactNode } from 'react';
import { Tag } from '@/components/audit/PlaceBits';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import audit from '@/components/audit/places.module.css';
import { IdeaBody, IdeaCard, type IdeaItem } from './IdeaCard';
import styles from './demand.module.css';

export type { IdeaItem } from './IdeaCard';

export interface MarkMadeRequest {
  check: null;
  thing: string;
  month: string;
  done: boolean;
}

type OnMark = (request: MarkMadeRequest) => Promise<{ ok: boolean; error: string | null }>;

function useMade(items: readonly IdeaItem[], onMark: OnMark) {
  const [made, setMade] = useOptimistic(new Set(items.flatMap((item) => (item.made ? [item.key] : []))), (current: ReadonlySet<string>, change: { key: string; made: boolean }) => {
    const next = new Set(current);
    if (change.made) next.add(change.key);
    else next.delete(change.key);
    return next;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toggle = (item: IdeaItem, next: boolean) =>
    startTransition(async () => {
      setMade({ key: item.key, made: next });
      const result = await onMark({ check: null, thing: item.mark.thing, month: item.mark.month, done: next });
      setError(result.ok ? null : result.error);
    });
  return { made, error, pending, toggle };
}

function MadeControl({ item, made, canMark, pending, onToggle }: { item: IdeaItem; made: boolean; canMark: boolean; pending: boolean; onToggle: (item: IdeaItem, next: boolean) => void }) {
  if (!canMark) {
    return made ? (
      <span className={styles.made}>
        <Icon name="checkCircle" size={16} />
        Marked as made
      </span>
    ) : null;
  }
  return made ? (
    <span className={styles.made}>
      <Icon name="checkCircle" size={16} />
      Made
      <button type="button" className={audit.linkButton} onClick={() => onToggle(item, false)} disabled={pending}>
        Undo
      </button>
    </span>
  ) : (
    <Button variant="secondary" size="sm" icon="check" onClick={() => onToggle(item, true)} disabled={pending}>
      Mark as made
    </Button>
  );
}

export function IdeaCards({ items, canMark, onMark, after }: { items: readonly IdeaItem[]; canMark: boolean; onMark: OnMark; after?: ReactNode }) {
  const { made, error, pending, toggle } = useMade(items, onMark);
  return (
    <>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <ol className={styles.ideaGrid}>
        {items.map((item) => {
          const isMade = made.has(item.key);
          return (
            <IdeaCard
              key={item.key}
              item={item}
              made={isMade}
              foot={<MadeControl item={item} made={isMade} canMark={canMark} pending={pending} onToggle={toggle} />}
            />
          );
        })}
        {after}
      </ol>
    </>
  );
}

export function IdeaRows({ items, canMark, onMark }: { items: readonly IdeaItem[]; canMark: boolean; onMark: OnMark }) {
  const { made, error, pending, toggle } = useMade(items, onMark);
  return (
    <>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {items.map((item) => {
        const isMade = made.has(item.key);
        return (
          <details key={item.key} className={styles.ideaRow}>
            <summary className={styles.ideaSummary}>
              <span className={`${audit.fixIndex} num`} aria-hidden="true">
                {isMade ? <Icon name="check" size={14} /> : item.index}
              </span>
              <span className={styles.ideaSummaryText}>
                <span className={styles.ideaRowTitle}>
                  {isMade ? <span className="visually-hidden">Made: </span> : null}
                  {item.title}
                </span>
                <span className={audit.tags}>
                  {item.format ? <Tag strong>{item.format}</Tag> : null}
                  <Tag>{item.program}</Tag>
                  {item.why ? <span className={styles.ideaRowWhy}>{item.why}</span> : null}
                </span>
              </span>
              <Icon name="chevronDown" size={18} className={styles.ideaChevron} />
            </summary>
            <div className={styles.ideaOpen}>
              <IdeaBody item={item} />
              <div className={styles.ideaFoot}>
                <MadeControl item={item} made={isMade} canMark={canMark} pending={pending} onToggle={toggle} />
              </div>
            </div>
          </details>
        );
      })}
    </>
  );
}
