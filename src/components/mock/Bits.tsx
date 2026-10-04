// Version 2 mock (Step 2, development only): the pieces every mock screen shares. Server safe.
// Monochrome, no gradients: words, thin bars and inverted blocks do the work, and every shape has
// its word or number beside it.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { formatDate, hostAndPath } from '@/domain/format';
import { EFFORT_LABELS, RESULT_LABELS, type CheckResult, type Difficulty } from '@/domain/types';
import { CopyButton } from './Client';
import { FINDING_LABELS, type Fix, type FoundRow, type Good, type Impact, type Place, type Proof, type ReadyFix, type Thin, type WordState } from './model';
import styles from './mock.module.css';

export function Tag({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <span className={[styles.tag, strong ? styles.tagStrong : ''].join(' ')}>{children}</span>;
}

export function ImpactTags({ impact, effort, programs = [] }: { impact: Impact | null; effort: Difficulty | null; programs?: readonly string[] }) {
  return (
    <span className={styles.tags}>
      {impact ? <Tag strong={impact === 'High'}>Impact {impact}</Tag> : null}
      {effort ? <Tag>Effort {EFFORT_LABELS[effort]}</Tag> : null}
      {programs.slice(0, 3).map((program) => (
        <Tag key={program}>{program}</Tag>
      ))}
    </span>
  );
}

export function SectionTitle({ icon, title, help, action, id }: { icon?: IconName; title: ReactNode; help?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionText}>
        <h2 id={id} className={styles.sectionTitle}>
          {icon ? <Icon name={icon} size={18} className={styles.sectionIcon} /> : null}
          {title}
        </h2>
        {help ? <p className={styles.sectionHelp}>{help}</p> : null}
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  );
}

/** Visibility, Trust and Chosen as three tiles: the word large, its question, what to fix first in it. */
export function WordTiles({ words, compact = false }: { words: readonly WordState[]; compact?: boolean }) {
  return (
    <div className={[styles.wordTiles, compact ? styles.wordTilesCompact : ''].join(' ')}>
      {words.map((word) => (
        <div key={word.pillar} className={styles.wordTile}>
          <p className={styles.wordName}>
            <Icon name={word.icon} size={16} />
            {word.name}
          </p>
          <p className={styles.wordValue} data-word={word.word}>
            {word.word}
          </p>
          <p className={styles.wordQuestion}>{word.question}</p>
          {word.moved ? <p className={styles.wordMoved}>{word.moved}</p> : null}
          {word.fixFirst ? (
            <p className={styles.wordFix}>
              <span className={styles.wordFixLabel}>Fix first</span>
              {word.fixFirst.name}, {RESULT_LABELS[word.fixFirst.result]}
            </p>
          ) : (
            <p className={styles.wordFix}>Every check here is Strong.</p>
          )}
        </div>
      ))}
    </div>
  );
}

/** The three words in one line each, for the inverted band. */
export function WordsInline({ words }: { words: readonly WordState[] }) {
  return (
    <ul className={styles.wordsInline}>
      {words.map((word) => (
        <li key={word.pillar}>
          <span className={styles.wordsInlineName}>{word.name}</span>
          <span className={styles.wordsInlineValue}>{word.word}</span>
          <span className={styles.wordsInlineQuestion}>{word.question}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProofLine({ proof, compact = false }: { proof: Proof; compact?: boolean }) {
  return (
    <span className={[styles.proof, compact ? styles.proofCompact : ''].join(' ')}>
      {proof.line ? (
        <span className={styles.proofLine}>
          {proof.program ? <span className={styles.proofProgram}>{proof.program}: </span> : null}
          {proof.line}
        </span>
      ) : null}
      <span className={styles.proofMeta}>
        {proof.url ? (
          <a href={proof.url} className={styles.proofLink} target="_blank" rel="noreferrer">
            {hostAndPath(proof.url)}
            <Icon name="external" size={12} />
          </a>
        ) : null}
        {proof.date ? <span>Checked {formatDate(proof.date)}</span> : null}
        {proof.byTeam ? <span className={styles.byTeam}>Checked by the AdmitLabs team</span> : null}
      </span>
    </span>
  );
}

/** What we found: every check with its bar and word, every finding with its kind, each with its proof. */
export function FoundList({ rows, open, wide = false }: { rows: readonly FoundRow[]; open?: ReadonlySet<string> | null; wide?: boolean }) {
  return (
    <ul className={[styles.found, wide ? styles.foundWide : ''].join(' ')}>
      {rows.map((row) => {
        const shown = !open || open.has(row.id);
        return (
          <li key={row.id} className={styles.foundRow}>
            <span className={styles.foundHead}>
              <span className={styles.foundName}>
                {row.key ? <CheckIcon check={row.key} size={15} /> : <Icon name={row.kind === 'listing' || row.kind === 'news' || row.kind === 'directory' ? 'globe' : 'forum'} size={15} className={styles.muted} />}
                {row.key ? row.name : row.source}
                {row.weakestProgram ? <span className={styles.foundWeakest}>Weakest: {row.weakestProgram}</span> : null}
              </span>
              {row.result ? <ResultBar result={row.result} share={row.share} showPoints={false} size="sm" /> : row.kind ? <Tag strong={row.kind === 'bad' || row.kind === 'unanswered'}>{FINDING_LABELS[row.kind]}</Tag> : null}
            </span>
            {shown ? <ProofLine proof={row.proof} compact={!wide} /> : <span className={styles.locked}>What was found, with its link and date, comes with Paid.</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function GoodList({ items, empty = 'Nothing is Strong here yet. The fixes are the quickest way there.' }: { items: readonly Good[]; empty?: string }) {
  if (!items.length) return <p className={styles.quiet}>{empty}</p>;
  return (
    <ul className={styles.good}>
      {items.map((item) => (
        <li key={item.id} className={styles.goodRow}>
          <Icon name="check" size={16} className={styles.goodIcon} />
          <span>
            <span className={styles.goodTitle}>{item.title}</span>
            <span className={styles.goodLine}>{item.line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A fix as a row: what to do, where, its impact and effort, opening its panel. */
export function FixRow({ fix, href, actions, index }: { fix: Fix; href?: string; actions?: ReactNode; index?: number }) {
  const body = (
    <>
      <span className={styles.fixLabel}>
        {fix.checkKey ? <CheckIcon check={fix.checkKey} size={14} /> : <Icon name={fix.place === 'other' ? 'globe' : 'forum'} size={14} />}
        {fix.label}
      </span>
      <span className={styles.fixTitle}>{fix.title}</span>
      <ImpactTags impact={fix.impact} effort={fix.effort} programs={fix.programs} />
    </>
  );
  return (
    <li className={styles.fixRow}>
      {index !== undefined ? <span className={`${styles.fixIndex} num`}>{index}</span> : null}
      {href ? (
        <Link href={href} className={styles.fixBody}>
          {body}
        </Link>
      ) : (
        <span className={styles.fixBody}>{body}</span>
      )}
      {actions ? <span className={styles.fixActions}>{actions}</span> : href ? <Icon name="chevronRight" size={18} className={styles.fixChevron} /> : null}
    </li>
  );
}

export function FixList({ fixes, href, numbered = false, actions }: { fixes: readonly Fix[]; href?: string; numbered?: boolean; actions?: (fix: Fix) => ReactNode }) {
  if (!fixes.length) return <p className={styles.quiet}>Nothing to fix here. Keep it this way.</p>;
  return (
    <ol className={styles.fixes}>
      {fixes.map((fix, index) => (
        <FixRow key={fix.id} fix={fix} href={href} index={numbered ? index + 1 : undefined} actions={actions?.(fix)} />
      ))}
    </ol>
  );
}

export function FixActions({ fix, client = false }: { fix: Fix; client?: boolean }) {
  return (
    <>
      <Button variant="secondary" size="sm" icon="check">
        Mark as done
      </Button>
      {client ? null : fix.askedOn ? (
        <span className={styles.asked}>Sent {fix.askedOn}</span>
      ) : (
        <Button variant="quiet" size="sm" icon="wrench">
          Let AdmitLabs fix this
        </Button>
      )}
    </>
  );
}

export function PlaceHead({ place, id }: { place: Place; id?: string }) {
  const checks = place.found.filter((row) => row.key).length;
  const counts = place.info.scored
    ? `${checks} ${checks === 1 ? 'check' : 'checks'} · ${place.good.length} good · ${place.fixes.length} to fix`
    : `${place.found.length} found · ${place.fixes.length} to fix`;
  return (
    <div className={styles.placeHead}>
      <div className={styles.placeHeadText}>
        <h3 id={id} className={styles.placeTitle}>
          <Icon name={place.info.icon} size={18} />
          {place.info.name}
        </h3>
        <p className={styles.placeCovers}>{place.info.covers}</p>
      </div>
      <p className={styles.placeCounts}>
        {counts}
        {place.info.scored ? null : <span className={styles.notScored}>Not part of the three words</span>}
      </p>
    </div>
  );
}

export function ThinState({ thin }: { thin: Thin }) {
  return (
    <div className={styles.thin}>
      <p className={styles.thinTitle}>{thin.title}</p>
      <p className={styles.thinText}>{thin.why}</p>
      <p className={styles.thinLabel}>What helps</p>
      <ul className={styles.thinList}>
        {thin.helps.map((help) => (
          <li key={help}>{help}</li>
        ))}
      </ul>
      <p className={styles.thinNext}>{thin.next}</p>
    </div>
  );
}

function readyText(ready: ReadyFix): string {
  if (ready.kind === 'text') return ready.text;
  if (ready.kind === 'outline') return [ready.title, ...ready.items.map((item) => `${item.heading}: ${item.line}`)].join('\n');
  return [ready.title, ready.head.join(' | '), ...ready.rows.map((row) => row.join(' | ')), ready.note ?? ''].filter(Boolean).join('\n');
}

/** The ready fix: text or a layout to copy, with blanks in [brackets]. */
export function ReadyFixView({ ready }: { ready: ReadyFix }) {
  return (
    <div className={styles.ready}>
      <div className={styles.readyHead}>
        <p className={styles.readyTitle}>{ready.title}</p>
        <CopyButton text={readyText(ready)} />
      </div>
      {ready.kind === 'text' ? <p className={styles.readyText}>{ready.text}</p> : null}
      {ready.kind === 'outline' ? (
        <ol className={styles.readyOutline}>
          {ready.items.map((item) => (
            <li key={item.heading}>
              <span className={styles.readyHeading}>{item.heading}</span>
              <span className={styles.readyLine}>{item.line}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {ready.kind === 'table' ? (
        <div className={styles.readyTableWrap}>
          <table className={styles.readyTable}>
            <thead>
              <tr>
                {ready.head.map((cell, index) => (
                  <th key={index}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ready.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {ready.note ? <p className={styles.readyNote}>{ready.note}</p> : null}
        </div>
      ) : null}
      <p className={styles.readyFoot}>Uses the details added by you where there are any. Fill the blanks in [brackets].</p>
    </div>
  );
}

export function ProgramPills({ programs, all = 'All programs', locked = false }: { programs: readonly string[]; all?: string | null; locked?: boolean }) {
  return (
    <div className={styles.pills} role="tablist" aria-label="Programs">
      {all ? (
        <span className={[styles.pill, styles.pillActive].join(' ')} role="tab" aria-selected="true">
          {all}
        </span>
      ) : null}
      {programs.map((program, index) => (
        <span key={program} className={[styles.pill, !all && index === 0 ? styles.pillActive : ''].join(' ')} role="tab" aria-selected={!all && index === 0}>
          {program}
        </span>
      ))}
      {locked ? (
        <span className={[styles.pill, styles.pillLocked].join(' ')}>
          <Icon name="lock" size={12} />
          2 more with Paid
        </span>
      ) : null}
    </div>
  );
}

/** A result as words, before and after: "Weak to Okay". */
export function Moved({ before, after }: { before: CheckResult; after: CheckResult }) {
  return (
    <span className={styles.moved}>
      {RESULT_LABELS[before]}
      <Icon name="arrowRight" size={14} />
      <span className={styles.movedAfter}>{RESULT_LABELS[after]}</span>
    </span>
  );
}

export function fmt(iso: string): string {
  return formatDate(iso);
}
