// Month by month (rule 11, replacing the lines of dots): the overall score of you and each rival in
// every month, as a table of numbers, your row first and marked, and one line about your place
// ("2nd of 4 in every month since April"). On a phone the table keeps the last three months, so
// the newest is never out of sight.

import { formatMonthName, formatMonthShort, ordinal } from '@/domain/format';
import { placeIn, type ScoreTrend } from '@/rivals/trend';
import styles from './charts.module.css';

/** Months shown on a phone: the newest ones. */
const PHONE_MONTHS = 3;

function PlaceLine({ trend }: { trend: ScoreTrend }) {
  const first = trend.months[0];
  const last = trend.months.at(-1);
  if (!first || !last || first === last) return null;
  const from = placeIn(trend, first);
  const to = placeIn(trend, last);
  if (!from || !to) return null;
  const steady = trend.months.every((month) => placeIn(trend, month)?.place === to.place);
  return (
    <p className={styles.monthPlace}>
      {steady ? (
        <>
          <span className="num">{ordinal(to.place)}</span> of {to.of} in every month since {formatMonthName(first)}.
        </>
      ) : from.place === to.place ? (
        <>
          <span className="num">{ordinal(to.place)}</span> of {to.of} now, as in {formatMonthName(first)}.
        </>
      ) : (
        <>
          From <span className="num">{ordinal(from.place)}</span> to <span className="num">{ordinal(to.place)}</span> of {to.of} since {formatMonthName(first)}.
        </>
      )}
    </p>
  );
}

export function MonthTable({ trend, label, youName = 'You' }: { trend: ScoreTrend; label: string; youName?: string }) {
  if (!trend.months.length) return null;
  const lines = [...trend.lines].sort((a, b) => Number(b.you) - Number(a.you) || (b.points.at(-1)?.score ?? 0) - (a.points.at(-1)?.score ?? 0));
  const older = (index: number) => (index < trend.months.length - PHONE_MONTHS ? 'true' : undefined);
  return (
    <div className={styles.monthTableBlock}>
      <PlaceLine trend={trend} />
      <div className={styles.monthTable}>
        <table>
          <caption className="visually-hidden">{label}</caption>
          <thead>
            <tr>
              <th scope="col">Overall score</th>
              {trend.months.map((month, index) => (
                <th key={month} scope="col" data-older={older(index)}>
                  {formatMonthShort(month)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} data-you={line.you ? 'true' : undefined}>
                <th scope="row">
                  {line.name}
                  {line.you ? <span className={styles.youMark}>{youName}</span> : null}
                </th>
                {trend.months.map((month, index) => {
                  const point = line.points.find((entry) => entry.month === month);
                  return (
                    <td key={month} className="num" data-older={older(index)}>
                      {point ? Math.round(point.score) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
