// What's working and what to fix (spec 7.6). Each item links to its check detail. Long lists
// show the first few and fold the rest under "Show all", so the page stays calm.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { pointsToGainText, pointsWorthText, type ListItem } from '@/audit/view';
import { Icon } from '@/components/ui/Icon';
import { Difficulty } from '@/components/ui/Results';
import { PartResults, WasMarker } from './Parts';
import styles from './audit.module.css';

const detailHref = (item: ListItem) => `?check=${item.key}`;

function ItemHead({ item }: { item: ListItem }) {
  const grouped = item.parts.some((part) => part.programId !== null) && item.parts.length > 1;
  const single = item.parts.length === 1 ? item.parts[0] : undefined;
  return (
    <>
      <div className={styles.itemHead}>
        <Link href={detailHref(item)} scroll={false} className={styles.itemName}>
          {item.name}
        </Link>
        {!grouped ? <PartResults parts={item.parts} showNames={false} /> : null}
      </div>
      {grouped ? <PartResults parts={item.parts} showNames /> : null}
      {single ? <WasMarker part={single} long /> : null}
    </>
  );
}

function WorkingItem({ item }: { item: ListItem }) {
  const finding = item.parts.find((part) => part.detail)?.detail?.finding;
  return (
    <li className={styles.item}>
      <span className={styles.rank} aria-hidden="true">
        {item.rank}
      </span>
      <div className={styles.itemBody}>
        <ItemHead item={item} />
        {finding ? <p className={styles.itemText}>{finding}</p> : null}
        <div className={styles.itemFoot}>
          <span className={styles.earned}>{pointsWorthText(item.points)}</span>
        </div>
      </div>
    </li>
  );
}

function FixItem({ item }: { item: ListItem }) {
  const detail = item.parts.find((part) => part.detail)?.detail;
  return (
    <li className={styles.item}>
      <span className={styles.rank} aria-hidden="true">
        {item.rank}
      </span>
      <div className={styles.itemBody}>
        <ItemHead item={item} />
        {detail ? <p className={styles.itemText}>{detail.finding}</p> : null}
        {detail?.whyItMatters ? <p className={styles.itemWhy}>{detail.whyItMatters}</p> : null}
        <div className={styles.itemFoot}>
          <span className={styles.gain}>
            <Icon name="arrowUp" size={14} />
            {pointsToGainText(item.points)}
          </span>
          {item.difficulty ? <Difficulty value={item.difficulty} /> : null}
          <Link href={detailHref(item)} scroll={false} className={styles.detailLink}>
            {detail ? 'How to fix it' : 'See the check'}
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </div>
    </li>
  );
}

function Folded({ items, render, noun }: { items: readonly ListItem[]; render: (item: ListItem) => ReactNode; noun: string }) {
  const SHOWN = 5;
  if (items.length <= SHOWN + 1) return <ol className={styles.list}>{items.map(render)}</ol>;
  return (
    <div className={styles.list}>
      <ol className={styles.list}>{items.slice(0, SHOWN).map(render)}</ol>
      <details className={styles.more}>
        <summary className={styles.moreSummary}>
          <span className={styles.moreClosed}>
            Show all {items.length} {noun}
          </span>
          <span className={styles.moreOpen}>Show fewer</span>
          <Icon name="chevronDown" size={16} className={styles.moreIcon} />
        </summary>
        <ol className={styles.list} start={SHOWN + 1}>
          {items.slice(SHOWN).map(render)}
        </ol>
      </details>
    </div>
  );
}

/** The top fixes on Home: name, where it applies, the points it could add and how hard it is. */
export function CompactFixList({ items, basePath = '/audit' }: { items: readonly ListItem[]; basePath?: string }) {
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.rank} className={styles.item}>
          <span className={styles.rank} aria-hidden="true">
            {item.rank}
          </span>
          <div className={styles.itemBody}>
            <div className={styles.itemHead}>
              <Link href={`${basePath}?check=${item.key}`} className={styles.itemName}>
                {item.name}
              </Link>
              {item.parts.length === 1 ? <PartResults parts={item.parts} showNames={false} /> : null}
            </div>
            {item.parts.length > 1 ? <PartResults parts={item.parts} showNames /> : null}
            <div className={styles.itemFoot}>
              <span className={styles.gain}>
                <Icon name="arrowUp" size={14} />
                {pointsToGainText(item.points)}
              </span>
              {item.difficulty ? <Difficulty value={item.difficulty} /> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WorkingList({ items }: { items: readonly ListItem[] }) {
  return <Folded items={items} noun="strengths" render={(item) => <WorkingItem key={item.rank} item={item} />} />;
}

export function FixList({ items }: { items: readonly ListItem[] }) {
  return <Folded items={items} noun="fixes" render={(item) => <FixItem key={item.rank} item={item} />} />;
}
