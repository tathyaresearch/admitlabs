// Check by check across all your rivals (B5): every check, you and each rival with the result as
// a bar and its word, and who leads, grouped by part. Each row opens the check panel: what was
// found for each, and what to learn from the one ahead. In tabs that open where there is
// something: where a rival leads you first, when one does.

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon, PillarIcon } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { checkName } from '@/domain/checks';
import { PILLAR_LABELS, PILLARS, type InstitutionType } from '@/domain/types';
import { leadText, type AcrossCell, type AcrossRow, type AcrossSide } from '@/rivals/across';
import { sideText } from './CompareChecks';
import audit from '@/components/audit/audit.module.css';
import styles from './rivals.module.css';

function Cell({ cell, label }: { cell: AcrossCell | null | undefined; label: string }) {
  const summary = cell?.summary;
  return (
    <span className={styles.side}>
      <span className={styles.acrossLabel}>{label}</span>
      {!summary || summary.kind === 'none' ? (
        <span className={styles.sideNote}>Not checked</span>
      ) : summary.kind === 'single' ? (
        <ResultBar result={summary.result} share={summary.share} size="sm" />
      ) : (
        <>
          <ResultBar result={summary.weakest.result} share={summary.weakest.share} size="sm" />
          {summary.weakest.programName ? <span className={styles.sideNote}>Weakest: {summary.weakest.programName}</span> : null}
        </>
      )}
    </span>
  );
}

function Rows({ rows, sides, institutionType }: { rows: readonly AcrossRow[]; sides: readonly AcrossSide[]; institutionType: InstitutionType }) {
  const columns = { '--sides': sides.length } as CSSProperties;
  return (
    <div className={audit.groups}>
      {PILLARS.map((pillar) => {
        const inPart = rows.filter((row) => row.pillar === pillar);
        if (inPart.length === 0) return null;
        const rivalLeads = inPart.filter((row) => row.lead === 'rival').length;
        const youLead = inPart.filter((row) => row.lead === 'you').length;
        return (
          <details key={pillar} className={audit.group} open>
            <summary className={audit.groupSummary}>
              <span className={audit.groupTitle}>
                <PillarIcon pillar={pillar} size={18} />
                {PILLAR_LABELS[pillar]}
              </span>
              <span className={audit.groupMeta}>
                {`A rival leads on ${rivalLeads}, you lead on ${youLead}`}
                <Icon name="chevronDown" size={16} className={audit.groupIcon} />
              </span>
            </summary>
            <div className={styles.acrossScroll}>
              <div className={styles.acrossHead} style={columns} aria-hidden="true">
                <span>Check</span>
                {sides.map((side) => (
                  <span key={side.id} className={side.you ? styles.acrossYou : undefined}>
                    {side.you ? 'You' : side.name}
                  </span>
                ))}
                <span>Who leads</span>
                <span />
              </div>
              {inPart.map((row) => {
                const name = checkName(row.key, institutionType);
                const results = sides.map((side) => {
                  const summary = row.cells[side.id]?.summary;
                  return `${side.you ? 'you' : side.name} ${summary ? sideText(summary) : 'not checked'}`;
                });
                return (
                  <Link
                    key={row.key}
                    href={`?check=${row.key}`}
                    scroll={false}
                    className={styles.acrossRow}
                    style={columns}
                    aria-label={`${name}. ${leadText(row, sides)}. ${results.join(', ')}. Open the detail.`}
                  >
                    <span className={audit.rowName}>
                      <span className={audit.rowTitle}>
                        <CheckIcon check={row.key} size={16} />
                        {name}
                      </span>
                      {row.programs.length ? <span className={audit.rowSub}>{row.programs.join(', ')}</span> : null}
                    </span>
                    {sides.map((side) => (
                      <Cell key={side.id} cell={row.cells[side.id]} label={side.you ? 'You' : side.name} />
                    ))}
                    <span className={styles.acrossLead} data-lead={row.lead}>
                      <span className={styles.acrossLabel}>Who leads</span>
                      {leadText(row, sides)}
                    </span>
                    <Icon name="chevronRight" size={16} className={`${audit.chevron} ${styles.acrossChevron}`} />
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function AcrossChecks({ rows, sides, institutionType }: { rows: readonly AcrossRow[]; sides: readonly AcrossSide[]; institutionType: InstitutionType }) {
  const rivalLeads = rows.filter((row) => row.lead === 'rival');
  const youLead = rows.filter((row) => row.lead === 'you');
  const items: TabItem[] = [
    ...(rivalLeads.length ? [{ id: 'rival', label: 'Where a rival leads', count: rivalLeads.length, content: <Rows rows={rivalLeads} sides={sides} institutionType={institutionType} /> }] : []),
    ...(youLead.length ? [{ id: 'you', label: 'Where you lead', count: youLead.length, content: <Rows rows={youLead} sides={sides} institutionType={institutionType} /> }] : []),
    { id: 'all', label: 'All checks', count: rows.length, content: <Rows rows={rows} sides={sides} institutionType={institutionType} /> },
  ];
  return <Tabs label="Check by check" items={items} />;
}
