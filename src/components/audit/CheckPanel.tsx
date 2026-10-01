'use client';

// Check detail (spec section 13): result, what was found, source link, date checked, how to
// fix, and difficulty. Opens from ?check=<key>, so it can be linked and survives a reload.
// Details the plan does not include arrive as null and show a placeholder, never real data.

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AreaRow } from '@/audit/view';
import { SourceLine } from '@/components/ui/Data';
import { Icon } from '@/components/ui/Icon';
import { SidePanel } from '@/components/ui/Overlay';
import { Difficulty, PointsValue, ResultMeter } from '@/components/ui/Results';
import { formatDate } from '@/domain/format';
import { PILLAR_LABELS } from '@/domain/types';
import { WasMarker } from './Parts';
import { PlaceholderDetail } from './Placeholders';
import styles from './audit.module.css';

export function CheckPanel({ rows }: { rows: readonly AreaRow[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get('check');
  const row = rows.find((candidate) => candidate.key === key) ?? null;

  const close = () => {
    if (!params.has('check')) return;
    const next = new URLSearchParams(params);
    next.delete('check');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <SidePanel open={row !== null} onClose={close} title={row?.name ?? ''} description={row ? `${PILLAR_LABELS[row.pillar]}. ${row.looksAt}.` : undefined}>
      {row ? <PanelBody row={row} /> : null}
    </SidePanel>
  );
}

function PanelBody({ row }: { row: AreaRow }) {
  const why = row.parts.find((part) => part.detail?.whyItMatters)?.detail?.whyItMatters;
  return (
    <div className={styles.panelStack}>
      {why ? (
        <div className={styles.panelBlock}>
          <p className={styles.panelLabel}>Why it matters to a student</p>
          <p>{why}</p>
        </div>
      ) : null}

      {row.parts.map((part) => (
        <div key={part.checkId} className={styles.panelPart}>
          <div className={styles.panelPartHead}>
            {part.programName ? <p className={styles.panelProgram}>{part.programName}</p> : null}
            <ResultMeter result={part.result} size="lg" />
            <span className={styles.points}>
              <PointsValue kind="fraction" points={part.points} max={part.maxPoints} unit />
            </span>
          </div>
          <WasMarker part={part} long />

          {part.detail ? (
            <>
              <div className={styles.panelBlock}>
                <p className={styles.panelLabel}>What Drishti found</p>
                <p>{part.detail.finding}</p>
              </div>
              {part.detail.howToFix ? (
                <div className={styles.panelBlock}>
                  <p className={styles.panelLabel}>How to fix it</p>
                  <p>{part.detail.howToFix}</p>
                  {part.detail.difficulty ? <Difficulty value={part.detail.difficulty} /> : null}
                </div>
              ) : (
                <p className={styles.strongNote}>This is working well. Keep it going.</p>
              )}
              <SourceLine url={part.detail.sourceUrl} checkedAt={part.checkedAt} />
            </>
          ) : (
            <>
              <p className={styles.points}>Checked {formatDate(part.checkedAt)}</p>
              <div className={styles.lockedDetail}>
                <div className={styles.lockedShapes} aria-hidden="true" inert>
                  <PlaceholderDetail />
                </div>
                <p className={styles.lockedText}>Paid shows what Drishti found for this check, where it found it, and how to fix it.</p>
                <Link href="/plan" className={styles.lockedLink}>
                  See what Paid adds
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
