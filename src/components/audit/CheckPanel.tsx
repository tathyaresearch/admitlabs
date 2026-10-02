'use client';

// Check detail (spec section 13): the result, one line per program (Strong programs share one),
// how to fix it said once with its difficulty, then what was found with the source and the date.
// Opens from ?check=<key>, so it can be linked and survives a reload. Details the plan does not
// include arrive as null and show a placeholder, never real data.

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fixAdvice, panelLines, type AreaRow } from '@/audit/view';
import { AddedNote } from '@/components/details/Added';
import type { AddedByYou } from '@/domain/details';
import { SourceLine } from '@/components/ui/Data';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { SidePanel } from '@/components/ui/Overlay';
import { Difficulty, ResultBar } from '@/components/ui/Results';
import { formatDate, joinNames } from '@/domain/format';
import { PILLAR_LABELS, RESULT_LABELS } from '@/domain/types';
import { PlaceholderDetail } from './Placeholders';
import styles from './audit.module.css';

/** `added`: what the institution added in Settings that relates to each part, by the part's check id. */
export function CheckPanel({ rows, added = {} }: { rows: readonly AreaRow[]; added?: Readonly<Record<string, AddedByYou>> }) {
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
    <SidePanel
      open={row !== null}
      onClose={close}
      title={
        row ? (
          <span className={styles.panelTitle}>
            <CheckIcon check={row.key} size={20} />
            {row.name}
          </span>
        ) : (
          ''
        )
      } description={row ? `${PILLAR_LABELS[row.pillar]}. ${row.looksAt}.` : undefined}>
      {row ? <PanelBody row={row} added={added} /> : null}
    </SidePanel>
  );
}

function PanelBody({ row, added }: { row: AreaRow; added: Readonly<Record<string, AddedByYou>> }) {
  const why = row.parts.find((part) => part.detail?.whyItMatters)?.detail?.whyItMatters;
  const lines = panelLines(row.parts);
  const advice = fixAdvice(row.parts);
  const found = row.parts.filter((part) => part.detail);
  const locked = row.parts.filter((part) => !part.detail);
  const named = row.parts.length > 1;
  return (
    <div className={styles.panelStack}>
      <div className={styles.panelBlock}>
        <p className={styles.panelLabel}>{named ? 'Result by program' : 'Result'}</p>
        <ul className={styles.panelLines}>
          {lines.map((line) => (
            <li key={line.key} className={styles.panelLine}>
              {line.programs.length ? <span className={styles.panelLineName}>{joinNames(line.programs)}</span> : null}
              <span className={styles.points}>
                <ResultBar result={line.result} points={line.points} max={line.maxPoints} />
                {line.programs.length > 1 ? <span className={styles.each}>each</span> : null}
              </span>
              {line.previousResult ? <span className={styles.was}>Was {RESULT_LABELS[line.previousResult]} at the last Audit</span> : null}
            </li>
          ))}
        </ul>
      </div>

      {advice.length ? (
        <div className={styles.panelBlock}>
          <p className={styles.panelLabel}>How to fix it</p>
          {advice.map((item) => (
            <div key={item.text} className={styles.panelAdvice}>
              {item.programs.length ? <p className={styles.panelProgram}>{joinNames(item.programs)}</p> : null}
              <p>{item.text}</p>
              {item.difficulty ? <Difficulty value={item.difficulty} /> : null}
            </div>
          ))}
        </div>
      ) : found.length ? (
        <p className={styles.strongNote}>This is working well. Keep it going.</p>
      ) : null}

      {found.length ? (
        <div className={styles.panelBlock}>
          <p className={styles.panelLabel}>What Drishti found</p>
          {found.map((part) => (
            <div key={part.checkId} className={styles.panelFound}>
              {named && part.programName ? <p className={styles.panelProgram}>{part.programName}</p> : null}
              <p>{part.detail?.finding}</p>
              {part.detail ? <SourceLine url={part.detail.sourceUrl} checkedAt={part.checkedAt} /> : null}
            </div>
          ))}
        </div>
      ) : null}

      {row.parts.some((part) => added[part.checkId]) ? (
        <div className={styles.panelBlock}>
          {row.parts.map((part) => {
            const note = added[part.checkId];
            if (!note) return null;
            return (
              <AddedNote
                key={part.checkId}
                added={note}
                showAdvice={Boolean(part.detail?.howToFix)}
                label={named && part.programName ? `Added by you for ${part.programName}` : undefined}
              />
            );
          })}
        </div>
      ) : null}

      {locked.length ? (
        <div className={styles.panelBlock}>
          {!found.length ? <p className={styles.points}>Checked {formatDate(locked[0]?.checkedAt ?? row.parts[0]?.checkedAt ?? new Date())}</p> : null}
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
        </div>
      ) : null}

      {why ? (
        <div className={styles.panelBlock}>
          <p className={styles.panelLabel}>Why it matters to a student</p>
          <p>{why}</p>
        </div>
      ) : null}
    </div>
  );
}
