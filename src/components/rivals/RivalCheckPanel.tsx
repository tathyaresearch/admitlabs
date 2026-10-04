'use client';

// One check, you against your rivals (or one rival, on its page): who leads, what to learn from
// the one ahead (the idea, never a copy), then what Drishti found for each of them and for you,
// where and when, with a link to your own check on the Audit page. Opens from ?check=<key>.

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SourceLine } from '@/components/ui/Data';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { SidePanel } from '@/components/ui/Overlay';
import { ResultBar } from '@/components/ui/Results';
import { checkLooksAt, checkName } from '@/domain/checks';
import { PILLAR_LABELS, PILLAR_QUESTIONS, type InstitutionType } from '@/domain/types';
import { leadSentence, type AcrossCell, type AcrossRow, type AcrossSide } from '@/rivals/across';
import panel from '@/components/audit/panel.module.css';
import styles from './rivals.module.css';
import { auditFixPath, checkFixKey } from '@/domain/fix-key';

const share = (cell: AcrossCell | null | undefined) => (!cell || cell.summary.kind === 'none' ? -1 : cell.summary.share);

/** What the one ahead teaches, or where you stand when nobody is ahead. */
function learnText(row: AcrossRow): string {
  switch (row.lead) {
    case 'rival':
      return 'Learn from what works for them, then do it your own way, with your own students and numbers. Never copy their words or photos.';
    case 'you':
      return 'Keep it going: no rival is ahead of you on this check.';
    case 'level':
      return 'One step up puts you ahead.';
    default:
      return '';
  }
}

function Side({ side, cell, leads }: { side: AcrossSide; cell: AcrossCell | null | undefined; leads: boolean }) {
  return (
    <li className={styles.panelSide}>
      <p className={styles.panelSideHead}>
        <span className={styles.panelSideName}>{side.you ? 'You' : side.name}</span>
        {leads ? <span className={styles.panelSideTag}>Leads</span> : null}
      </p>
      {cell && cell.parts.length ? (
        <ul className={panel.found}>
          {cell.parts.map((part) => (
            <li key={part.checkId} className={panel.foundItem}>
              <div className={panel.foundHead}>
                {part.programName ? <span className={panel.foundProgram}>{part.programName}</span> : null}
                <ResultBar result={part.result} size="sm" />
              </div>
              {part.finding ? <p className={panel.foundText}>{part.finding}</p> : null}
              {part.sourceUrl ? <SourceLine url={part.sourceUrl} checkedAt={part.checkedAt} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={panel.summaryNote}>{side.you ? 'Not in your latest Audit.' : 'Not checked for them yet.'}</p>
      )}
    </li>
  );
}

export function RivalCheckPanel({ rows, sides, institutionType }: { rows: readonly AcrossRow[]; sides: readonly AcrossSide[]; institutionType: InstitutionType }) {
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

  const you = sides.find((side) => side.you);
  // The one ahead first, then the rest by how they did, then you.
  const rivals = row ? sides.filter((side) => !side.you).sort((a, b) => share(row.cells[b.id]) - share(row.cells[a.id])) : [];
  const yours = you && row ? row.cells[you.id] : null;
  const strong = Boolean(yours?.parts.length) && (yours?.parts.every((part) => part.result === 'strong') ?? false);

  return (
    <SidePanel
      open={row !== null}
      onClose={close}
      title={
        row ? (
          <span className={panel.title}>
            <CheckIcon check={row.key} size={20} />
            {checkName(row.key, institutionType)}
          </span>
        ) : (
          ''
        )
      }
      description={row ? `${PILLAR_LABELS[row.pillar]}: ${PILLAR_QUESTIONS[row.pillar]} ${checkLooksAt(row.key, institutionType)}.` : undefined}
    >
      {row ? (
        <div className={panel.stack}>
          <div className={panel.summary}>
            <p className={panel.summaryTitle}>{leadSentence(row, sides)}</p>
            {learnText(row) ? <p className={panel.summaryNote}>{learnText(row)}</p> : null}
            {row.programs.length ? <p className={panel.summaryNote}>Compared on {row.programs.join(', ')}.</p> : null}
            <Link href={auditFixPath(checkFixKey(row.key))} className={styles.panelLink}>
              {strong ? 'See your check' : 'See your check and how to fix it'}
              <Icon name="arrowRight" size={14} />
            </Link>
          </div>

          <section className={panel.block} aria-label="What was found for each">
            <p className={panel.label}>What was found for each</p>
            <ul className={styles.panelSides}>
              {rivals.map((side) => (
                <Side key={side.id} side={side} cell={row.cells[side.id]} leads={row.lead === 'rival' && row.leaders.includes(side.id)} />
              ))}
              {you ? <Side side={you} cell={yours} leads={false} /> : null}
            </ul>
          </section>
        </div>
      ) : null}
    </SidePanel>
  );
}
