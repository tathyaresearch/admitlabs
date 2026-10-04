// What students ask, in three tabs so the page stays short (spec 9.4): the top questions this
// month, the worries (the usual five, plus anything new), and the courses and careers rising
// and falling. Every row shows how often and where it was found, with a bar for its size next to
// the biggest. Rising and falling share one list: each change is a bar from the middle, right
// for up and left for down. Grouped, never a person.

import { Folded } from '@/components/audit/Lists';
import { Change } from '@/components/ui/Results';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { DEMAND_RULES } from '@/config/demand';
import { countWords, LANGUAGE_TAGS } from '@/demand/text';
import type { DemandRow, DemandView, WorryRow } from '@/demand/view';
import { joinNames } from '@/domain/format';
import { Source } from './Source';
import styles from './demand.module.css';

/** A thin bar under a row: its count next to the biggest in the list. The count is written beside it. */
function Share({ count, top }: { count: number; top: number }) {
  return (
    <span className={styles.share} aria-hidden="true">
      <span className={styles.shareFill} style={{ width: `${Math.max(2, Math.round((count / Math.max(1, top)) * 100))}%` }} />
    </span>
  );
}

function QuestionItems({ items, start, top, showProgram }: { items: readonly DemandRow[]; start: number; top: number; showProgram: boolean }) {
  return (
    <ol className={styles.list} start={start}>
      {items.map((item, index) => {
        const tag = LANGUAGE_TAGS[item.language];
        return (
          <li key={item.id} className={styles.item}>
            <span className={`${styles.itemRank} num`}>{start + index}</span>
            <span className={styles.itemBody}>
              <span className={styles.itemText}>{item.text}</span>
              <span className={styles.itemMeta}>
                {showProgram ? <span>{item.programName}</span> : null}
                <span>{countWords('question', item.count)}</span>
                {tag ? <span className={styles.tag}>{tag}</span> : null}
              </span>
              <Share count={item.count ?? 0} top={top} />
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
          <span className={`${styles.itemRank} num`}>{index + 1}</span>
          <span className={styles.itemBody}>
            <span className={styles.itemText}>{item.text}</span>
            <span className={styles.itemMeta}>
              {item.isNew ? <span className={`${styles.tag} ${styles.tagSolid}`}>New this month</span> : null}
              <span>{countWords('worry', item.count)}</span>
              {showProgram ? <span>{joinNames(item.programs)}</span> : null}
            </span>
            <Share count={item.count} top={top} />
          </span>
          <Source url={item.sourceUrl} />
        </li>
      ))}
    </ol>
  );
}

/** Rising then falling, biggest rise first and biggest fall last: each change a bar from the middle. */
function TrendBars({ rising, falling, showProgram }: { rising: readonly DemandRow[]; falling: readonly DemandRow[]; showProgram: boolean }) {
  const rows = [...rising, ...[...falling].reverse()];
  if (rows.length === 0) return <p className={styles.note}>Nothing is rising or falling this month.</p>;
  const widest = Math.max(1, ...rows.map((row) => Math.abs(row.changePct ?? 0)));
  return (
    <div>
      <p className={`${styles.divergeItem} ${styles.divergeHead}`} aria-hidden="true">
        <span />
        <span className={styles.divergeHeadBar}>
          <span>Falling</span>
          <span>Rising</span>
        </span>
      </p>
      <ol className={styles.list}>
        {rows.map((item) => {
          const change = Math.round(item.changePct ?? 0);
          const width = `${Math.max(3, Math.round((Math.abs(change) / widest) * 100))}%`;
          return (
            <li key={item.id} className={`${styles.item} ${styles.divergeItem}`}>
              <span className={styles.itemBody}>
                <span className={styles.itemText}>{item.text}</span>
                <span className={styles.itemMeta}>
                  <span>{countWords(item.kind, item.count)}</span>
                  {showProgram ? <span>{item.programName}</span> : null}
                </span>
              </span>
              <span className={styles.divergeBar} aria-hidden="true">
                <span className={styles.divergeSide}>{change < 0 ? <span className={styles.divergeFill} style={{ width }} /> : null}</span>
                <span className={styles.divergeSide}>{change > 0 ? <span className={styles.divergeFill} style={{ width }} /> : null}</span>
              </span>
              <span className={styles.divergeValue}>{item.changePct === null ? 'New' : <Change value={item.changePct} unit="%" />}</span>
              <Source url={item.sourceUrl} platform={item.meta.platform} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Questions, worries and trends, one tab each. `more` adds tabs after them (the mentions). */
export function AskTabs({ view, showProgram, more = [] }: { view: DemandView; showProgram: boolean; more?: readonly TabItem[] }) {
  const shown = DEMAND_RULES.topQuestions;
  const top = Math.max(1, ...view.questions.map((question) => question.count ?? 0));
  const rising = view.rising.slice(0, DEMAND_RULES.trendsShown);
  const falling = view.falling.slice(0, DEMAND_RULES.trendsShown);
  return (
    <Tabs
      label="What students ask"
      items={[
        {
          id: 'questions',
          label: 'Top questions',
          count: view.questions.length,
          content: view.questions.length ? (
            <Folded
              total={view.questions.length}
              noun="questions"
              shown={<QuestionItems items={view.questions.slice(0, shown)} start={1} top={top} showProgram={showProgram} />}
              rest={view.questions.length > shown ? <QuestionItems items={view.questions.slice(shown)} start={shown + 1} top={top} showProgram={showProgram} /> : null}
            />
          ) : (
            <p className={styles.note}>No questions found this month.</p>
          ),
        },
        {
          id: 'worries',
          label: 'Worries',
          count: view.worries.length,
          content: view.worries.length ? <WorryItems items={view.worries} showProgram={showProgram} /> : <p className={styles.note}>No worries found this month.</p>,
        },
        {
          id: 'trends',
          label: 'Rising and falling',
          count: rising.length + falling.length,
          content: <TrendBars rising={rising} falling={falling} showProgram={showProgram} />,
        },
        ...more,
      ]}
    />
  );
}
