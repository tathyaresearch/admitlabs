// Progress month by month (spec 7.8), Paid and Client: each month's score, small, with the three
// words (Visibility, Trust and Chosen), the change since the month before, your place among your
// rivals, and the checks that moved since the month before. Newest first; on a phone, one card per month. Every Audit sits folded
// below, extra refreshes included.

import type { ProgressMonth } from '@/audit/progress';
import type { HistoryRow, MovedCheck } from '@/audit/view';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { Change, ResultBar } from '@/components/ui/Results';
import { formatDate, formatMonth, joinNames, ordinal } from '@/domain/format';
import { scoreLabel as wordFor } from '@/domain/scores';
import { PILLAR_LABELS, PILLARS, RESULTS } from '@/domain/types';
import styles from './audit.module.css';

export type HistoryEntry = HistoryRow & { trigger: string };

const HOW: Readonly<Record<string, string>> = {
  signup: 'First Audit',
  scheduled: 'Scheduled',
  manual: 'Extra refresh',
};

/** Lines shown in a month's "What moved" before "and 2 more". */
const MOVED_SHOWN = 3;

const up = (line: MovedCheck) => RESULTS.indexOf(line.to) < RESULTS.indexOf(line.from);

function Moved({ moved, first }: { moved: readonly MovedCheck[]; first: boolean }) {
  if (first) return <span className={styles.progressQuiet}>Your first Audit</span>;
  if (!moved.length) return <span className={styles.progressQuiet}>No check moved</span>;
  const rest = moved.slice(MOVED_SHOWN);
  return (
    <ul className={styles.progressMoved}>
      {moved.slice(0, MOVED_SHOWN).map((line) => (
        <li key={`${line.key}-${line.from}-${line.to}`} className={styles.progressMovedRow}>
          <span className={styles.progressMovedName}>
            {line.name}
            {line.programs.length ? <span className={styles.progressMovedPrograms}> {joinNames(line.programs)}</span> : null}
          </span>
          <span className={styles.progressMovedResults}>
            <ResultBar result={line.from} showPoints={false} size="sm" />
            <Icon name="arrowRight" size={14} label="to" />
            <ResultBar result={line.to} showPoints={false} size="sm" />
          </span>
        </li>
      ))}
      {rest.length ? (
        <li className={styles.progressQuiet}>
          and <span className="num">{rest.length}</span> more {rest.every(up) ? 'up' : rest.some(up) ? 'changes' : 'down'}
        </li>
      ) : null}
    </ul>
  );
}

function Score({ row }: { row: ProgressMonth }) {
  return (
    <span className={styles.progressScoreTop}>
      <span className={`${styles.progressScore} num`}>{row.scores.overall}</span>
      {row.change === null ? <span className={styles.progressChange}>First</span> : <span className={styles.progressChange}><Change value={row.change} /></span>}
    </span>
  );
}

function Place({ place }: { place: NonNullable<ProgressMonth['place']> }) {
  return (
    <>
      <span className="num">{ordinal(place.rank)}</span> of <span className="num">{place.of}</span>
    </>
  );
}

export function ProgressSection({
  months,
  history,
  scoreLabel,
  showPlace,
  label,
}: {
  months: readonly ProgressMonth[];
  history: readonly HistoryEntry[];
  /** "Overall", or the program's score on its page. */
  scoreLabel: string;
  /** With rivals, on the overall page: your place among them each month. */
  showPlace: boolean;
  /** What the table is, for screen readers: "Your score month by month". */
  label: string;
}) {
  const newest = [...months].reverse();
  const first = months[0]?.month;
  return (
    <div className={styles.progressStack}>
      <div className={styles.progressWide}>
        <table>
          <caption className="visually-hidden">{label}</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">{scoreLabel}</th>
              {PILLARS.map((pillar) => (
                <th key={pillar} scope="col">
                  {PILLAR_LABELS[pillar]}
                </th>
              ))}
              {showPlace ? <th scope="col">Among your rivals</th> : null}
              <th scope="col">What moved</th>
            </tr>
          </thead>
          <tbody>
            {newest.map((row, index) => (
              <tr key={row.month} data-latest={index === 0 ? 'true' : undefined}>
                <th scope="row" className={styles.progressMonth}>
                  {formatMonth(row.month)}
                </th>
                <td>
                  <span className={styles.progressScoreCell}>
                    <Score row={row} />
                    <span className={styles.progressBar} aria-hidden="true">
                      <span className={styles.progressFill} style={{ width: `${row.scores.overall}%` }} />
                    </span>
                  </span>
                </td>
                {PILLARS.map((pillar) => (
                  <td key={pillar} className={styles.progressWord}>
                    {wordFor(row.scores[pillar])}
                  </td>
                ))}
                {showPlace ? <td className={styles.progressNumber}>{row.place ? <Place place={row.place} /> : <span className={styles.progressQuiet}>Not scored</span>}</td> : null}
                <td>
                  <Moved moved={row.moved} first={row.month === first} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className={styles.progressCards} aria-label={label}>
        {newest.map((row, index) => (
          <li key={row.month} className={styles.progressCard} data-latest={index === 0 ? 'true' : undefined}>
            <div className={styles.progressCardHead}>
              <span className={styles.progressMonth}>{formatMonth(row.month)}</span>
              <Score row={row} />
            </div>
            <div className={styles.progressParts}>
              {PILLARS.map((pillar) => (
                <span key={pillar} className={styles.progressPart}>
                  {PILLAR_LABELS[pillar]}
                  <span className={styles.progressWord}>{wordFor(row.scores[pillar])}</span>
                </span>
              ))}
            </div>
            {showPlace && row.place ? (
              <p className={styles.progressQuiet}>
                <Place place={row.place} /> among you and your rivals
              </p>
            ) : null}
            <Moved moved={row.moved} first={row.month === first} />
          </li>
        ))}
      </ol>

      <details className={styles.more}>
        <summary className={styles.moreSummary}>
          <span className={styles.moreClosed}>Show every Audit</span>
          <span className={styles.moreOpen}>Hide the list</span>
          <Icon name="chevronDown" size={16} className={styles.moreIcon} />
        </summary>
        <DataTable
          caption="Every Audit"
          hideCaption
          rowKey={(row) => row.id}
          rows={[...history].reverse()}
          columns={[
            { key: 'date', header: 'Checked', render: (row) => formatDate(row.runAt) },
            { key: 'overall', header: scoreLabel, numeric: true, align: 'end', render: (row) => row.scores.overall },
            { key: 'discovered', header: 'Discovered', numeric: true, align: 'end', render: (row) => row.scores.discovered },
            { key: 'trusted', header: 'Trusted', numeric: true, align: 'end', render: (row) => row.scores.trusted },
            { key: 'chosen', header: 'Chosen', numeric: true, align: 'end', render: (row) => row.scores.chosen },
            { key: 'how', header: 'How it ran', render: (row) => HOW[row.trigger] ?? 'Scheduled' },
          ]}
        />
      </details>
    </div>
  );
}
