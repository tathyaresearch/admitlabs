// All 17 checks side by side, grouped by pillar: their result, yours, and who leads. Each row
// opens the side panel with what was found for them, the source and the date. Program checks
// compare the programs you both offer.

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon, PillarIcon } from '@/components/ui/Marks';
import { ResultGauge } from '@/components/ui/Results';
import { checkName } from '@/domain/checks';
import { PILLAR_LABELS, PILLARS, RESULT_LABELS, type InstitutionType } from '@/domain/types';
import type { CheckComparison, SideSummary } from '@/rivals/compare';
import { LEAD_WORDS } from '@/rivals/text';
import audit from '@/components/audit/audit.module.css';
import styles from './rivals.module.css';

/** A side's result in words: "Strong", "Varies by program", "Not checked". */
export function sideText(side: SideSummary): string {
  if (side.kind === 'single') return RESULT_LABELS[side.result];
  return side.kind === 'varies' ? 'Varies by program' : 'Not checked';
}

export function Side({ side, label }: { side: SideSummary; label: string }) {
  return (
    <span className={styles.side}>
      <span className={styles.sideLabel}>{label}</span>
      {side.kind === 'single' ? (
        <ResultGauge result={side.result} size="sm" />
      ) : (
        <span className={audit.varies}>{side.kind === 'varies' ? 'Varies by program' : 'Not checked'}</span>
      )}
    </span>
  );
}

export function CompareChecks({ comparisons, institutionType, rivalName }: { comparisons: readonly CheckComparison[]; institutionType: InstitutionType; rivalName: string }) {
  return (
    <div className={audit.groups}>
      {PILLARS.map((pillar) => {
        const rows = comparisons.filter((item) => item.pillar === pillar);
        if (rows.length === 0) return null;
        const theyLead = rows.filter((item) => item.lead === 'them').length;
        const youLead = rows.filter((item) => item.lead === 'you').length;
        return (
          <details key={pillar} className={audit.group} open>
            <summary className={audit.groupSummary}>
              <span className={audit.groupTitle}>
                <PillarIcon pillar={pillar} size={18} />
                {PILLAR_LABELS[pillar]}
              </span>
              <span className={audit.groupMeta}>
                {`They lead on ${theyLead}, you lead on ${youLead}`}
                <Icon name="chevronDown" size={16} className={audit.groupIcon} />
              </span>
            </summary>
            <div className={audit.checkRows}>
              <div className={styles.compareHead} aria-hidden="true">
                <span>Check</span>
                <span>{rivalName}</span>
                <span>You</span>
                <span />
                <span />
              </div>
              {rows.map((item) => {
                const name = checkName(item.key, institutionType);
                return (
                  <Link
                    key={item.key}
                    href={`?check=${item.key}`}
                    scroll={false}
                    className={styles.compareRow}
                    aria-label={`${name}: ${LEAD_WORDS[item.lead].toLowerCase()}. Open the detail.`}
                  >
                    <span className={audit.rowName}>
                      <span className={audit.rowTitle}>
                        <CheckIcon check={item.key} size={16} />
                        {name}
                      </span>
                      {item.programs.length ? <span className={audit.rowSub}>{item.programs.join(', ')}</span> : null}
                    </span>
                    <Side side={item.them} label={rivalName} />
                    <Side side={item.you} label="You" />
                    <span className={styles.leadWord} data-lead={item.lead}>
                      {LEAD_WORDS[item.lead]}
                    </span>
                    <Icon name="chevronRight" size={16} className={audit.chevron} />
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
