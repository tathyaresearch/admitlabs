'use client';

// Home's things to do (spec section 13), as the version 2 mock was approved: "Do these 3 things
// this month" (Paid and Client: a fix from the Audit, a lesson from rivals and one of Make these
// 3, by impact) or "Fix these first" (Free: the top 3 fixes). Each says where it comes from, its
// place and check (or the rival, or the format and program) as a small label, its impact (or how
// often students asked), its effort and programs (./ThingList.tsx); then Mark as done (Mark as
// made for an idea) and, on a fix for Free and Paid, Let AdmitLabs fix this. Everyone else sees
// what was done.

import { useOptimistic, useState, useTransition } from 'react';
import { FixActions, type FixActionHandlers, type FixActionState } from '@/components/audit/FixActions';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import audit from '@/components/audit/places.module.css';
import { ThingList, type HomeThing } from './ThingList';
import styles from './today.module.css';

export type { HomeThing } from './ThingList';

interface ThingMark {
  check: null;
  thing: string;
  month: string;
  done: boolean;
}

/** Mark as done for a lesson, Mark as made for an idea: kept with its month. */
function MarkThing({ item, canMark, onMark }: { item: HomeThing; canMark: boolean; onMark: (input: ThingMark) => Promise<{ ok: boolean; error: string | null }> }) {
  const [done, setDone] = useOptimistic(item.done, (_current: boolean, next: boolean) => next);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idea = item.source === 'demand';
  const toggle = (next: boolean) =>
    startTransition(async () => {
      if (!item.mark) return;
      setDone(next);
      const result = await onMark({ check: null, thing: item.mark.thing, month: item.mark.month, done: next });
      setError(result.ok ? null : result.error);
    });
  if (!item.mark) return null;
  if (!canMark) {
    return done ? (
      <span className={styles.doneWord}>
        <Icon name="checkCircle" size={16} />
        {idea ? 'Marked as made' : 'Marked done'}
      </span>
    ) : null;
  }
  return (
    <>
      {done ? (
        <span className={styles.doneWord}>
          <Icon name="checkCircle" size={16} />
          {idea ? 'Made' : 'Done'}
          <button type="button" className={audit.linkButton} onClick={() => toggle(false)} disabled={pending}>
            Undo
          </button>
        </span>
      ) : (
        <Button variant="secondary" size="sm" icon="check" onClick={() => toggle(true)} disabled={pending}>
          {idea ? 'Mark as made' : 'Mark as done'}
        </Button>
      )}
      {error ? (
        <span className={styles.markError} role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}

export function HomeThings({
  id,
  title,
  help,
  items,
  fixState,
  fixHandlers,
  onMarkThing,
  empty,
}: {
  id: string;
  title: string;
  help: string;
  items: readonly HomeThing[];
  fixState: FixActionState;
  fixHandlers: FixActionHandlers;
  onMarkThing: (input: ThingMark) => Promise<{ ok: boolean; error: string | null }>;
  empty: string;
}) {
  return (
    <section className={audit.block} aria-labelledby={`${id}-title`}>
      <div className={audit.sectionHead}>
        <div className={audit.sectionText}>
          <h2 id={`${id}-title`} className={audit.sectionTitle}>
            <Icon name="check" size={18} className={audit.sectionIcon} />
            {title}
          </h2>
          <p className={audit.sectionHelp}>{help}</p>
        </div>
      </div>
      {items.length ? (
        <ThingList
          items={items}
          actions={(item) =>
            item.fixId ? (
              <FixActions fix={{ id: item.fixId, title: item.title }} state={fixState} handlers={fixHandlers} />
            ) : (
              <MarkThing item={item} canMark={fixState.canMark} onMark={onMarkThing} />
            )
          }
        />
      ) : (
        <p className={audit.quiet}>{empty}</p>
      )}
    </section>
  );
}
