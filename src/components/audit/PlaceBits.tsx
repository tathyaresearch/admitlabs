// The pieces the Audit by place is built from, as the version 2 mock was approved (spec 7.6 to
// 7.8): the three words, a fix as a row, what we found with its proof, what's good, a place's head,
// the kind words when little is found, and the ready fix. Server safe. Every shape has its word or
// number beside it, and nothing here shows what the plan does not include.

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { FixView, FoundRowView, GoodView, PlaceView, ProofView, ThinView, WordView } from '@/audit/places';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { formatDate, hostAndPath } from '@/domain/format';
import { readyFixText, type ReadyFix } from '@/domain/ready-fix';
import { EFFORT_LABELS, FINDING_KIND_LABELS, IMPACT_LABELS, RESULT_LABELS, type CheckResult, type Difficulty, type FindingKind, type Impact, type Pillar, type Place } from '@/domain/types';
import { CopyButton } from './CopyButton';
import styles from './places.module.css';

export const PLACE_ICONS: Readonly<Record<Place, IconName>> = {
  website: 'webPage',
  google: 'searchResults',
  social: 'share',
  people: 'forum',
  other: 'globe',
};

const WORD_ICONS: Readonly<Record<Pillar, IconName>> = { discovered: 'compass', trusted: 'shield', chosen: 'target' };

export function Tag({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <span className={[styles.tag, strong ? styles.tagStrong : ''].join(' ')}>{children}</span>;
}

export function ImpactTags({ impact, effort, programs = [] }: { impact: Impact | null; effort: Difficulty | null; programs?: readonly string[] }) {
  return (
    <span className={styles.tags}>
      {impact ? <Tag strong={impact === 'high'}>Impact {IMPACT_LABELS[impact]}</Tag> : null}
      {effort ? <Tag>Effort {EFFORT_LABELS[effort]}</Tag> : null}
      {programs.slice(0, 3).map((program) => (
        <Tag key={program}>{program}</Tag>
      ))}
      {programs.length > 3 ? <Tag>{programs.length - 3} more</Tag> : null}
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
export function WordTiles({ words, compact = false, fixHref }: { words: readonly WordView[]; compact?: boolean; fixHref?: (key: string) => string }) {
  return (
    <div className={[styles.wordTiles, compact ? styles.wordTilesCompact : ''].join(' ')}>
      {words.map((word) => (
        <div key={word.pillar} className={styles.wordTile}>
          <p className={styles.wordName}>
            <Icon name={WORD_ICONS[word.pillar]} size={16} />
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
              {fixHref ? (
                <Link href={fixHref(word.fixFirst.key)} scroll={false} className={styles.wordFixLink}>
                  {word.fixFirst.name}, {RESULT_LABELS[word.fixFirst.result]}
                </Link>
              ) : (
                <>
                  {word.fixFirst.name}, {RESULT_LABELS[word.fixFirst.result]}
                </>
              )}
            </p>
          ) : (
            <p className={styles.wordFix}>Every check here is Strong.</p>
          )}
        </div>
      ))}
    </div>
  );
}

/** "What do these mean?": the words and their questions, what makes each Strong, Okay or Weak, and a check's four results. */
export function WordsMeaning() {
  return (
    <details className={styles.meaning}>
      <summary className={styles.meaningSummary}>
        <Icon name="info" size={16} />
        What do these mean?
      </summary>
      <div className={styles.meaningBody}>
        <dl className={styles.meaningList}>
          <div>
            <dt>Visibility</dt>
            <dd>Can students find you? Search from your city, your Google profile, Instagram, YouTube, Facebook and AI answers.</dd>
          </div>
          <div>
            <dt>Trust</dt>
            <dd>Do they believe you? Placements, reviews and rating, approvals, faculty, and students in your posts.</dd>
          </div>
          <div>
            <dt>Chosen</dt>
            <dd>Is it easy to pick you? Program pages, fees, admission steps, enquiry, and your website on a phone.</dd>
          </div>
        </dl>
        <p className={styles.quiet}>Each word comes from the checks behind it, out of 100: Strong from 70, Okay from 40, Weak below 40.</p>
        <p className={styles.quiet}>Each check is Strong, Okay, Weak or Missing: Strong earns all of its points, Okay 60%, Weak 30% and Missing none.</p>
      </div>
    </details>
  );
}

export function ProofLine({ proof, compact = false }: { proof: ProofView; compact?: boolean }) {
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
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : null}
        {proof.date ? <span>Checked {formatDate(proof.date)}</span> : null}
        {proof.byTeam ? <span className={styles.byTeam}>Checked by the AdmitLabs team</span> : null}
      </span>
    </span>
  );
}

function findingIcon(kind: FindingKind | null): IconName {
  return kind === 'listing' || kind === 'news' || kind === 'directory' ? 'globe' : 'forum';
}

/** What we found: every check with its bar and word, every finding with its kind, each with its proof. */
export function FoundList({ rows, wide = false, hrefFor }: { rows: readonly FoundRowView[]; wide?: boolean; hrefFor?: (row: FoundRowView) => string | null }) {
  return (
    <ul className={[styles.found, wide ? styles.foundWide : ''].join(' ')}>
      {rows.map((row) => {
        const href = hrefFor?.(row) ?? null;
        const name = (
          <>
            {row.checkKey ? <CheckIcon check={row.checkKey} size={15} /> : <Icon name={findingIcon(row.findingKind)} size={15} className={styles.muted} />}
            {row.name}
          </>
        );
        return (
          <li key={row.id} className={styles.foundRow}>
            <span className={styles.foundHead}>
              <span className={styles.foundName}>
                {href ? (
                  <Link href={href} scroll={false} className={styles.foundLink}>
                    {name}
                  </Link>
                ) : (
                  name
                )}
                {row.weakestProgram ? <span className={styles.foundWeakest}>Weakest: {row.weakestProgram}</span> : null}
              </span>
              {row.result ? (
                <ResultBar result={row.result} share={row.share ?? undefined} showPoints={false} size="sm" />
              ) : row.findingKind ? (
                <Tag strong={row.findingKind === 'bad' || row.findingKind === 'unanswered'}>{FINDING_KIND_LABELS[row.findingKind]}</Tag>
              ) : null}
            </span>
            {row.proof ? <ProofLine proof={row.proof} compact={!wide} /> : <span className={styles.locked}>What was found, with its link and date, comes with Paid.</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function GoodList({ items, empty = 'Nothing is Strong here yet. The fixes are the quickest way there.' }: { items: readonly GoodView[]; empty?: string }) {
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
export function FixRow({ fix, href, actions, index }: { fix: FixView; href?: string | null; actions?: ReactNode; index?: number }) {
  const body = (
    <>
      <span className={styles.fixLabel}>
        {fix.checkKey ? <CheckIcon check={fix.checkKey} size={14} /> : <Icon name={findingIcon(fix.findingKind)} size={14} />}
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
        <Link href={href} scroll={false} className={styles.fixBody}>
          {body}
        </Link>
      ) : (
        <span className={styles.fixBody}>{body}</span>
      )}
      {actions ? <span className={styles.fixActions}>{actions}</span> : href ? <Icon name="chevronRight" size={18} className={styles.fixChevron} /> : null}
    </li>
  );
}

export function FixList({
  fixes,
  hrefFor,
  numbered = false,
  actions,
  empty = 'Nothing to fix here. Keep it this way.',
}: {
  fixes: readonly FixView[];
  hrefFor?: (fix: FixView) => string | null;
  numbered?: boolean;
  actions?: (fix: FixView) => ReactNode;
  empty?: string;
}) {
  if (!fixes.length) return <p className={styles.quiet}>{empty}</p>;
  return (
    <ol className={styles.fixes}>
      {fixes.map((fix, index) => (
        <FixRow key={fix.id} fix={fix} href={hrefFor?.(fix) ?? null} index={numbered ? index + 1 : undefined} actions={actions?.(fix)} />
      ))}
    </ol>
  );
}

export function PlaceHead({ place, id }: { place: PlaceView; id?: string }) {
  const checks = place.found.filter((row) => row.kind === 'check').length;
  const fixes = place.fixes.length + place.hidden.fixes;
  const counts = place.scored
    ? `${checks} ${checks === 1 ? 'check' : 'checks'} · ${place.good.length} good · ${fixes} to fix`
    : `${place.found.length + place.hidden.found} found · ${fixes} to fix`;
  return (
    <div className={styles.placeHead}>
      <div className={styles.placeHeadText}>
        <h3 id={id} className={styles.placeTitle}>
          <Icon name={PLACE_ICONS[place.key]} size={18} />
          {place.name}
        </h3>
        <p className={styles.placeCovers}>{place.covers}</p>
      </div>
      <p className={styles.placeCounts}>
        {counts}
        {place.scored ? null : <span className={styles.notScored}>Not part of the three words</span>}
      </p>
    </div>
  );
}

export function ThinState({ thin }: { thin: ThinView }) {
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

/**
 * The ready fix: text or a layout to copy, with blanks in [brackets]. `ownDetails` is false where
 * the reader has added nothing in Settings (a prospect's shared Audit), so the note leaves that out.
 */
export function ReadyFixView({ ready, ownDetails = true }: { ready: ReadyFix; ownDetails?: boolean }) {
  return (
    <div className={styles.ready}>
      <div className={styles.readyHead}>
        <p className={styles.readyTitle}>{ready.title}</p>
        <CopyButton text={readyFixText(ready)} />
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
      <p className={styles.readyFoot}>
        {ownDetails ? (ready.fromDetails ? 'Filled in from the details added by you. ' : 'Uses the details added by you where there are any. ') : null}
        Fill the blanks in [brackets].
      </p>
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
