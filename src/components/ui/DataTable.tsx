// A table that turns into stacked cards on a phone. Each cell carries its column name,
// so a phone reader still knows what every value means.

import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface Column<Row> {
  key: string;
  header: string;
  align?: 'start' | 'end';
  /** Numbers that should line up in a column. */
  numeric?: boolean;
  render: (row: Row) => ReactNode;
}

interface DataTableProps<Row> {
  caption: string;
  /** Hide the caption visually; it is still read out. */
  hideCaption?: boolean;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  empty?: ReactNode;
}

export function DataTable<Row>({ caption, hideCaption, columns, rows, rowKey, empty }: DataTableProps<Row>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className={hideCaption ? 'visually-hidden' : styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.align === 'end' ? styles.end : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column, index) => {
                const className = [column.align === 'end' ? styles.end : '', column.numeric ? 'tabular' : ''].filter(Boolean).join(' ') || undefined;
                return index === 0 ? (
                  <th key={column.key} scope="row" data-label={column.header} className={className}>
                    {column.render(row)}
                  </th>
                ) : (
                  <td key={column.key} data-label={column.header} className={className}>
                    {column.render(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
