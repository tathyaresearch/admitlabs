'use client';

// Home's things to do (spec section 13), as the version 2 mock was approved: "Do these 3 things
// this month" (Paid and Client: a fix from the Audit, a lesson from rivals and one of Make these
// 3, by impact) or "Fix these first" (Free: the top 3 fixes). Each says where it comes from, its
// place and check (or the rival, or the format and program) as a small label, its impact (or how
// often students asked), its effort and programs; then Mark as done (Mark as made for an idea)
// and, on a fix for Free and Paid, Let AdmitLabs fix this. Everyone else sees what was done.

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { ImpactTags } from '@/components/audit/PlaceBits';
import { FixActions, type FixActionHandlers, type FixActionState } from '@/components/audit/FixActions';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { Difficulty, Impact } from '@/domain/types';
import { THING_SOURCE_LABELS, type ThingSource } from '@/report/things';
import audit from '@/components/audit/places.module.css';
import styles from './today.module.css';

export interface HomeThing {
  key: string;
  source: ThingSource;
  title: string;
  label: string;
  href: string;
  impact: Impact | null;
  effort: Difficulty | null;
  programs: readonly string[];
  /** For an idea: how often its question was asked, said instead of an impact. */
  weight: string | null;
  /** A fix: marked and asked about by its id. */
  fixId: string | null;
  /** A lesson or an idea: what Mark as done saves. */
  mark: { thing: string; month: string } | null;
  /** A lesson or an idea marked done. A fix's mark is in the fix state. */
  done: boolean;
}

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
        <ol className={[audit.card, audit.fixes, styles.things].join(' ')}>
          {items.map((item, index) => (
            <li key={item.key} className={audit.fixRow}>
              <span className={`${audit.fixIndex} num`} aria-hidden="true">
                {index + 1}
              </span>
              <span className={audit.fixBody}>
                <span className={audit.fixLabel}>
                  <span className={styles.thingSource}>{THING_SOURCE_LABELS[item.source]}</span>
                  <span>{item.label}</span>
                </span>
                <Link href={item.href} className={styles.thingTitle}>
                  {item.title}
                </Link>
                <span className={audit.tags}>
                  {item.weight ? <span className={audit.asked}>{item.weight}</span> : null}
                  <ImpactTags impact={item.impact} effort={item.effort} programs={item.programs} />
                </span>
              </span>
              <span className={audit.fixActions}>
                {item.fixId ? (
                  <FixActions fix={{ id: item.fixId, title: item.title }} state={fixState} handlers={fixHandlers} />
                ) : (
                  <MarkThing item={item} canMark={fixState.canMark} onMark={onMarkThing} />
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={audit.quiet}>{empty}</p>
      )}
    </section>
  );
}
