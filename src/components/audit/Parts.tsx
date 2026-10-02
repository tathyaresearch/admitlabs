import type { ItemPart } from '@/audit/view';
import { ResultBar } from '@/components/ui/Results';
import styles from './audit.module.css';

/** A result as its bar and word; with the program name when the check covers several programs. */
export function PartResults({ parts, showNames, size = 'sm' }: { parts: readonly ItemPart[]; showNames: boolean; size?: 'sm' | 'md' }) {
  return (
    <span className={styles.parts}>
      {parts.map((part) => (
        <span key={part.checkId} className={styles.partResult}>
          {showNames && part.programName ? <span className={styles.partName}>{part.programName}</span> : null}
          <ResultBar result={part.result} points={part.points} max={part.maxPoints} showPoints={false} size={size} />
        </span>
      ))}
    </span>
  );
}

export function changedParts(parts: readonly ItemPart[]): ItemPart[] {
  return parts.filter((part) => part.previousResult !== null && part.previousResult !== part.result);
}
