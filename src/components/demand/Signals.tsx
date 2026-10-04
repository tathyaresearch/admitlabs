// The Demand page's signals (spec 9.4), as the version 2 mock was approved: programs rising and
// falling as bars with words (a count only when the keyword tool gives one), courses asked for
// that you do not offer, what students ask about each program (topics, then their questions),
// what gets attention, and the best months to post. Every row says where it was found, and when.
// Server components.

import { Tag } from '@/components/audit/PlaceBits';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Tabs';
import type { AskQuestion, AttentionRow, BestMonthsRow, ProgramAsks, TrendRow } from '@/demand/signals';
import { ATTENTION_LABELS, FORMAT_PLURALS, LANGUAGE_TAGS, type TrendWord } from '@/demand/text';
import { formatCount, formatDate, plural } from '@/domain/format';
import audit from '@/components/audit/places.module.css';
import { Source } from './Source';
import styles from './demand.module.css';

export const TREND_ICONS: Readonly<Record<TrendWord, IconName>> = {
  'Rising fast': 'arrowUp',
  Rising: 'arrowUpRight',
  Steady: 'equal',
  Falling: 'arrowDown',
};

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Where it was found, and when: "Quora, 28 Sep 2026". */
export function Found({ url, platform, at }: { url: string; platform: string | null; at: string }) {
  return (
    <span className={styles.found}>
      <Source url={url} platform={platform ?? undefined} />
      <span>{formatDate(at)}</span>
    </span>
  );
}

export function TrendWordLabel({ word }: { word: TrendWord | null }) {
  if (!word) return null;
  return (
    <span className={styles.trendWord}>
      <Icon name={TREND_ICONS[word]} size={14} />
      {word}
    </span>
  );
}

/** Searches a month, only when the keyword tool counted them (spec 9.5). */
function Searches({ trend }: { trend: Pick<TrendRow, 'searches'> }) {
  if (trend.searches === null) return null;
  return (
    <span>
      About <span className="num">{formatCount(trend.searches)}</span> searches a month
    </span>
  );
}

/** The biggest change on a list of trends, for the bars: every bar on the page measures against the same one. */
export function biggestChange(trends: readonly TrendRow[]): number {
  return Math.max(1, ...trends.map((trend) => Math.abs(trend.changePct ?? 0)));
}

/** Programs rising and falling: the bar is the size of the change against the biggest (`scale`), with its word. */
export function TrendList({ trends, showProgram, showRegion, scale }: { trends: readonly TrendRow[]; showProgram: boolean; showRegion: boolean; scale?: number }) {
  const biggest = scale ?? biggestChange(trends);
  return (
    <ul className={styles.trendList}>
      {trends.map((trend) => (
        <li key={trend.key} className={styles.trendRow}>
          <span className={styles.trendHead}>
            <span className={styles.trendName}>
              {trend.text}
              {showProgram ? <Tag>{trend.programName}</Tag> : null}
              {showRegion ? <Tag>{trend.region}</Tag> : null}
            </span>
            <TrendWordLabel word={trend.word} />
          </span>
          <span className={styles.trendTrack} aria-hidden="true">
            <span className={trend.kind === 'falling' ? styles.trendFillFalling : styles.trendFill} style={{ width: `${Math.max(4, (Math.abs(trend.changePct ?? 0) / biggest) * 100)}%` }} />
          </span>
          <span className={styles.trendMeta}>
            <Searches trend={trend} />
            <Found url={trend.searchesUrl ?? trend.sourceUrl} platform={trend.searchesUrl ? 'keywords' : 'trends'} at={trend.foundAt} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Courses students ask for that you do not offer: rising courses not in your program list. */
export function NotOfferedList({ trends }: { trends: readonly TrendRow[] }) {
  return (
    <ul className={styles.plainRows}>
      {trends.map((trend) => (
        <li key={trend.key} className={styles.plainRow}>
          <span className={styles.trendHead}>
            <span className={styles.trendName}>{trend.text}</span>
            <TrendWordLabel word={trend.word} />
          </span>
          <span className={styles.trendMeta}>
            <span>Near your {trend.programName}</span>
            <Searches trend={trend} />
            <Found url={trend.sourceUrl} platform="trends" at={trend.foundAt} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Question({ question }: { question: AskQuestion }) {
  const tag = LANGUAGE_TAGS[question.language];
  return (
    <li className={styles.question}>
      <span className={styles.questionText}>“{question.text}”</span>
      <span className={styles.trendMeta}>
        {tag ? <span>{tag}</span> : null}
        {question.count !== null ? <span>Asked about {plural(question.count, 'time', 'times')}</span> : null}
        <Found url={question.sourceUrl} platform={question.platform} at={question.foundAt} />
      </span>
    </li>
  );
}

function ProgramAskList({ asks }: { asks: ProgramAsks }) {
  return (
    <div className={styles.asks}>
      {asks.topics.length ? (
        <ul className={styles.askList}>
          {asks.topics.map((topic) => (
            <li key={topic.topic} className={styles.askRow}>
              <span className={styles.askHead}>
                <span className={styles.askName}>{topic.label}</span>
                <span className={styles.askBar} aria-hidden="true">
                  <span style={{ width: `${Math.max(2, topic.share * 100)}%` }} />
                </span>
                <span className={styles.askShare}>
                  <span className="num">{Math.round(topic.share * 100)}%</span>
                  <span className="visually-hidden"> of questions,</span>
                  <span className={styles.askCount}>
                    <span className="num">{formatCount(topic.count)}</span> asked
                  </span>
                </span>
              </span>
              <ul className={styles.questions}>
                {topic.questions.map((question) => (
                  <Question key={question.key} question={question} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
      {asks.other.length ? (
        <div className={styles.otherQuestions}>
          <p className={audit.columnTitle}>Other questions</p>
          <ul className={styles.questions}>
            {asks.other.map((question) => (
              <Question key={question.key} question={question} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** What students ask about each program: a tab each when there are several. */
export function AsksByProgram({ asks, showRegion }: { asks: readonly ProgramAsks[]; showRegion: boolean }) {
  const note = (entry: ProgramAsks) => (
    <p className={audit.quiet}>
      {plural(entry.asked, 'question', 'questions')} counted{showRegion ? ` in ${entry.region}` : ''}, by topic. The share is of all of them.
    </p>
  );
  if (asks.length === 1) {
    const [only] = asks;
    return only ? (
      <div className={audit.card}>
        {note(only)}
        <ProgramAskList asks={only} />
      </div>
    ) : null;
  }
  return (
    <div className={audit.card}>
      <Tabs
        label="Programs"
        items={asks.map((entry) => ({
          id: entry.programKey,
          label: entry.programName,
          content: (
            <div className={styles.tabBody}>
              {note(entry)}
              <ProgramAskList asks={entry} />
            </div>
          ),
        }))}
      />
    </div>
  );
}

/** Topics and formats that get attention, among institutions like this one: in words, never a made up number. */
export function AttentionList({ rows, showProgram }: { rows: readonly AttentionRow[]; showProgram: boolean }) {
  return (
    <ul className={styles.plainRows}>
      {rows.map((row) => (
        <li key={row.key} className={styles.plainRow}>
          <span className={styles.trendHead}>
            <span className={styles.trendName}>
              {row.text}
              {row.format ? <Tag>{FORMAT_PLURALS[row.format]}</Tag> : null}
            </span>
            <span className={styles.level} data-level={row.level}>
              {ATTENTION_LABELS[row.level]}
            </span>
          </span>
          <span className={styles.trendMeta}>
            {showProgram ? <span>{row.programs.join(', ')}</span> : null}
            <Found url={row.sourceUrl} platform={row.platform} at={row.foundAt} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The best months to post: the twelve months in one strip for each program, the best ones dark and named. */
export function BestMonths({ rows }: { rows: readonly BestMonthsRow[] }) {
  return (
    <ul className={styles.monthList}>
      {rows.map((row) => (
        <li key={row.programName} className={styles.monthRow}>
          <span className={styles.monthProgram}>
            <span>{row.programName}</span>
            <span className={styles.monthText}>{row.text}</span>
          </span>
          <span className={styles.monthStrip} aria-hidden="true">
            {MONTH_LETTERS.map((letter, index) => (
              <span key={MONTH_NAMES[index]} className={[styles.monthCell, row.months.includes(index + 1) ? styles.monthBest : ''].join(' ')}>
                {letter}
              </span>
            ))}
          </span>
          <span className={styles.trendMeta}>
            <Found url={row.sourceUrl} platform="trends" at={row.foundAt} />
          </span>
        </li>
      ))}
    </ul>
  );
}
