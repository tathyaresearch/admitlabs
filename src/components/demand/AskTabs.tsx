// What students ask, in three tabs so the page stays short (spec 9.4): the top questions this
// month, the worries (the usual five, plus anything new), and the courses and careers rising
// and falling. Every row shows how often and where it was found. Grouped, never a person.

import { Folded } from '@/components/audit/Lists';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Tabs';
import { DEMAND_RULES } from '@/config/demand';
import { changeWords, countWords, LANGUAGE_TAGS } from '@/demand/text';
import type { DemandRow, DemandView, WorryRow } from '@/demand/view';
import { joinNames } from '@/domain/format';
import { Source } from './Source';
import styles from './demand.module.css';

function QuestionItems({ items, start, showProgram }: { items: readonly DemandRow[]; start: number; showProgram: boolean }) {
  return (
    <ol className={styles.list} start={start}>
      {items.map((item, index) => {
        const tag = LANGUAGE_TAGS[item.language];
        return (
          <li key={item.id} className={styles.item}>
            <span className={styles.itemRank}>{start + index}</span>
            <span className={styles.itemBody}>
              <span className={styles.itemText}>{item.text}</span>
              <span className={styles.itemMeta}>
                {showProgram ? <span>{item.programName}</span> : null}
                <span>{countWords('question', item.count)}</span>
                {tag ? <span className={styles.tag}>{tag}</span> : null}
              </span>
            </span>
            <Source url={item.sourceUrl} platform={item.meta.platform} />
          </li>
        );
      })}
    </ol>
  );
}

function WorryItems({ items, showProgram }: { items: readonly WorryRow[]; showProgram: boolean }) {
  const top = Math.max(1, ...items.map((item) => item.count));
  return (
    <ol className={styles.list}>
      {items.map((item, index) => (
        <li key={item.key} className={styles.item}>
          <span className={styles.itemRank}>{index + 1}</span>
          <span className={styles.itemBody}>
            <span className={styles.itemText}>{item.text}</span>
            <span className={styles.itemMeta}>
              {item.isNew ? <span className={`${styles.tag} ${styles.tagSolid}`}>New this month</span> : null}
              <span>{countWords('worry', item.count)}</span>
              {showProgram ? <span>{joinNames(item.programs)}</span> : null}
            </span>
            <span className={styles.share} aria-hidden="true">
              <span className={styles.shareFill} style={{ width: `${Math.round((item.count / top) * 100)}%` }} />
            </span>
          </span>
          <Source url={item.sourceUrl} />
        </li>
      ))}
    </ol>
  );
}

function TrendItems({ items, showProgram }: { items: readonly DemandRow[]; showProgram: boolean }) {
  if (items.length === 0) return <p className={styles.note}>Nothing this month.</p>;
  return (
    <ol className={styles.list}>
      {items.map((item, index) => (
        <li key={item.id} className={styles.item}>
          <span className={styles.itemRank}>{index + 1}</span>
          <span className={styles.itemBody}>
            <span className={styles.itemText}>{item.text}</span>
            <span className={styles.itemMeta}>
              <span className={styles.change}>
                <Icon name={(item.changePct ?? 0) >= 0 ? 'arrowUp' : 'arrowDown'} size={14} />
                {changeWords(item.changePct)}
              </span>
              <span>{countWords(item.kind, item.count)}</span>
              {showProgram ? <span>{item.programName}</span> : null}
            </span>
          </span>
          <Source url={item.sourceUrl} platform={item.meta.platform} />
        </li>
      ))}
    </ol>
  );
}

export function AskTabs({ view, showProgram }: { view: DemandView; showProgram: boolean }) {
  const shown = DEMAND_RULES.topQuestions;
  const rising = view.rising.slice(0, DEMAND_RULES.trendsShown);
  const falling = view.falling.slice(0, DEMAND_RULES.trendsShown);
  return (
    <Tabs
      label="What students ask"
      items={[
        {
          id: 'questions',
          label: `Top questions (${Math.min(shown, view.questions.length)})`,
          content: view.questions.length ? (
            <Folded
              total={view.questions.length}
              noun="questions"
              shown={<QuestionItems items={view.questions.slice(0, shown)} start={1} showProgram={showProgram} />}
              rest={view.questions.length > shown ? <QuestionItems items={view.questions.slice(shown)} start={shown + 1} showProgram={showProgram} /> : null}
            />
          ) : (
            <p className={styles.note}>No questions found this month.</p>
          ),
        },
        {
          id: 'worries',
          label: `Worries (${view.worries.length})`,
          content: view.worries.length ? <WorryItems items={view.worries} showProgram={showProgram} /> : <p className={styles.note}>No worries found this month.</p>,
        },
        {
          id: 'trends',
          label: `Rising and falling (${rising.length + falling.length})`,
          content: (
            <div className={styles.trendColumns}>
              <div>
                <p className={styles.columnTitle}>Rising</p>
                <TrendItems items={rising} showProgram={showProgram} />
              </div>
              <div>
                <p className={styles.columnTitle}>Falling</p>
                <TrendItems items={falling} showProgram={showProgram} />
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
