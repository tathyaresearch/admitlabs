// Head to head: your scores next to each rival's, pillar by pillar, in one table. A cell is
// inverted where that rival leads you. Each rival opens in place to show where they lead you
// and where you lead them, check by check; the full comparison is on the rival's page.

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { checkName } from '@/domain/checks';
import { INSTITUTION_TYPE_LABELS, PILLAR_LABELS, RESULT_LABELS, type InstitutionType } from '@/domain/types';
import type { RivalScores } from '@/lib/rivals/load';
import { whereTheyLead, whereYouLead, type CheckComparison, type ScoreSet, type SideSummary } from '@/rivals/compare';
import styles from './rivals.module.css';

const COLUMNS = ['overall', 'discovered', 'trusted', 'chosen'] as const;
const COLUMN_LABELS: Readonly<Record<(typeof COLUMNS)[number], string>> = { overall: 'Overall', ...PILLAR_LABELS };
const SHOWN = 3;

export function sideWord(side: SideSummary): string {
  if (side.kind === 'single') return RESULT_LABELS[side.result];
  if (side.kind === 'varies') return 'Varies by program';
  return 'Not checked';
}

function leadText(yours: number, theirs: number): string {
  if (theirs > yours) return `, leads you by ${theirs - yours}`;
  if (theirs < yours) return `, you lead by ${yours - theirs}`;
  return ', level with you';
}

function LeadItems({ items, empty, type }: { items: readonly CheckComparison[]; empty: string; type: InstitutionType }) {
  if (items.length === 0) return <p className={styles.leadNone}>{empty}</p>;
  return (
    <ul>
      {items.slice(0, SHOWN).map((item) => (
        <li key={item.key} className={styles.leadItem}>
          <span className={styles.leadName}>
            {checkName(item.key, type)}
            {item.programs.length ? ` (${item.programs.join(', ')})` : ''}
          </span>
          <span className={styles.leadSub}>
            Them: {sideWord(item.them)}. You: {sideWord(item.you)}.
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HeadToHeadTable({ you, rows, institutionType }: { you: { name: string; scores: ScoreSet | null }; rows: readonly RivalScores[]; institutionType: InstitutionType }) {
  const ordered = [...rows].sort((a, b) => (b.audit?.scores.overall ?? -1) - (a.audit?.scores.overall ?? -1) || a.rival.name.localeCompare(b.rival.name));
  return (
    <div className={styles.table}>
      <div className={`${styles.tableRow} ${styles.tableHead}`} aria-hidden="true">
        <span>Institution</span>
        {COLUMNS.map((column) => (
          <span key={column}>{COLUMN_LABELS[column]}</span>
        ))}
        <span />
      </div>

      <div className={`invert ${styles.tableRow} ${styles.tableYou}`}>
        <span className={styles.who}>
          <span className={styles.whoName}>You</span>
          <span className={styles.whoSub}>{you.name}</span>
        </span>
        {COLUMNS.map((column) => (
          <span key={column} className={styles.cell}>
            <span className={styles.cellLabel}>{COLUMN_LABELS[column]}</span>
            <span className={styles.score}>
              <span className="visually-hidden">{COLUMN_LABELS[column]} </span>
              {you.scores ? you.scores[column] : ''}
            </span>
          </span>
        ))}
        <span />
      </div>

      {ordered.map(({ rival, audit, comparisons }) => {
        const theyLead = whereTheyLead(comparisons);
        const youLead = whereYouLead(comparisons);
        return (
          <details key={rival.id} className={styles.rival}>
            <summary className={styles.tableRow}>
              <span className={styles.who}>
                <span className={styles.whoName}>{rival.name}</span>
                <span className={styles.whoSub}>
                  {INSTITUTION_TYPE_LABELS[rival.type]}, {rival.city}
                </span>
              </span>
              {COLUMNS.map((column) => {
                const theirs = audit?.scores[column] ?? null;
                const yours = you.scores?.[column] ?? null;
                const lead = theirs !== null && yours !== null && theirs > yours ? 'them' : undefined;
                return (
                  <span key={column} className={styles.cell}>
                    <span className={styles.cellLabel}>{COLUMN_LABELS[column]}</span>
                    <span className={styles.score} data-lead={lead}>
                      <span className="visually-hidden">{COLUMN_LABELS[column]} </span>
                      {theirs ?? ''}
                      <span className="visually-hidden">{theirs === null ? 'Checking now' : yours === null ? '' : leadText(yours, theirs)}</span>
                    </span>
                  </span>
                );
              })}
              <Icon name="chevronDown" size={16} className={styles.expandIcon} />
            </summary>
            <div className={styles.leads}>
              <div className={styles.leadList}>
                <p className={styles.leadTitle}>Where {rival.name} leads you</p>
                <LeadItems items={theyLead} type={institutionType} empty="Nowhere right now. You lead or match them on every check." />
              </div>
              <div className={styles.leadList}>
                <p className={styles.leadTitle}>Where you lead {rival.name}</p>
                <LeadItems items={youLead} type={institutionType} empty="Not yet. Every check here is a chance to catch up." />
              </div>
              <div className={styles.leadsFoot}>
                <Link href={`/rivals/${rival.id}`} className={styles.back}>
                  See all 17 checks side by side
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** One line under the table that says what a filled score means. */
export function HeadToHeadLegend() {
  return (
    <p className={styles.legend}>
      <span className={styles.legendChip} aria-hidden="true">
        74
      </span>
      A filled score is where that rival leads you. Open a rival to see where each of you leads.
    </p>
  );
}
