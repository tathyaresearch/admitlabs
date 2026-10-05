// One of Make these 3 as a card (spec 9.4): what to make, why, the program, the format, a hook
// line, the key points and where the question was asked. Shared: Demand adds Mark as made under
// it (./IdeaCards.tsx); the product page shows it as a picture, with nothing under it.

import type { ReactNode } from 'react';
import { Tag } from '@/components/audit/PlaceBits';
import { Icon } from '@/components/ui/Icon';
import audit from '@/components/audit/places.module.css';
import styles from './demand.module.css';

export interface IdeaItem {
  /** What a mark of it is about: '2026-09:<brief>'. */
  key: string;
  /** Its place in the list, from 1. */
  index: number;
  title: string;
  why: string;
  hook: string;
  points: readonly string[];
  /** "Reel", "Post". */
  format: string | null;
  program: string;
  /** Where the question was asked, with its date: a link the server built. */
  source: ReactNode;
  /** What Mark as made saves. */
  mark: { thing: string; month: string };
  made: boolean;
}

/** The hook, the key points and where the question was asked. */
export function IdeaBody({ item }: { item: IdeaItem }) {
  return (
    <>
      {item.hook ? (
        <p className={styles.ideaHook}>
          <span className={styles.ideaLabel}>Hook</span>
          {item.hook}
        </p>
      ) : null}
      {item.points.length ? (
        <div>
          <p className={styles.ideaLabel}>Key points</p>
          <ul className={styles.ideaPoints}>
            {item.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className={styles.ideaSource}>{item.source}</div>
    </>
  );
}

export function IdeaCard({ item, made, foot }: { item: IdeaItem; made: boolean; foot?: ReactNode }) {
  return (
    <li className={[audit.card, styles.ideaCard].join(' ')} data-made={made ? 'true' : undefined}>
      <p className={styles.ideaTop}>
        <span className={`${audit.fixIndex} num`} aria-hidden="true">
          {made ? <Icon name="check" size={14} /> : item.index}
        </span>
        {item.format ? <Tag strong>{item.format}</Tag> : null}
        <Tag>{item.program}</Tag>
      </p>
      <h3 className={styles.ideaTitle}>
        {made ? <span className="visually-hidden">Made: </span> : null}
        {item.title}
      </h3>
      {item.why ? <p className={styles.ideaWhy}>{item.why}</p> : null}
      <IdeaBody item={item} />
      {foot ? <div className={styles.ideaFoot}>{foot}</div> : null}
    </li>
  );
}
