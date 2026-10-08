// One Client's Brain (spec section 26), option 1: the sections in a list on the left (a row of
// chips on a phone), one open at a time, each at its own address; the Overview first. The same
// screen for the college (/brain) and the AdmitLabs team (/team/institutions/<id>/brain), with
// Ask the brain at the top and the facts' History in a side panel.

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AskFact, BrainAnswer } from '@/brain/ask';
import { sectionName, type ChangeLine } from '@/brain/history';
import { SECTION_INFO, type BrainSection } from '@/brain/model';
import { BRAIN_RULES } from '@/config/brain';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/domain/format';
import { stillRightAction } from '@/lib/brain/actions';
import type { BrainPage } from '@/lib/brain/page';
import { AskBox, Band, brainHref, NeedsChecking, PasswordNote, SectionHead, SectionNav } from './Bits';
import { HistoryPanel } from './History';
import { SectionBody, sectionFlags, slotEdit } from './Sections';
import styles from './brain.module.css';

export interface ScreenProps {
  page: BrainPage;
  base: string;
  section: BrainSection | 'overview';
  edit: string | null;
  canEdit: boolean;
  team: boolean;
  history: { target: string; title: string; lines: ChangeLine[] } | null;
  asked: { question: string; answer: BrainAnswer; facts: readonly AskFact[] } | null;
  head: ReactNode;
  /** The team's onboarding and what Drishti found, above the sections. */
  top?: ReactNode;
  teamOnly?: ReactNode;
}

/** "Before admissions open on 1 Dec 2026, check 2 facts", or "2 facts need checking". */
function checkTitle(page: BrainPage): string {
  const count = page.stale.length;
  const facts = `${count} ${count === 1 ? 'fact' : 'facts'}`;
  return page.season ? `Before admissions open on ${formatDate(page.season)}, check ${facts}` : `${count === 1 ? '1 fact needs' : `${facts} need`} checking`;
}

export function StatusBand({ page, team }: { page: BrainPage; team: boolean }) {
  const ready = page.brain.status === 'ready';
  return (
    <Band
      label="How complete the Brain is"
      cells={[
        { label: 'Status', word: ready ? 'Ready' : 'Onboarding', note: ready && page.brain.ready ? `Since ${formatDate(page.brain.ready.at)}` : `Started ${formatDate(page.brain.started.at)}` },
        { label: team ? 'Client Brain' : 'Complete', number: page.progress.percent, suffix: '%', bar: page.progress.percent, note: page.progress.missing.length ? `${page.progress.missing.length} ${page.progress.missing.length === 1 ? 'thing' : 'things'} missing` : 'Nothing missing' },
        { label: 'Needs checking', number: page.stale.length, suffix: page.stale.length === 1 ? 'fact' : 'facts', note: page.season ? `Before admissions open on ${formatDate(page.season)}` : page.stale.length ? 'Fees and dates every 6 months' : 'Everything is up to date' },
      ]}
    />
  );
}

function Answer({ asked, page, base }: { asked: NonNullable<ScreenProps['asked']>; page: BrainPage; base: string }) {
  const { answer } = asked;
  const stampOf = (fact: AskFact): string | null => {
    if (fact.stamp.startsWith('blueprint:')) {
      const version = page.blueprints.find((entry) => fact.stamp === `blueprint:${entry.id}`);
      return version ? `${version.status === 'approved' ? 'Approved' : 'Shared'} ${formatDate(version.approvedAt ?? version.sharedAt ?? version.uploadedAt)}` : null;
    }
    if (fact.stamp.startsWith('item:')) {
      const item = page.brain.items.find((entry) => `item:${entry.id}` === fact.stamp);
      return item ? `Checked ${formatDate(item.checkedAt)}` : null;
    }
    const check = page.brain.checks.get(fact.stamp);
    return check ? `Checked ${formatDate(check.at)}` : null;
  };
  return (
    <div className={styles.answer} aria-live="polite">
      <p className={styles.asked}>
        <Icon name="search" size={14} />
        {asked.question}
      </p>
      {answer.facts.length ? (
        <>
          {answer.facts.map((fact) => (
            <div key={fact.key}>
              <p className={styles.answerText}>{fact.answer}</p>
              <p className={styles.answerSource}>
                <span className={styles.answerWhere}>From {fact.where}</span>
                {stampOf(fact) ? <span>{stampOf(fact)}</span> : null}
                {fact.teamOnly ? <span>Team only</span> : null}
                <Link href={brainHref(base, { section: fact.section })} className={styles.quietLink} scroll={false}>
                  Open in the Brain
                  <Icon name="arrowRight" size={14} />
                </Link>
              </p>
            </div>
          ))}
        </>
      ) : (
        <>
          <p className={styles.answerText}>The Brain doesn’t know this yet.</p>
          <p className={styles.answerLine}>{answer.addIn ? `Add it in ${SECTION_INFO[answer.addIn].name}, and the answer is here next time.` : 'Add it to the section it belongs in, and the answer is here next time.'}</p>
          {answer.addIn ? (
            <div className={styles.answerActions}>
              <ButtonLink href={brainHref(base, { section: answer.addIn })} size="sm" variant="secondary" iconAfter="arrowRight">
                Open {SECTION_INFO[answer.addIn].name}
              </ButtonLink>
            </div>
          ) : null}
        </>
      )}
      <p className={styles.quietNote}>Answers come only from the Brain, with where each came from. Never from the internet, and never from Leads.</p>
    </div>
  );
}

function Overview({ page, base, canEdit, team }: { page: BrainPage; base: string; canEdit: boolean; team: boolean }) {
  const ctx = { institutionId: page.brain.institution.id, returnTo: base };
  return (
    <>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          <Icon name="brain" size={20} className={styles.sectionIcon} />
          Overview
        </h2>
        <p className={styles.sectionIntro}>What needs you first, then what changed lately.</p>
      </div>
      <div className={styles.sectionBody}>
        {page.stale.length ? (
          <section className={`${styles.group} ${styles.loud}`} aria-labelledby="to-check">
            <div className={styles.groupHead}>
              <h3 id="to-check" className={styles.groupTitle}>
                <Icon name="history" size={18} />
                {checkTitle(page)}
              </h3>
            </div>
            <p className={styles.groupNote}>
              Fees and dates are checked every {BRAIN_RULES.checkMonths.fees} months, the rest every {BRAIN_RULES.checkMonths.other}, and the Blueprint wants a fresh version every {BRAIN_RULES.blueprint.checkDays} days. If nothing changed, say so with Still right.
            </p>
            <ul className={styles.rows}>
              {page.stale.map((fact) => (
                <li key={fact.key} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowLabel}>
                      {fact.label}
                      <span className={styles.rowWhere}>{sectionName(fact.section)}</span>
                      <NeedsChecking />
                    </p>
                    <p className={styles.rowValue}>{fact.value}</p>
                    <p className={styles.checkLine}>Last checked {formatDate(fact.checkedAt)}.</p>
                  </div>
                  {canEdit && fact.key === 'blueprint' ? (
                    team ? (
                      <div className={styles.rowActions}>
                        <ButtonLink href={brainHref(base, { section: 'blueprint' })} size="sm" variant="secondary" icon="plus" scroll={false}>
                          Upload a new version
                        </ButtonLink>
                      </div>
                    ) : null
                  ) : canEdit ? (
                    <div className={styles.rowActions}>
                      <form action={stillRightAction.bind(null, { ...ctx, fact: fact.key })} className={styles.inlineForm}>
                        <Button type="submit" size="sm" variant="secondary" icon="check">
                          Still right
                        </Button>
                      </form>
                      <ButtonLink href={brainHref(base, { section: fact.section })} size="sm" variant="quiet" icon="pencil" scroll={false}>
                        Update
                      </ButtonLink>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {page.progress.missing.length ? (
          <section className={styles.group} aria-labelledby="missing">
            <div className={styles.groupHead}>
              <h3 id="missing" className={styles.groupTitle}>
                What’s missing
              </h3>
              <span className={`${styles.count} num`}>{page.progress.missing.length}</span>
            </div>
            <ul className={styles.rows}>
              {page.progress.missing.map((slot) => (
                <li key={slot.key} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowLabel}>
                      {slot.label}
                      <span className={styles.rowWhere}>{sectionName(slot.section)}</span>
                    </p>
                    <p className={styles.rowLine}>{slot.line}</p>
                  </div>
                  {canEdit ? (
                    <div className={styles.rowActions}>
                      <ButtonLink href={brainHref(base, { section: slot.section, edit: slotEdit(slot.key, page) })} size="sm" variant="secondary" icon="plus" scroll={false}>
                        Add
                      </ButtonLink>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className={styles.group} aria-labelledby="changes">
          <div className={styles.groupHead}>
            <h3 id="changes" className={styles.groupTitle}>
              Recent changes
            </h3>
          </div>
          {page.recent.length ? (
            <ul className={styles.changes}>
              {page.recent.map((change) => (
                <li key={change.id} className={styles.change}>
                  <span className={`${styles.changeWhen} num`}>{formatDate(change.at).replace(/ \d{4}$/, '')}</span>
                  <span className={styles.changeText}>
                    <span className={styles.changeWhat}>{change.text}</span>
                    <span className={styles.changeWho}>
                      {change.who}
                      <span aria-hidden="true"> · </span>
                      {sectionName(change.section)}
                      {change.teamOnly ? <span> · Team only</span> : null}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.groupNote}>Every change shows here, with who made it and when.</p>
          )}
        </section>
      </div>
    </>
  );
}

export function BrainScreen(props: ScreenProps) {
  const { page, base, section } = props;
  const closeHref = brainHref(base, { section });
  return (
    <div className={styles.page}>
      {props.head}
      {props.top}
      <div className={styles.top}>
        <AskBox action={base} value={props.asked?.question ?? ''} example={props.team ? 'Who approves reels? What did we agree about ads?' : 'What’s the BBA fee? Who approves reels?'} section={section === 'overview' ? null : section} />
        {props.asked ? <Answer asked={props.asked} page={page} base={base} /> : null}
        <PasswordNote team={props.team} />
      </div>
      <StatusBand page={page} team={props.team} />
      <div className={styles.layout}>
        <SectionNav base={base} current={section} flags={sectionFlags(page, props.team)} />
        <div className={styles.layoutBody}>
          {section === 'overview' ? (
            <Overview page={page} base={base} canEdit={props.canEdit} team={props.team} />
          ) : (
            <>
              <SectionHead section={section} />
              <div className={styles.sectionBody}>
                <SectionBody page={page} base={base} section={section} edit={props.edit} canEdit={props.canEdit} team={props.team} teamOnly={section === 'notes' ? props.teamOnly : undefined} />
              </div>
            </>
          )}
        </div>
      </div>
      {props.history ? (
        <HistoryPanel
          title={props.history.title}
          description="Every change, newest first, with who made it and when."
          entries={props.history.lines.map((line) => ({ id: line.id, when: formatDate(line.at), who: line.who, text: line.text, before: line.before, after: line.after }))}
          closeHref={closeHref}
        />
      ) : null}
    </div>
  );
}
