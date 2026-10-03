'use client';

// Check detail (spec section 13), in one reading order. At the top, the fix it is about, named as on
// Home and in the lists, with the points it could add, the effort and the programs. Then:
//   1. What we found, program by program: the result, what was found, the source and the date.
//   2. Why it matters to a student.
//   3. How to fix it, in numbered steps, with the effort for each program.
// Then what was added in Settings. The owner marks it done in the footer; the next Audit checks it.
// Opens from ?check=<key>, so it can be linked and survives a reload. Details the plan does not
// include arrive as null and show a placeholder, never real data.

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { fixAdvice, type AreaRow, type ItemPart } from '@/audit/view';
import { AddedNote } from '@/components/details/Added';
import { SourceLine } from '@/components/ui/Data';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { SidePanel } from '@/components/ui/Overlay';
import { ResultBar } from '@/components/ui/Results';
import type { AddedByYou } from '@/domain/details';
import { formatDate, joinNames } from '@/domain/format';
import { EFFORT_LABELS, PILLAR_LABELS, PILLAR_QUESTIONS, RESULT_LABELS, type CheckKey, type Difficulty } from '@/domain/types';
import { PlaceholderDetail } from './Placeholders';
import styles from './panel.module.css';

/** The fix a check is about: its name as on Home and in the lists, what it could add, how big a job it is. */
export interface PanelFix {
  title: string;
  points: number;
  difficulty: Difficulty | null;
  /** The programs with something to fix. Empty for a check on the whole institution. */
  programs: string[];
}

export interface MarkRequest {
  check: CheckKey | null;
  thing: string | null;
  month: string | null;
  done: boolean;
}

export interface PanelMarking {
  /** The owner, signed in as themselves. */
  canMark: boolean;
  /** Checks marked done, waiting for the next Audit. */
  marked: readonly CheckKey[];
  /** "15 Oct 2026": when the next Audit checks it, when that Audit runs on this plan. */
  nextAudit: string | null;
  onMark: (request: MarkRequest) => Promise<{ ok: boolean; error: string | null }>;
}

export function CheckPanel({
  rows,
  added = {},
  fixes = {},
  marking = null,
}: {
  rows: readonly AreaRow[];
  /** What the institution added in Settings that relates to each part, by the part's check id. */
  added?: Readonly<Record<string, AddedByYou>>;
  /** Each check with something to fix, by its key. */
  fixes?: Readonly<Partial<Record<CheckKey, PanelFix>>>;
  /** Mark as done. Left out where nothing can be marked (the team's pages). */
  marking?: PanelMarking | null;
}) {
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

  const fix = row ? (fixes[row.key] ?? null) : null;
  return (
    <SidePanel
      open={row !== null}
      onClose={close}
      title={
        row ? (
          <span className={styles.title}>
            <CheckIcon check={row.key} size={20} />
            {row.name}
          </span>
        ) : (
          ''
        )
      }
      description={row ? `${PILLAR_LABELS[row.pillar]}: ${PILLAR_QUESTIONS[row.pillar]} ${row.looksAt}.` : undefined}
      footer={row && fix && marking ? <MarkFooter check={row.key} marking={marking} /> : undefined}
    >
      {row ? <PanelBody row={row} fix={fix} added={added} /> : null}
    </SidePanel>
  );
}

interface FoundGroup {
  key: string;
  programs: string[];
  part: ItemPart;
}

/** One line per program; programs Strong with the same points (and Strong before) share one, after the rest. */
function foundGroups(parts: readonly ItemPart[]): FoundGroup[] {
  const steady = parts.filter((part) => part.programName && part.result === 'strong' && (part.previousResult === null || part.previousResult === 'strong'));
  const first = steady[0];
  const shared = first && steady.length > 1 && steady.every((part) => part.points === first.points && part.maxPoints === first.maxPoints) ? steady : [];
  const groups: FoundGroup[] = parts.filter((part) => !shared.includes(part)).map((part) => ({ key: part.checkId, programs: part.programName ? [part.programName] : [], part }));
  if (first && shared.length) groups.push({ key: 'strong', programs: shared.map((part) => part.programName as string), part: first });
  return groups;
}

function Effort({ value }: { value: Difficulty }) {
  return (
    <span className={styles.effort}>
      <span className={styles.effortLabel}>Effort</span>
      {EFFORT_LABELS[value]}
    </span>
  );
}

function BlockLabel({ number, children }: { number: number; children: string }) {
  return (
    <h3 className={styles.label}>
      <span className={`${styles.labelNumber} num`} aria-hidden="true">
        {number}
      </span>
      {children}
    </h3>
  );
}

function PanelBody({ row, fix, added }: { row: AreaRow; fix: PanelFix | null; added: Readonly<Record<string, AddedByYou>> }) {
  const why = row.parts.find((part) => part.detail?.whyItMatters)?.detail?.whyItMatters ?? null;
  const advice = fixAdvice(row.parts);
  const groups = foundGroups(row.parts);
  const locked = row.parts.some((part) => !part.detail);
  const seen = row.parts.some((part) => part.detail);
  const rounded = fix ? Math.round(fix.points) : 0;
  let block = 0;
  return (
    <div className={styles.stack}>
      {fix ? (
        <div className={styles.summary}>
          <p className={styles.summaryTitle}>{fix.title}</p>
          <div className={styles.summaryFacts}>
            <span className={styles.points}>
              {fix.points < 0.5 ? (
                'Could add less than 1 point'
              ) : (
                <>
                  Could add up to <span className="num">+{rounded}</span> {rounded === 1 ? 'point' : 'points'}
                </>
              )}
            </span>
            {fix.difficulty ? <Effort value={fix.difficulty} /> : null}
          </div>
          {fix.programs.length ? <p className={styles.summaryNote}>For {joinNames(fix.programs)}</p> : null}
        </div>
      ) : row.parts.length ? (
        <div className={styles.summary}>
          <p className={styles.summaryTitle}>Strong everywhere. Keep it going.</p>
        </div>
      ) : null}

      <section className={styles.block}>
        <BlockLabel number={(block += 1)}>What we found</BlockLabel>
        <ul className={styles.found}>
          {groups.map((group) => {
            const moved = group.part.previousResult && group.part.previousResult !== group.part.result ? group.part.previousResult : null;
            return (
              <li key={group.key} className={styles.foundItem}>
                <div className={styles.foundHead}>
                  <span className={styles.foundProgram}>{group.programs.length ? joinNames(group.programs) : 'Your institution'}</span>
                  <span className={styles.foundResult}>
                    <ResultBar result={group.part.result} points={group.part.points} max={group.part.maxPoints} size="sm" />
                    {group.programs.length > 1 ? <span className={styles.each}>each</span> : null}
                  </span>
                </div>
                {moved ? <p className={styles.was}>Was {RESULT_LABELS[moved]} at the last Audit</p> : null}
                {group.part.detail ? (
                  <>
                    <p className={styles.foundText}>{group.part.detail.finding}</p>
                    <SourceLine url={group.part.detail.sourceUrl} checkedAt={group.part.checkedAt} />
                  </>
                ) : (
                  <p className={styles.was}>Checked {formatDate(group.part.checkedAt)}</p>
                )}
              </li>
            );
          })}
        </ul>
        {locked ? (
          <div className={styles.locked}>
            <div className={styles.lockedShapes} aria-hidden="true" inert>
              <PlaceholderDetail />
            </div>
            <p className={styles.lockedText}>
              {seen ? 'Paid shows what Drishti found for the rest, where it found it, and how to fix it.' : 'Paid shows what Drishti found for this check, where it found it, and how to fix it.'}
            </p>
            <Link href="/plan" className={styles.lockedLink}>
              See what Paid adds
              <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        ) : null}
      </section>

      {why ? (
        <section className={styles.block}>
          <BlockLabel number={(block += 1)}>Why it matters to a student</BlockLabel>
          <p className={styles.why}>{why}</p>
        </section>
      ) : null}

      {advice.length ? (
        <section className={styles.block}>
          <BlockLabel number={(block += 1)}>How to fix it</BlockLabel>
          {advice.map((item) => (
            <div key={item.steps.join(' ')} className={styles.fixGroup}>
              {item.programs.length || (item.difficulty && !fix?.difficulty) ? (
                <div className={styles.fixHead}>
                  <span className={styles.fixProgram}>{item.programs.length ? joinNames(item.programs) : ''}</span>
                  {item.difficulty ? <Effort value={item.difficulty} /> : null}
                </div>
              ) : null}
              {item.steps.length > 1 ? (
                <ol className={styles.steps}>
                  {item.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className={styles.step}>{item.steps[0]}</p>
              )}
            </div>
          ))}
        </section>
      ) : null}

      {row.parts.some((part) => added[part.checkId]) ? (
        <section className={styles.block}>
          {row.parts.map((part) => {
            const note = added[part.checkId];
            if (!note) return null;
            return (
              <AddedNote
                key={part.checkId}
                added={note}
                showAdvice={Boolean(part.detail?.howToFix)}
                label={row.parts.length > 1 && part.programName ? `Added by you for ${part.programName}` : undefined}
              />
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

/** The owner marks the fix done; the next Audit checks it. Everyone else sees whether it was. */
function MarkFooter({ check, marking }: { check: CheckKey; marking: PanelMarking }) {
  const [marked, setMarked] = useOptimistic(new Set(marking.marked), (current: ReadonlySet<CheckKey>, change: { done: boolean }) => {
    const next = new Set(current);
    if (change.done) next.add(check);
    else next.delete(check);
    return next;
  });
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const done = marked.has(check);
  const when = marking.nextAudit ? `Your next Audit, on ${marking.nextAudit},` : 'Your next Audit';

  const toggle = (next: boolean) =>
    startTransition(async () => {
      setMarked({ done: next });
      const result = await marking.onMark({ check, thing: null, month: null, done: next });
      setError(result.ok ? null : result.error);
    });

  if (!marking.canMark) {
    return done ? (
      <p className={styles.note}>
        <Icon name="checkCircle" size={16} />
        Marked done. {when} checks it.
      </p>
    ) : null;
  }
  return (
    <div className={styles.footer}>
      <div className={styles.done}>
        <button type="button" className={styles.markDone} aria-pressed={done} onClick={() => toggle(!done)}>
          <Icon name={done ? 'checkCircle' : 'check'} size={18} />
          {done ? 'Marked as done' : 'Mark as done'}
        </button>
        {done ? (
          <button type="button" className={styles.undo} onClick={() => toggle(false)}>
            Undo
          </button>
        ) : null}
      </div>
      <p className={styles.note}>{done ? `${when} checks it and says what it found.` : `Done it? Mark it. ${when} checks it.`}</p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
