// The AdmitLabs team's side of a Client Brain (spec section 26): the Client Brain tab on a Client's
// page (or Start onboarding), onboarding on top of the Brain (how complete it is, what is missing,
// the checklist, Mark as Ready), what Drishti found to confirm, correct or take out, and the
// team's own notes that the college never sees.

import Link from 'next/link';
import { describeItem, shortValue } from '@/brain/facts';
import { aboutInputs, factInputs, type InputSpec } from '@/brain/form-spec';
import { afterReadySteps } from '@/brain/blueprint';
import { personName, sectionName } from '@/brain/history';
import { STEPS, STEP_INFO, sectionOf, type AnyBrainItem, type BrainFields } from '@/brain/model';
import { stepBlocked } from '@/brain/progress';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { KpiBar } from '@/components/ui/Kpi';
import { formatDate, hostAndPath } from '@/domain/format';
import {
  addTeamNoteAction,
  confirmFoundAction,
  correctFoundAction,
  markReadyAction,
  notRightAction,
  removeTeamNoteAction,
  saveFactAction,
  setStepAction,
  startOnboardingAction,
  type FormContext,
} from '@/lib/brain/actions';
import type { BrainPage } from '@/lib/brain/page';
import { Band, brainHref } from './Bits';
import { FactForm } from './FactForm';
import styles from './brain.module.css';

export function BrainTab({ institutionId, page, name }: { institutionId: string; page: BrainPage | null; name: string }) {
  if (!page) {
    return (
      <EmptyState
        icon="brain"
        title="No Client Brain yet"
        headingLevel={3}
        action={
          <form action={startOnboardingAction.bind(null, institutionId)}>
            <Button type="submit" icon="plus">
              Start onboarding
            </Button>
          </form>
        }
      >
        Drishti fills in what it already knows from {name}’s latest Audit: fees and program pages, the approvals held, the placements page and listings. You confirm each one, then fill the rest with them on the kickoff call.
      </EmptyState>
    );
  }
  const base = `/team/institutions/${institutionId}/brain`;
  const ready = page.brain.status === 'ready';
  return (
    <div className={styles.tabBody}>
      <Band
        label="Client Brain"
        cells={[
          { label: 'Status', word: ready ? 'Ready' : 'Onboarding', note: ready && page.brain.ready ? `Since ${formatDate(page.brain.ready.at)}` : `Started ${formatDate(page.brain.started.at)}` },
          { label: 'Client Brain', number: page.progress.percent, suffix: '%', bar: page.progress.percent, note: page.progress.missing.length ? `${page.progress.missing.length} missing` : 'Nothing missing' },
          ready
            ? { label: 'Needs checking', number: page.stale.length, suffix: page.stale.length === 1 ? 'fact' : 'facts', note: page.season ? `Before admissions open on ${formatDate(page.season)}` : 'Fees and dates every 6 months' }
            : { label: 'Checklist', number: page.brain.steps.size, suffix: `of ${STEPS.length}`, note: page.brain.steps.size === STEPS.length ? 'Done' : `${STEPS.length - page.brain.steps.size} to go` },
        ]}
      />
      <div className={styles.formActions}>
        <ButtonLink href={base} iconAfter="arrowRight">
          Open the Client Brain
        </ButtonLink>
        {ready ? null : (
          <ButtonLink href={`${base}/kickoff`} variant="secondary">
            Kickoff call
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

/** After Mark as Ready (spec section 26): the Blueprint shared, then approved. They never hold Ready back. */
export function AfterReadyCard({ page, base }: { page: BrainPage; base: string }) {
  const steps = afterReadySteps(page.blueprints);
  const next = steps.find((step) => !step.done);
  return (
    <section className={styles.group} aria-labelledby="after-ready">
      <div className={styles.groupHead}>
        <h2 id="after-ready" className={styles.groupTitle}>
          After Ready
        </h2>
        <span className={`${styles.count} num`}>
          {steps.filter((step) => step.done).length}/{steps.length}
        </span>
      </div>
      <ul className={styles.blueprintSteps}>
        {steps.map((step) => (
          <li key={step.key} className={styles.blueprintStep}>
            <Icon name={step.done ? 'checkCircle' : 'stopwatch'} size={16} />
            <span className={step.done ? styles.blueprintStepDone : undefined}>{step.name}</span>
            <span className={styles.blueprintStepWhen}>{step.done && step.at ? formatDate(step.at) : 'Not yet'}</span>
          </li>
        ))}
      </ul>
      {next ? (
        <p className={styles.groupNote}>
          {next.key === 'shared' ? 'Upload the Blueprint and share it with the college.' : 'The college approves it in their Brain, or asks for changes.'}{' '}
          <Link href={brainHref(base, { section: 'blueprint' })} className={styles.quietLink}>
            Open the Blueprint
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function OnboardingCard({ page, base }: { page: BrainPage; base: string }) {
  const ctx: FormContext = { institutionId: page.brain.institution.id, returnTo: base };
  const who = (id: string | null) => (id ? personName(page.people.get(id)) : 'Drishti');
  const done = page.brain.steps.size;
  return (
    <section className={styles.onboard} aria-labelledby="onboarding">
      <div className={styles.onboardMain}>
        <h2 id="onboarding" className={styles.onboardLabel}>
          Onboarding
        </h2>
        <p className={styles.onboardBig}>
          Client Brain <span className="num">{page.progress.percent}%</span> complete
        </p>
        <KpiBar value={page.progress.percent} />
        <h3 className={styles.onboardSub}>What’s missing</h3>
        {page.progress.missing.length ? (
          <ul className={styles.missingList}>
            {page.progress.missing.map((slot) => (
              <li key={slot.key}>
                <Link href={brainHref(base, { section: slot.section })} className={styles.missingItem} scroll={false}>
                  <span className={styles.missingName}>{slot.label}</span>
                  <span className={styles.rowWhere}>{sectionName(slot.section)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.groupNote}>Nothing. Every must-have fact is in, or marked as not applying.</p>
        )}
        <p className={styles.groupNote}>The college can fill most of these on its Help us know you form.</p>
      </div>
      <div className={styles.onboardSteps}>
        <h3 className={styles.onboardSub}>
          Checklist
          <span className={`${styles.count} num`}>
            {done} of {STEPS.length}
          </span>
        </h3>
        <ol className={styles.steps}>
          {STEPS.map((step) => {
            const stamp = page.brain.steps.get(step);
            const blocked = !stamp && stepBlocked(step, page.brain);
            const info = STEP_INFO[step];
            return (
              <li key={step} className={styles.step}>
                <span className={stamp ? styles.stepTick : styles.stepRing} aria-hidden="true">
                  {stamp ? <Icon name="check" size={12} /> : null}
                </span>
                <span className={styles.stepText}>
                  <span className={styles.stepName}>
                    {info.name}
                    <span className="visually-hidden">{stamp ? ', done' : ', to do'}</span>
                  </span>
                  {info.note ? <span className={styles.stepNote}>{info.note}</span> : null}
                  <span className={styles.stepNote}>{stamp ? `Ticked by ${who(stamp.by)}, ${formatDate(stamp.at)}` : blocked ? info.needs : 'Not yet'}</span>
                </span>
                <form action={setStepAction.bind(null, { ...ctx, step, done: !stamp })} className={styles.inlineForm}>
                  <Button type="submit" size="sm" variant={stamp ? 'quiet' : 'secondary'} disabled={blocked}>
                    {stamp ? 'Untick' : 'Tick'}
                    <span className="visually-hidden">: {info.name}</span>
                  </Button>
                </form>
              </li>
            );
          })}
        </ol>
      </div>
      <div className={styles.onboardFoot}>
        <form action={markReadyAction.bind(null, ctx)} className={styles.inlineForm}>
          <Button type="submit" icon="checkCircle" disabled={!page.ready.ready}>
            Mark as Ready
          </Button>
        </form>
        <p className={styles.groupNote}>
          {page.ready.ready
            ? 'Everything is in. The college sees “Ready” and gets a note in Notifications.'
            : `Ready once every must-have is in and the checklist is done: ${page.ready.facts} ${page.ready.facts === 1 ? 'fact' : 'facts'} and ${page.ready.steps} ${page.ready.steps === 1 ? 'step' : 'steps'} to go.`}
        </p>
      </div>
    </section>
  );
}

/** What correcting a found fact asks for: the fee, the page, or the approvals. */
function correctInputs(found: BrainFields['found'], page: BrainPage): InputSpec[] {
  if (found.target.endsWith(':fees')) {
    return [
      { name: 'fees_amount', label: 'Fees (₹)', type: 'number', value: found.feesAmount ? String(found.feesAmount) : '', half: true },
      { name: 'fees_period', label: 'For', type: 'select', value: found.feesPeriod ?? 'year', options: [{ value: 'year', label: 'A year' }, { value: 'total', label: 'The full course' }], half: true },
    ];
  }
  if (found.target.endsWith(':page')) return [{ name: 'page_url', label: 'Program page', type: 'url', value: found.pageUrl ?? '' }];
  return aboutInputs(page.brain.details, page.brain.institution.type).filter((input) => ['naac_grade', 'ugc_recognised', 'aicte_approved', 'other_approvals', 'skilling_recognition'].includes(input.name));
}

export function ToConfirm({ page, base, edit }: { page: BrainPage; base: string; edit: string | null }) {
  const items = page.brain.items.filter((item) => item.toConfirm);
  if (!items.length) return null;
  const ctx: FormContext = { institutionId: page.brain.institution.id, returnTo: base };
  return (
    <section className={styles.group} aria-labelledby="to-confirm">
      <div className={styles.groupHead}>
        <h2 id="to-confirm" className={styles.groupTitle}>
          To confirm
          <span className={`${styles.count} num`}>{items.length}</span>
        </h2>
      </div>
      <p className={styles.groupNote}>Drishti found these on their website and in their latest Audit. Confirm each one, correct it, or take it out.</p>
      <ul className={styles.rows}>
        {items.map((item) => {
          const view = describeItem(item, page.brain.programs);
          const correcting = edit === `correct:${item.id}`;
          return (
            <li key={item.id} className={correcting ? `${styles.row} ${styles.rowEditing}` : styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowLabel}>
                  {item.kind === 'found' ? view.label : `${view.label}`}
                  <span className={styles.rowWhere}>{sectionName(sectionOf(item))}</span>
                </p>
                {correcting ? (
                  item.kind === 'found' ? (
                    <FactForm
                      action={correctFoundAction.bind(null, { ...ctx, itemId: item.id })}
                      inputs={correctInputs(item.fields, page)}
                      title={`Drishti found “${item.fields.value}”. Correct it:`}
                      submit="Save and confirm"
                      hidden={page.brain.institution.type === 'skilling' && !item.fields.target.startsWith('program:') ? { has_skilling: '1' } : {}}
                      cancelHref={base}
                    />
                  ) : (
                    <FactForm
                      action={saveFactAction.bind(null, { ...ctx, kind: item.kind as never, itemId: item.id })}
                      inputs={factInputs(item.kind as never, item.fields as never)}
                      title="Correct it:"
                      submit="Save and confirm"
                      cancelHref={base}
                    />
                  )
                ) : (
                  <p className={styles.rowValue}>{shortValue(view)}</p>
                )}
                <p className={styles.rowSource}>
                  <span>
                    Found {item.sourceUrl ? `on ${hostAndPath(item.sourceUrl)}` : 'by Drishti'}
                    {item.foundAt ? `, ${formatDate(item.foundAt)}` : ''}
                  </span>
                </p>
              </div>
              {correcting ? null : (
                <div className={styles.rowActions}>
                  {item.kind === 'found' && item.fields.target.endsWith(':fees') && item.fields.feesAmount === null ? null : (
                    <form action={confirmFoundAction.bind(null, { ...ctx, itemId: item.id })} className={styles.inlineForm}>
                      <Button type="submit" size="sm" variant="secondary" icon="check">
                        Confirm
                      </Button>
                    </form>
                  )}
                  <ButtonLink href={brainHref(base, { edit: `correct:${item.id}` })} size="sm" variant="quiet" icon="pencil" scroll={false}>
                    Correct
                  </ButtonLink>
                  <form action={notRightAction.bind(null, { ...ctx, itemId: item.id })} className={styles.inlineForm}>
                    <Button type="submit" size="sm" variant="quiet" icon="close">
                      Not right
                    </Button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TeamOnlyNotes({ page, base }: { page: BrainPage; base: string }) {
  const ctx: FormContext = { institutionId: page.brain.institution.id, returnTo: brainHref(base, { section: 'notes' }) };
  const short = page.brain.institution.name.split(' ')[0];
  return (
    <section className={`${styles.group} ${styles.teamOnly}`} aria-labelledby="team-only">
      <div className={styles.groupHead}>
        <h3 id="team-only" className={styles.groupTitle}>
          <Icon name="lock" size={16} />
          Team only notes
        </h3>
        <span className={styles.stateTag}>{short} never sees these</span>
      </div>
      <p className={styles.groupNote}>The same notes as the Notes tab on their page.</p>
      {page.teamNotes.length ? (
        <ul className={styles.rows}>
          {page.teamNotes.map((note) => (
            <li key={note.id} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowValue}>{note.body}</p>
                <p className={styles.rowSource}>
                  <span>
                    {note.who}, {formatDate(note.at)}
                  </span>
                </p>
              </div>
              <div className={styles.rowActions}>
                <form action={removeTeamNoteAction.bind(null, { ...ctx, noteId: note.id })} className={styles.inlineForm}>
                  <Button type="submit" size="sm" variant="quiet">
                    Remove
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <FactForm action={addTeamNoteAction.bind(null, ctx)} inputs={[{ name: 'body', label: 'Add a team note', type: 'textarea', placeholder: 'What you heard on a call, or what to watch for.' }]} submit="Add note" />
    </section>
  );
}

export function foundLabel(item: AnyBrainItem, programs: BrainPage['brain']['programs']): string {
  return describeItem(item, programs).label;
}
