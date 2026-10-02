// Fix these first (three numbered cards), the rest of the fixes, and what's working.
// Every item opens its check in the detail panel; the long detail lives there.

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ItemPart, ListItem } from '@/audit/view';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { Difficulty, PointsValue, ResultBar } from '@/components/ui/Results';
import { DIFFICULTY_LABELS, type CheckKey } from '@/domain/types';
import { PartResults } from './Parts';
import styles from './audit.module.css';

const href = (basePath: string, item: ListItem) => `${basePath}?check=${item.key}`;

function programNames(parts: readonly ItemPart[]): string | null {
  const names = parts.flatMap((part) => (part.programName ? [part.programName] : []));
  return names.length > 1 ? names.join(', ') : null;
}

/** The top fixes as numbered cards: what's wrong, the points it could add, how hard it is. */
export function FixCards({ items, basePath = '' }: { items: readonly ListItem[]; basePath?: string }) {
  return (
    <ol className={styles.fixGrid}>
      {items.map((item) => {
        const detail = item.parts.find((part) => part.detail)?.detail;
        return (
          <li key={item.rank}>
            <Link href={href(basePath, item)} scroll={false} className={styles.fixCard}>
              <span className={styles.fixTop}>
                <span className={`${styles.fixNumber} num`}>
                  <span className="visually-hidden">Fix </span>
                  {item.rank}
                </span>
                {item.difficulty ? <Difficulty value={item.difficulty} /> : null}
              </span>
              <span className={styles.fixName}>
                <span className={styles.fixTitle}>{item.name}</span>
                <PartResults parts={item.parts} showNames={item.parts.length > 1} />
              </span>
              <span className={styles.fixWrong}>{detail?.finding}</span>
              <span className={styles.fixFoot}>
                <span className={styles.gain}>
                  <Icon name="arrowUp" size={14} />
                  <PointsValue kind="gain" points={item.points} />
                </span>
                <Icon name="arrowRight" size={16} className={styles.chevron} />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function Row({ to, check, rank, name, sub, result, meta }: { to: string; check: CheckKey; rank?: number; name: string; sub?: string | null; result: ReactNode; meta: ReactNode }) {
  return (
    <Link href={to} scroll={false} className={styles.row}>
      <span className={styles.rowName}>
        <span className={styles.rowTitle}>
          <CheckIcon check={check} size={16} />
          {rank ? (
            <span>
              <span className="num">{rank}.</span> {name}
            </span>
          ) : (
            name
          )}
        </span>
        {sub ? <span className={styles.rowSub}>{sub}</span> : null}
      </span>
      <span>{result}</span>
      <span className={styles.rowMeta}>{meta}</span>
      <Icon name="chevronRight" size={16} className={styles.chevron} />
    </Link>
  );
}

function ItemResult({ item }: { item: ListItem }) {
  const [only] = item.parts;
  if (item.parts.length === 1 && only) return <ResultBar result={only.result} points={only.points} max={only.maxPoints} showPoints={false} size="sm" />;
  if (item.strength) return <ResultBar result={item.strength} size="sm" />;
  return <span className={styles.varies}>{item.parts.length} programs</span>;
}

/** Fixes after the top three, as quiet ranked rows. */
export function FixRows({ items }: { items: readonly ListItem[] }) {
  return (
    <div className={styles.rows}>
      {items.map((item) => {
        const names = programNames(item.parts);
        const difficulty = item.difficulty ? `${DIFFICULTY_LABELS[item.difficulty]} to fix` : null;
        return (
          <Row
            key={item.rank}
            to={href('', item)}
            check={item.key}
            rank={item.rank}
            name={item.name}
            sub={[names, difficulty].filter(Boolean).join('. ') || null}
            result={<ItemResult item={item} />}
            meta={<PointsValue kind="gain" points={item.points} />}
          />
        );
      })}
    </div>
  );
}

/** What's working: name, result and the points it earns. */
export function WorkingRows({ items }: { items: readonly ListItem[] }) {
  return (
    <div className={styles.rows}>
      {items.map((item) => (
        <Row
          key={item.rank}
          to={href('', item)}
          check={item.key}
          name={item.name}
          sub={programNames(item.parts)}
          result={<ItemResult item={item} />}
          meta={<PointsValue kind="earned" points={item.points} />}
        />
      ))}
    </div>
  );
}

/** The first few, then the rest folded under "See all". */
export function Folded({ total, noun, shown, rest }: { total: number; noun: string; shown: ReactNode; rest: ReactNode | null }) {
  return (
    <>
      {shown}
      {rest ? (
        <details className={styles.more}>
          <summary className={styles.moreSummary}>
            <span className={styles.moreClosed}>
              See all {total} {noun}
            </span>
            <span className={styles.moreOpen}>Show fewer</span>
            <Icon name="chevronDown" size={16} className={styles.moreIcon} />
          </summary>
          {rest}
        </details>
      ) : null}
    </>
  );
}
