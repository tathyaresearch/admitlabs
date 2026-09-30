// "3 things to do this month" on Home (Paid and Client): numbered cards like "Fix these first",
// built the same way as the report's: the biggest Audit fix, the top Rivals lesson on another
// check, and the top content idea from Demand. Each opens where it came from.

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { THING_SOURCE_LABELS, type Thing } from '@/report/things';
import audit from '@/components/audit/audit.module.css';
import styles from './report.module.css';

function target(thing: Thing): { href: string; label: string } {
  switch (thing.source) {
    case 'audit':
      return { href: `/audit?check=${thing.checkKey}`, label: 'Open in your Audit' };
    case 'rivals':
      return thing.rivalId ? { href: `/rivals/${thing.rivalId}`, label: 'See the rival' } : { href: '/rivals', label: 'Open Rivals' };
    default:
      return { href: '/demand', label: 'Open Demand' };
  }
}

export function MonthThings({ things }: { things: readonly Thing[] }) {
  return (
    <ol className={audit.fixGrid}>
      {things.map((thing, index) => {
        const link = target(thing);
        return (
          <li key={`${thing.source}-${index}`}>
            <Link href={link.href} className={audit.fixCard}>
              <span className={audit.fixTop}>
                <span className={audit.fixNumber}>
                  <span className="visually-hidden">Thing to do </span>
                  {index + 1}
                </span>
                <span className={styles.thingSource}>{THING_SOURCE_LABELS[thing.source]}</span>
              </span>
              <span className={audit.fixName}>
                <span className={audit.fixTitle}>{thing.title}</span>
              </span>
              <span className={styles.thingDetail}>{thing.detail}</span>
              <span className={audit.fixFoot}>
                <span className={audit.gain}>{link.label}</span>
                <Icon name="arrowRight" size={16} className={audit.chevron} />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
