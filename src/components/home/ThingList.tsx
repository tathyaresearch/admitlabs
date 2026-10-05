// Home's things to do as a list (spec section 13): each says where it comes from, its place and
// check (or the rival, or the format and program) as a small label, its title, its impact (or how
// often students asked), its effort and programs. Shared: Home adds the actions to each row
// (./HomeThings.tsx); the product page shows the list as a picture, with none.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ImpactTags } from '@/components/audit/PlaceBits';
import type { Difficulty, Impact } from '@/domain/types';
import { THING_SOURCE_LABELS, type ThingSource } from '@/report/things';
import audit from '@/components/audit/places.module.css';
import styles from './today.module.css';

export interface HomeThing {
  key: string;
  source: ThingSource;
  title: string;
  label: string;
  /** Where it opens; null in a picture (the product page). */
  href: string | null;
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

export function ThingList({ items, actions }: { items: readonly HomeThing[]; actions?: (item: HomeThing) => ReactNode }) {
  return (
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
            {item.href ? (
              <Link href={item.href} className={styles.thingTitle}>
                {item.title}
              </Link>
            ) : (
              <span className={styles.thingTitle}>{item.title}</span>
            )}
            <span className={audit.tags}>
              {item.weight ? <span className={audit.asked}>{item.weight}</span> : null}
              <ImpactTags impact={item.impact} effort={item.effort} programs={item.programs} />
            </span>
          </span>
          {actions ? <span className={audit.fixActions}>{actions(item)}</span> : null}
        </li>
      ))}
    </ol>
  );
}
