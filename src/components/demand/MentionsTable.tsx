// What students say about you and your rivals (spec 9.4): grouped topics from public posts,
// with counts and sources. You first, then each rival you track. Each topic has a bar for its
// size next to the biggest in the table, and each institution a bar of praise against
// criticism. Never a person.

import { formatCount } from '@/domain/format';
import type { MentionRow } from '@/lib/demand/load';
import { Source } from './Source';
import styles from './demand.module.css';

interface Subject {
  id: string;
  name: string;
  sub: string;
  you: boolean;
}

function Topics({ items, top, empty }: { items: readonly MentionRow[]; top: number; empty: string }) {
  if (items.length === 0) return <p className={styles.note}>{empty}</p>;
  return (
    <ul className={styles.topics}>
      {items.map((item) => (
        <li key={`${item.text}-${item.sourceUrl}`} className={styles.topic}>
          <span className={styles.topicText}>{item.text}</span>
          <span className={styles.topicMeta}>
            <span>
              <span className="num">{formatCount(item.count)}</span> {item.count === 1 ? 'mention' : 'mentions'}
            </span>
            <Source url={item.sourceUrl} />
          </span>
          <span className={styles.share} aria-hidden="true">
            <span className={styles.shareFill} style={{ width: `${Math.max(2, Math.round((item.count / top) * 100))}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Praise against criticism, as one bar split in two, with both counts. */
function Balance({ praise, criticism }: { praise: number; criticism: number }) {
  const total = praise + criticism;
  if (total === 0) return null;
  return (
    <span className={styles.balance}>
      <span className={styles.balanceBar} aria-hidden="true">
        {praise ? <span className={styles.balancePraise} style={{ flexGrow: praise }} /> : null}
        {criticism ? <span className={styles.balanceCriticism} style={{ flexGrow: criticism }} /> : null}
      </span>
      <span className={styles.balanceText}>
        <span className="num">{formatCount(praise)}</span> praise, <span className="num">{formatCount(criticism)}</span> criticism
      </span>
    </span>
  );
}

const sum = (items: readonly MentionRow[]) => items.reduce((total, item) => total + item.count, 0);

export function MentionsTable({ subjects, mentions }: { subjects: readonly Subject[]; mentions: readonly MentionRow[] }) {
  const top = Math.max(1, ...mentions.map((mention) => mention.count));
  return (
    <div className={styles.mentions}>
      <div className={`${styles.mentionRow} ${styles.mentionHead}`} aria-hidden="true">
        <span>Institution</span>
        <span>What students praise</span>
        <span>What students criticise</span>
      </div>
      {subjects.map((subject) => {
        const about = mentions.filter((mention) => mention.institutionId === subject.id);
        const praise = about.filter((mention) => mention.sentiment === 'positive');
        const criticism = about.filter((mention) => mention.sentiment === 'negative');
        return (
          <div key={subject.id} className={[styles.mentionRow, subject.you ? `invert ${styles.mentionYou}` : ''].join(' ')}>
            <span className={styles.who}>
              <span className={styles.whoName}>{subject.you ? 'You' : subject.name}</span>
              <span className={styles.whoSub}>{subject.sub}</span>
              <Balance praise={sum(praise)} criticism={sum(criticism)} />
            </span>
            <div>
              <p className={styles.cellLabel}>What students praise</p>
              <Topics items={praise} top={top} empty="No praise found this month." />
            </div>
            <div>
              <p className={styles.cellLabel}>What students criticise</p>
              <Topics items={criticism} top={top} empty="No criticism found this month." />
            </div>
          </div>
        );
      })}
    </div>
  );
}
