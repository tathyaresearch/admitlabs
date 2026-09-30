// What students say about you and your rivals (spec 9.4): grouped topics from public posts,
// with counts and sources. You first, then each rival you track. Never a person.

import { countWords } from '@/demand/text';
import type { MentionRow } from '@/lib/demand/load';
import { Source } from './Source';
import styles from './demand.module.css';

interface Subject {
  id: string;
  name: string;
  sub: string;
  you: boolean;
}

function Topics({ items, empty }: { items: readonly MentionRow[]; empty: string }) {
  if (items.length === 0) return <p className={styles.note}>{empty}</p>;
  return (
    <ul className={styles.topics}>
      {items.map((item) => (
        <li key={`${item.text}-${item.sourceUrl}`} className={styles.topic}>
          <span className={styles.topicText}>{item.text}</span>
          <span className={styles.topicMeta}>
            <span>{countWords('mention', item.count)}</span>
            <Source url={item.sourceUrl} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MentionsTable({ subjects, mentions }: { subjects: readonly Subject[]; mentions: readonly MentionRow[] }) {
  return (
    <div className={styles.mentions}>
      <div className={`${styles.mentionRow} ${styles.mentionHead}`} aria-hidden="true">
        <span>Institution</span>
        <span>What students praise</span>
        <span>What students criticise</span>
      </div>
      {subjects.map((subject) => {
        const about = mentions.filter((mention) => mention.institutionId === subject.id);
        return (
          <div key={subject.id} className={[styles.mentionRow, subject.you ? `invert ${styles.mentionYou}` : ''].join(' ')}>
            <span className={styles.who}>
              <span className={styles.whoName}>{subject.you ? 'You' : subject.name}</span>
              <span className={styles.whoSub}>{subject.sub}</span>
            </span>
            <div>
              <p className={styles.cellLabel}>What students praise</p>
              <Topics items={about.filter((mention) => mention.sentiment === 'positive')} empty="No praise found this month." />
            </div>
            <div>
              <p className={styles.cellLabel}>What students criticise</p>
              <Topics items={about.filter((mention) => mention.sentiment === 'negative')} empty="No criticism found this month." />
            </div>
          </div>
        );
      })}
    </div>
  );
}
