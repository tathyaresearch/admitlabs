// Score history (Paid and Client): the month-by-month line with the 40 and 70 band lines; every
// Audit sits folded below.

import { historyByMonth, type HistoryRow } from '@/audit/view';
import { HistoryLine } from '@/components/charts/HistoryLine';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { monthKey } from '@/domain/dates';
import { formatDate } from '@/domain/format';
import styles from './audit.module.css';

export type HistoryEntry = HistoryRow & { trigger: string };

const HOW: Readonly<Record<string, string>> = {
  signup: 'First Audit',
  scheduled: 'Scheduled',
  manual: 'Extra refresh',
};

export function HistorySection({ rows, label }: { rows: readonly HistoryEntry[]; label: string }) {
  const points = historyByMonth(rows, (runAt) => monthKey(new Date(runAt)));
  return (
    <div className={styles.history}>
      <HistoryLine points={points} label={label} height={260} />
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
          rows={[...rows].reverse()}
          columns={[
            { key: 'date', header: 'Checked', render: (row) => formatDate(row.runAt) },
            { key: 'overall', header: 'Overall', numeric: true, align: 'end', render: (row) => row.scores.overall },
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
