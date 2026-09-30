// The Rivals 3 things to do: numbered cards, like "Fix these first". Each one is learned from
// a rival and never copies one. A card about one of your checks opens it on your Audit page;
// the others open the rival they came from.

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { getCheck } from '@/domain/checks';
import { PILLAR_LABELS } from '@/domain/types';
import type { ActionRow } from '@/lib/rivals/load';
import audit from '@/components/audit/audit.module.css';
import styles from './rivals.module.css';

export function ThingsToDo({ items, rivalNames }: { items: readonly ActionRow[]; rivalNames: ReadonlyMap<string, string> }) {
  return (
    <ol className={audit.fixGrid}>
      {items.map((item) => {
        const rival = item.rivalId ? rivalNames.get(item.rivalId) : undefined;
        const href = item.checkKey ? `/audit?check=${item.checkKey}` : rival && item.rivalId ? `/rivals/${item.rivalId}` : '/rivals';
        const source = item.checkKey ? PILLAR_LABELS[getCheck(item.checkKey).pillar] : 'From their activity';
        return (
          <li key={item.rank}>
            <Link href={href} className={audit.fixCard}>
              <span className={audit.fixTop}>
                <span className={audit.fixNumber}>
                  <span className="visually-hidden">Thing to do </span>
                  {item.rank}
                </span>
                <span className={styles.thingSource}>{source}</span>
              </span>
              <span className={audit.fixName}>
                <span className={audit.fixTitle}>{item.text}</span>
              </span>
              <span className={styles.thingDetail}>{item.detail}</span>
              <span className={audit.fixFoot}>
                <span className={audit.gain}>{rival ? `Learned from ${rival}` : 'Learned from your rivals'}</span>
                <Icon name="arrowRight" size={16} className={audit.chevron} />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
