import type { ItemPart } from '@/audit/view';
import { ResultMeter } from '@/components/ui/Results';
import { RESULT_LABELS } from '@/domain/types';
import styles from './audit.module.css';

/** A result with its meter and word; with the program name when the check covers several programs. */
export function PartResults({ parts, showNames, size = 'sm' }: { parts: readonly ItemPart[]; showNames: boolean; size?: 'sm' | 'md' }) {
  return (
    <span className={styles.parts}>
      {parts.map((part) => (
        <span key={part.checkId} className={styles.partResult}>
          {showNames && part.programName ? <span className={styles.partName}>{part.programName}</span> : null}
          <ResultMeter result={part.result} size={size} />
        </span>
      ))}
    </span>
  );
}

/** "Was Weak": shown when a check's result moved since the last Audit. */
export function WasMarker({ part, long = false }: { part: ItemPart; long?: boolean }) {
  if (!part.previousResult || part.previousResult === part.result) return null;
  const was = RESULT_LABELS[part.previousResult];
  return <span className={styles.was}>{long ? `Was ${was} at the last Audit` : `Was ${was}`}</span>;
}

export function changedParts(parts: readonly ItemPart[]): ItemPart[] {
  return parts.filter((part) => part.previousResult !== null && part.previousResult !== part.result);
}
