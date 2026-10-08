// The Brain's eight sections (spec section 26), for the college and the AdmitLabs team alike: each
// fact as a row with where it came from and when, Needs checking on old ones, and Edit, Still
// right and History; a missing fact says what to add (or that it doesn't apply). A form opens in
// place of its row (?edit=), the same form everywhere. The kickoff call opens every missing fact's
// form at once.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { aboutRows, describeItem, placementText, programRows, type FactView } from '@/brain/facts';
import { aboutInputs, factInputs, placementInputs, programInputs } from '@/brain/form-spec';
import { personName } from '@/brain/history';
import { DATE_TYPE_LABELS, KIND_LABELS, contactOf, firstOf, itemsOf, sectionOf, type AnyBrainItem, type BrainKind, type BrainSection } from '@/brain/model';
import { brainSlots, type Slot } from '@/brain/progress';
import { programFact } from '@/brain/stale';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate, hostAndPath } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS } from '@/domain/types';
import { WorkList } from '@/components/work/WorkList';
import {
  logScriptAction,
  removeFactAction,
  saveAboutAction,
  saveFactAction,
  saveProgramAction,
  stillRightAction,
  type FormContext,
} from '@/lib/brain/actions';
import type { BrainPage } from '@/lib/brain/page';
import { brainHref, LinkLine, NeedsChecking, StateTag } from './Bits';
import { FactForm } from './FactForm';
import styles from './brain.module.css';

export interface SectionProps {
  page: BrainPage;
  base: string;
  section: BrainSection;
  edit: string | null;
  canEdit: boolean;
  team: boolean;
  /** The kickoff call: every missing fact's form open at once. */
  kickoff?: boolean;
  /** Where a save goes back to (the kickoff call's own step, for example). */
  returnTo?: string;
}

/** What a missing fact's Add opens. */
export function slotEdit(slot: string, page: BrainPage): string {
  if (slot === 'founded' || slot === 'approvals' || slot === 'address') return 'about';
  if (slot === 'contact:main') return 'new:contact:main';
  if (slot === 'contact:approver') return 'new:contact:approver';
  if (slot.startsWith('program:')) return `program:${slot.split(':')[1]}`;
  if (slot === 'awards') return 'new:award';
  if (slot === 'placements') return `placements:${page.brain.programs[0]?.id ?? ''}`;
  if (slot === 'drive') return 'new:link:drive';
  if (slot === 'season') return 'new:date:season';
  return `new:${slot}`;
}

const day = (value: string) => formatDate(value);

function Ctx(props: SectionProps): { form: FormContext; who: (id: string | null) => string; stale: Set<string>; href: (params: { edit?: string | null; history?: string | null }) => string } {
  const returnTo = props.returnTo ?? brainHref(props.base, { section: props.section });
  return {
    form: { institutionId: props.page.brain.institution.id, returnTo },
    who: (id) => (id ? personName(props.page.people.get(id)) : 'Drishti'),
    stale: new Set(props.page.stale.map((fact) => fact.key)),
    href: (params) => (props.kickoff ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}${new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}` : brainHref(props.base, { section: props.section, ...params })),
  };
}

/** Where a fact came from, and when it was last changed or checked. */
function stamp(item: AnyBrainItem, who: (id: string | null) => string): string {
  const parts: string[] = [];
  if (item.source === 'drishti') parts.push(`Found by Drishti${item.sourceUrl ? ` on ${hostAndPath(item.sourceUrl).split('/')[0]}` : ''}${item.foundAt ? `, ${day(item.foundAt)}` : ''}`);
  if (item.viaHelp) parts.push('From Help us know you');
  const changed = Date.parse(item.updatedAt);
  const checked = Date.parse(item.checkedAt);
  if (item.source !== 'drishti' || item.updatedBy) parts.push(`Changed by ${who(item.updatedBy)}, ${day(item.updatedAt)}`);
  if (checked - changed > 60_000) parts.push(`Still right, said ${who(item.checkedBy)}, ${day(item.checkedAt)}`);
  return parts.join('. ');
}

// A fact's row ------------------------------------------------------------------------------------

function ViewBody({ view, itemId }: { view: FactView; itemId?: string }) {
  return (
    <>
      {view.value ? <p className={styles.rowValue}>{view.value}</p> : null}
      {view.chips?.length ? (
        <p className={styles.chips}>
          {view.chips.map((chip) => (
            <span key={chip} className={styles.chip}>
              {chip}
            </span>
          ))}
        </p>
      ) : null}
      {view.swatches?.length ? (
        <ul className={styles.swatches}>
          {view.swatches.map((swatch) => (
            <li key={`${swatch.name}${swatch.hex}`} className={styles.swatchItem}>
              <span className={styles.swatch} style={{ background: swatch.hex }} aria-hidden="true" />
              <span className={styles.swatchName}>{swatch.name}</span>
              <span className={`${styles.swatchHex} num`}>{swatch.hex}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {view.list?.length ? (
        <ul className={styles.factList}>
          {view.list.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      ) : null}
      {view.file && itemId ? (
        <span className={styles.sourceRow}>
          {view.file.image ? (
            // A college's own logo, kept private: shown small, from the Brain's file route.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/brain/file/${itemId}`} alt={`${view.label}: ${view.file.name}`} className={styles.thumb} />
          ) : null}
          <a href={`/brain/file/${itemId}`} className={styles.link} target="_blank" rel="noreferrer">
            {view.file.name}
            <Icon name="download" size={12} />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </span>
      ) : null}
      {view.link ? <LinkLine href={view.link.href} text={view.link.text} /> : null}
      {view.lines.length ? (
        <div className={styles.rowLines}>
          {view.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}

function StillRight({ ctx, fact }: { ctx: FormContext; fact: string }) {
  return (
    <form action={stillRightAction.bind(null, { ...ctx, fact })} className={styles.inlineForm}>
      <Button type="submit" size="sm" variant="secondary" icon="check">
        Still right
      </Button>
    </form>
  );
}

function ItemRow({ item, props, extra }: { item: AnyBrainItem; props: SectionProps; extra?: ReactNode }) {
  const c = Ctx(props);
  const key = `item:${item.id}`;
  if (props.canEdit && props.edit === key && item.kind !== 'found') {
    return (
      <li className={styles.rowForm}>
        <FactForm
          action={saveFactAction.bind(null, { ...c.form, kind: item.kind, itemId: item.id })}
          inputs={factInputs(item.kind, item.fields as never)}
          title={`${KIND_LABELS[item.kind]}: change it`}
          cancelHref={c.href({})}
          remove={removeFactAction.bind(null, { ...c.form, itemId: item.id })}
        />
      </li>
    );
  }
  const view = describeItem(item, props.page.brain.programs);
  const stale = c.stale.has(key);
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <p className={styles.rowLabel}>
          {view.label}
          {view.state ? <StateTag>{view.state}</StateTag> : null}
          {stale ? <NeedsChecking /> : null}
        </p>
        <ViewBody view={view} itemId={item.id} />
        <p className={styles.rowSource}>
          <span>{stamp(item, c.who)}</span>
        </p>
      </div>
      <div className={styles.rowActions}>
        {props.canEdit && stale ? <StillRight ctx={c.form} fact={key} /> : null}
        {extra}
        {props.canEdit ? (
          <ButtonLink href={c.href({ edit: key })} size="sm" variant="quiet" icon="pencil" scroll={false}>
            Edit
          </ButtonLink>
        ) : null}
        <ButtonLink href={c.href({ history: key })} size="sm" variant="quiet" icon="history" scroll={false}>
          History
        </ButtonLink>
      </div>
    </li>
  );
}

/** A fact that is not there yet: what to add, Add, and "Doesn't apply" where it can. In the kickoff call, its form is open. */
function MissingRow({ slot, props, children }: { slot: Slot; props: SectionProps; children?: ReactNode }) {
  const c = Ctx(props);
  const edit = slotEdit(slot.key, props.page);
  if (props.canEdit && props.edit === `skip:${slot.key}`) {
    return (
      <li className={styles.rowForm}>
        <FactForm
          action={saveFactAction.bind(null, { ...c.form, kind: 'skip', itemId: null })}
          inputs={factInputs('skip', null, { slot: slot.key })}
          title={`${slot.label}: doesn’t apply`}
          cancelHref={c.href({})}
        />
      </li>
    );
  }
  if (props.canEdit && (props.kickoff || props.edit === edit) && children) return <li className={styles.rowForm}>{children}</li>;
  return (
    <li className={`${styles.row} ${styles.rowMissing}`}>
      <div className={styles.rowMain}>
        <p className={styles.rowLabel}>
          {slot.label}
          <StateTag>Missing</StateTag>
        </p>
        <p className={styles.rowLine}>{slot.line}</p>
      </div>
      {props.canEdit ? (
        <div className={styles.rowActions}>
          <ButtonLink href={c.href({ edit })} size="sm" variant="secondary" icon="plus" scroll={false}>
            Add
          </ButtonLink>
          {slot.skippable ? (
            <ButtonLink href={c.href({ edit: `skip:${slot.key}` })} size="sm" variant="quiet" scroll={false}>
              Doesn’t apply
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** A new fact's form, or the button that opens it. */
function NewFact({ kind, preset = {}, label, props, edit }: { kind: Exclude<BrainKind, 'found' | 'skip'>; preset?: Record<string, string>; label: string; props: SectionProps; edit: string }) {
  const c = Ctx(props);
  if (!props.canEdit) return null;
  if (props.edit === edit) {
    return (
      <FactForm
        action={saveFactAction.bind(null, { ...c.form, kind, itemId: null })}
        inputs={factInputs(kind, null, preset)}
        title={label}
        cancelHref={c.href({})}
      />
    );
  }
  return (
    <ButtonLink href={c.href({ edit })} size="sm" variant="quiet" icon="plus" scroll={false}>
      {label}
    </ButtonLink>
  );
}

function newForm(kind: Exclude<BrainKind, 'found' | 'skip'>, preset: Record<string, string>, label: string, props: SectionProps) {
  const c = Ctx(props);
  return <FactForm action={saveFactAction.bind(null, { ...c.form, kind, itemId: null })} inputs={factInputs(kind, null, preset)} title={label} cancelHref={props.kickoff ? null : c.href({})} />;
}

function Group({ id, title, note, action, children }: { id: string; title: string; note?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.group} aria-labelledby={`g-${id}`}>
      <div className={styles.groupHead}>
        <h3 id={`g-${id}`} className={styles.groupTitle}>
          {title}
        </h3>
        {action}
      </div>
      {note ? <p className={styles.groupNote}>{note}</p> : null}
      {children}
    </section>
  );
}

/** A single kind of fact: its row, the missing row (when it is a must-have), or a quiet Add. */
function Single({ kind, props, slot, addLabel }: { kind: Exclude<BrainKind, 'found' | 'skip'>; props: SectionProps; slot?: Slot; addLabel: string }) {
  const item = firstOf(props.page.brain, kind);
  if (item) return <ItemRow item={item as AnyBrainItem} props={props} />;
  if (slot && !slot.done) {
    return (
      <MissingRow slot={slot} props={props}>
        {newForm(kind, {}, addLabel, props)}
      </MissingRow>
    );
  }
  if (slot?.skipped) return <SkipRow slot={slot} props={props} />;
  if (!props.canEdit) return null;
  return (
    <li className={styles.addRow}>
      <NewFact kind={kind} label={addLabel} props={props} edit={`new:${kind}`} />
    </li>
  );
}

function SkipRow({ slot, props }: { slot: Slot; props: SectionProps }) {
  const skip = itemsOf(props.page.brain, 'skip').find((item) => item.fields.slot === slot.key);
  if (!skip) return null;
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <p className={styles.rowLabel}>{slot.label}</p>
        <p className={styles.rowValue}>
          Doesn’t apply<span className={styles.rowAside}>{skip.fields.reason}</span>
        </p>
      </div>
      {props.canEdit ? (
        <div className={styles.rowActions}>
          <form action={removeFactAction.bind(null, { ...Ctx(props).form, itemId: skip.id })} className={styles.inlineForm}>
            <Button type="submit" size="sm" variant="quiet">
              It does apply
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

// The details added by you, as Brain rows ----------------------------------------------------------

function AboutGroup({ props, slots }: { props: SectionProps; slots: Slot[] }) {
  const c = Ctx(props);
  const brain = props.page.brain;
  const rows = aboutRows(brain.details, brain.institution.type);
  const editing = props.canEdit && (props.edit === 'about' || (props.kickoff && slots.some((slot) => !slot.done && slotEdit(slot.key, props.page) === 'about')));
  const stale = c.stale.has('about');
  const form = (
    <FactForm
      action={saveAboutAction.bind(null, c.form)}
      inputs={aboutInputs(brain.details, brain.institution.type)}
      title="About the college"
      hidden={brain.institution.type === 'skilling' ? { has_skilling: '1' } : {}}
      cancelHref={props.kickoff ? null : c.href({})}
    />
  );
  return (
    <Group
      id="about"
      title="About the college"
      note="Name, type and city come from Settings, where the owner changes them. The rest is also in Settings: one source."
      action={
        props.canEdit && !editing ? (
          <span className={styles.rowActions}>
            {stale ? <StillRight ctx={c.form} fact="about" /> : null}
            <ButtonLink href={c.href({ edit: 'about' })} size="sm" variant="quiet" icon="pencil" scroll={false}>
              Edit
            </ButtonLink>
            <ButtonLink href={c.href({ history: 'about' })} size="sm" variant="quiet" icon="history" scroll={false}>
              History
            </ButtonLink>
          </span>
        ) : undefined
      }
    >
      {editing ? form : null}
      <div>
        <p className={styles.recordRow}>
          <span className={styles.recordLabel}>Name</span>
          <span>{brain.institution.name}</span>
        </p>
        <p className={styles.recordRow}>
          <span className={styles.recordLabel}>Type</span>
          <span>{INSTITUTION_TYPE_LABELS[brain.institution.type]}</span>
        </p>
        <p className={styles.recordRow}>
          <span className={styles.recordLabel}>City</span>
          <span>
            {brain.institution.city}, {brain.institution.state}
          </span>
        </p>
        {rows.map((row) => (
          <p key={row.key} className={styles.recordRow}>
            <span className={styles.recordLabel}>{row.label}</span>
            <span>{row.value ?? <StateTag>Missing</StateTag>}</span>
            {row.key === 'approvals' && stale ? <NeedsChecking /> : null}
          </p>
        ))}
      </div>
      <ul className={styles.rows}>
        {slots
          .filter((slot) => slot.skipped)
          .map((slot) => (
            <SkipRow key={slot.key} slot={slot} props={props} />
          ))}
        {props.canEdit
          ? slots
              .filter((slot) => !slot.done && slot.skippable && props.edit === `skip:${slot.key}`)
              .map((slot) => <MissingRow key={slot.key} slot={slot} props={props} />)
          : null}
      </ul>
      {props.canEdit && slots.some((slot) => !slot.done && slot.skippable) && !editing ? (
        <p className={styles.sourceRow}>
          {slots
            .filter((slot) => !slot.done && slot.skippable)
            .map((slot) => (
              <ButtonLink key={slot.key} href={c.href({ edit: `skip:${slot.key}` })} size="sm" variant="quiet" scroll={false}>
                {slot.label}: doesn’t apply
              </ButtonLink>
            ))}
        </p>
      ) : null}
    </Group>
  );
}

function ProgramCard({ program, props }: { program: BrainPage['brain']['programs'][number]; props: SectionProps }) {
  const c = Ctx(props);
  const rows = programRows(program.details);
  const missing = rows.some((row) => !row.value && row.key !== 'highlights');
  const editing = props.canEdit && (props.edit === `program:${program.id}` || (props.kickoff && missing));
  const staleRow = (key: string) => (key === 'fees' ? c.stale.has(programFact(program.id, 'fees')) : key === 'dates' ? c.stale.has(programFact(program.id, 'dates')) : c.stale.has(programFact(program.id, 'details')));
  return (
    <section className={styles.group} aria-label={program.name}>
      <div className={styles.groupHead}>
        <div className={styles.programHead}>
          <h3 className={styles.groupTitle}>
            {program.name}
            {program.push ? <StateTag>Push most</StateTag> : null}
          </h3>
          <p className={styles.rowSource}>
            <span className={styles.shared}>Also in Settings</span>
          </p>
        </div>
        {props.canEdit && !editing ? (
          <div className={styles.rowActions}>
            <ButtonLink href={c.href({ edit: `program:${program.id}` })} size="sm" variant="quiet" icon="pencil" scroll={false}>
              Edit
            </ButtonLink>
            <ButtonLink href={c.href({ history: `program:${program.id}` })} size="sm" variant="quiet" icon="history" scroll={false}>
              History
            </ButtonLink>
          </div>
        ) : null}
      </div>
      {editing ? (
        <FactForm
          action={saveProgramAction.bind(null, { ...c.form, programId: program.id })}
          inputs={programInputs(program.details, program.push)}
          title={`${program.name}: details`}
          hidden={{ has_push: '1' }}
          cancelHref={props.kickoff ? null : c.href({})}
        />
      ) : null}
      <dl className={styles.programFacts}>
        {rows.map((row) => {
          const stale = Boolean(row.value) && staleRow(row.key) && (row.key === 'fees' || row.key === 'dates');
          const group = row.key === 'fees' ? 'fees' : row.key === 'dates' ? 'dates' : 'details';
          return (
            <div key={row.key} className={row.value ? styles.programRow : `${styles.programRow} ${styles.programMissing}`}>
              <dt>{row.label}</dt>
              <dd>
                {row.value ? <span className={styles.programValue}>{row.value}</span> : <span className={styles.programAdd}>{row.key === 'highlights' ? <span className={styles.rowAside}>Optional</span> : <StateTag>Missing</StateTag>}</span>}
                {stale ? (
                  <span className={styles.programCheck}>
                    <NeedsChecking />
                    {props.canEdit ? <StillRight ctx={c.form} fact={programFact(program.id, group)} /> : null}
                  </span>
                ) : null}
              </dd>
            </div>
          );
        })}
        {c.stale.has(programFact(program.id, 'details')) ? (
          <div className={styles.programRow}>
            <dt>Checked</dt>
            <dd>
              <span className={styles.programCheck}>
                <NeedsChecking />
                {props.canEdit ? <StillRight ctx={c.form} fact={programFact(program.id, 'details')} /> : null}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

// Each section ------------------------------------------------------------------------------------

function Basics(props: SectionProps) {
  const brain = props.page.brain;
  const slots = brainSlots(brain).filter((slot) => slot.section === 'basics');
  const slot = (key: string) => slots.find((entry) => entry.key === key);
  const main = contactOf(brain, 'main');
  const approver = contactOf(brain, 'approver');
  const others = itemsOf(brain, 'contact').filter((item) => !item.toConfirm && item.fields.role === 'other');
  const contactSlot = (key: 'contact:main' | 'contact:approver', role: string, label: string) => {
    const entry = slot(key);
    return entry && !entry.done ? (
      <MissingRow slot={entry} props={props}>
        {newForm('contact', { role }, label, props)}
      </MissingRow>
    ) : null;
  };
  return (
    <>
      <AboutGroup props={props} slots={slots.filter((entry) => entry.key === 'founded' || entry.key === 'approvals' || entry.key === 'address')} />
      <Group id="contacts" title="Contacts" action={<NewFact kind="contact" preset={{ role: 'other' }} label="Add a contact" props={props} edit="new:contact:other" />}>
        <ul className={styles.rows}>
          {main ? <ItemRow item={main as AnyBrainItem} props={props} /> : contactSlot('contact:main', 'main', 'Main contact')}
          {approver ? <ItemRow item={approver as AnyBrainItem} props={props} /> : contactSlot('contact:approver', 'approver', 'Who approves our content')}
          {others.map((item) => (
            <ItemRow key={item.id} item={item as AnyBrainItem} props={props} />
          ))}
          <Single kind="talk" props={props} slot={slot('talk')} addLabel="How they like to talk" />
        </ul>
      </Group>
      <Group id="goals" title="Goals" note="What the college wants this year. The team plans every month against it.">
        <ul className={styles.rows}>
          <Single kind="goals" props={props} slot={slot('goals')} addLabel="Top goals this year" />
          <Single kind="target" props={props} slot={slot('target')} addLabel="Admission target" />
          <Single kind="rivals" props={props} addLabel="Add main rivals" />
          <Single kind="regions" props={props} addLabel="Add where students should come from" />
        </ul>
      </Group>
    </>
  );
}

function Programs(props: SectionProps) {
  const programs = props.page.brain.programs;
  return (
    <>
      {programs.map((program) => (
        <ProgramCard key={program.id} program={program} props={props} />
      ))}
      <p className={styles.groupNote}>A program missing here? {props.team ? 'The college’s owner adds it' : 'The owner adds it'} in Settings, Programs: it changes what the Audit checks.</p>
    </>
  );
}

function Brand(props: SectionProps) {
  const slots = brainSlots(props.page.brain).filter((slot) => slot.section === 'brand');
  const slot = (key: string) => slots.find((entry) => entry.key === key);
  return (
    <>
      <Group id="look" title="Look">
        <ul className={styles.rows}>
          <Single kind="logo" props={props} slot={slot('logo')} addLabel="Logo" />
          <Single kind="colours" props={props} slot={slot('colours')} addLabel="Colours" />
          <Single kind="fonts" props={props} addLabel="Add the fonts" />
          <Single kind="tagline" props={props} addLabel="Add the tagline" />
          <Single kind="guidelines" props={props} addLabel="Add brand guidelines" />
        </ul>
      </Group>
      <Group id="voice" title="Voice" note="Ready fixes and Make these 3 follow it.">
        <ul className={styles.rows}>
          <Single kind="tone" props={props} slot={slot('tone')} addLabel="Tone" />
          <Single kind="avoid" props={props} slot={slot('avoid')} addLabel="Words or topics to avoid" />
          <Single kind="dos" props={props} addLabel="Add what to do" />
        </ul>
      </Group>
    </>
  );
}

function List({ kind, props, empty }: { kind: Exclude<BrainKind, 'found' | 'skip'>; props: SectionProps; empty?: string }) {
  const items = itemsOf(props.page.brain, kind).filter((item) => !item.toConfirm);
  if (!items.length) return empty ? <p className={styles.groupNote}>{empty}</p> : null;
  return (
    <ul className={styles.rows}>
      {items.map((item) => (
        <ItemRow key={item.id} item={item as AnyBrainItem} props={props} />
      ))}
    </ul>
  );
}

function Proof(props: SectionProps) {
  const c = Ctx(props);
  const brain = props.page.brain;
  const slots = brainSlots(brain).filter((slot) => slot.section === 'proof');
  const slot = (key: string) => slots.find((entry) => entry.key === key);
  const approvals = aboutRows(brain.details, brain.institution.type).find((row) => row.key === 'approvals')?.value ?? null;
  const awards = slot('awards');
  const placements = slot('placements');
  const editing = props.edit?.startsWith('placements:') ? props.edit.slice(11) : null;
  return (
    <>
      <Group id="awards" title="Approvals, rankings and awards" action={<NewFact kind="award" label="Add a ranking or award" props={props} edit="new:award" />}>
        <p className={styles.recordRow}>
          <span className={styles.recordLabel}>{brain.institution.type === 'skilling' ? 'Recognition' : 'Approvals'}</span>
          <span>{approvals ?? <StateTag>Missing</StateTag>}</span>
          <span className={styles.shared}>Also in Settings</span>
        </p>
        {awards && !awards.done ? (
          <ul className={styles.rows}>
            <MissingRow slot={awards} props={props}>
              {newForm('award', {}, 'A ranking or award', props)}
            </MissingRow>
          </ul>
        ) : awards?.skipped ? (
          <ul className={styles.rows}>
            <SkipRow slot={awards} props={props} />
          </ul>
        ) : (
          <List kind="award" props={props} />
        )}
      </Group>
      <Group id="placements" title="Placements" note="Each program’s placements are also in Settings. A list can be a link." action={<NewFact kind="placement_list" label="Add a placement list" props={props} edit="new:placement_list" />}>
        <dl className={styles.programFacts}>
          {brain.programs.map((program) => (
            <div key={program.id} className={styles.programRow}>
              <dt>{program.name}</dt>
              <dd>
                {props.canEdit && (editing === program.id || (props.kickoff && placements && !placements.done)) ? (
                  <FactForm
                    action={saveProgramAction.bind(null, { ...c.form, programId: program.id })}
                    inputs={placementInputs(program.details)}
                    title={`${program.name}: placements`}
                    cancelHref={props.kickoff ? null : c.href({})}
                  />
                ) : (
                  <span className={styles.programAdd}>
                    <span className={styles.programValue}>{placementText(program.details) ?? 'Not added yet'}</span>
                    {props.canEdit ? (
                      <ButtonLink href={c.href({ edit: `placements:${program.id}` })} size="sm" variant="quiet" icon="pencil" scroll={false}>
                        {placementText(program.details) ? 'Edit' : 'Add'}
                      </ButtonLink>
                    ) : null}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {placements?.skipped ? (
          <ul className={styles.rows}>
            <SkipRow slot={placements} props={props} />
          </ul>
        ) : null}
        {placements && !placements.done && props.canEdit && placements.skippable ? (
          <p className={styles.sourceRow}>
            <ButtonLink href={c.href({ edit: `skip:${placements.key}` })} size="sm" variant="quiet" scroll={false}>
              Placements: doesn’t apply
            </ButtonLink>
          </p>
        ) : null}
        {props.edit === `skip:placements` ? (
          <ul className={styles.rows}>
            <MissingRow slot={placements as Slot} props={props} />
          </ul>
        ) : null}
        <List kind="placement_list" props={props} />
      </Group>
      <Group id="alumni" title="Known alumni" note="A line and a link each. No phone numbers or emails: student details stay in Leads." action={<NewFact kind="alumnus" label="Add an alumnus" props={props} edit="new:alumnus" />}>
        <List kind="alumnus" props={props} empty="None added yet." />
      </Group>
      <Group id="reviews" title="Student reviews we may use" note="Only with the student’s agreement." action={<NewFact kind="review" label="Add a review" props={props} edit="new:review" />}>
        <List kind="review" props={props} empty="None added yet." />
      </Group>
    </>
  );
}

function Links(props: SectionProps) {
  const brain = props.page.brain;
  const i = brain.institution;
  const drive = brainSlots(brain).find((slot) => slot.key === 'drive');
  const record: Array<[string, string | null]> = [
    ['Website', i.website],
    ['Instagram', i.instagram ? `https://instagram.com/${i.instagram}` : null],
    ['YouTube', i.youtube],
    ['Facebook', i.facebook],
    ['LinkedIn', i.linkedin],
    ['Google Business profile', i.googleMaps],
  ];
  const links = itemsOf(brain, 'link').filter((item) => !item.toConfirm);
  const ordered = [...links.filter((item) => item.fields.type === 'drive'), ...links.filter((item) => item.fields.type !== 'drive')];
  return (
    <>
      <Group id="public" title="Public pages" note="Drishti checks these in every Audit, so the owner changes them in Settings.">
        <div>
          {record.map(([label, href]) => (
            <p key={label} className={styles.recordRow}>
              <span className={styles.recordLabel}>{label}</span>
              {href ? <LinkLine href={href} label={label} /> : <span className={styles.rowAside}>Not added. The owner adds it in Settings.</span>}
            </p>
          ))}
        </div>
      </Group>
      <Group id="files" title="Folders, listings and files" note={`Share each Drive folder with ${'admitlabs@gmail.com'}.`} action={<NewFact kind="link" label="Add a link" props={props} edit="new:link" />}>
        <ul className={styles.rows}>
          {drive && !drive.done ? (
            <MissingRow slot={drive} props={props}>
              {newForm('link', { type: 'drive' }, 'Shared Drive folder', props)}
            </MissingRow>
          ) : null}
          {ordered.map((item) => (
            <ItemRow key={item.id} item={item as AnyBrainItem} props={props} />
          ))}
        </ul>
        {props.canEdit && !ordered.some((item) => item.fields.type === 'shiksha' || item.fields.type === 'collegedunia') ? (
          <p className={styles.sourceRow}>
            <NewFact kind="link" preset={{ type: 'shiksha' }} label="Add Shiksha" props={props} edit="new:link:shiksha" />
            <NewFact kind="link" preset={{ type: 'collegedunia' }} label="Add CollegeDunia" props={props} edit="new:link:collegedunia" />
          </p>
        ) : null}
      </Group>
    </>
  );
}

function Calendar(props: SectionProps) {
  const brain = props.page.brain;
  const season = brainSlots(brain).find((slot) => slot.key === 'season');
  const dates = itemsOf(brain, 'date').filter((item) => !item.toConfirm);
  const fromPrograms = brain.programs.flatMap((program) =>
    program.details.applicationsOpen ? [{ key: program.id, day: program.details.applicationsOpen, what: `${program.name}: applications open${program.details.applicationsClose ? `, to ${formatDate(program.details.applicationsClose)}` : ''}` }] : [],
  );
  const entries = [...dates.map((item) => ({ day: item.fields.from, item })), ...fromPrograms.map((entry) => ({ day: entry.day, entry }))].sort((a, b) => a.day.localeCompare(b.day));
  return (
    <Group id="calendar" title="Coming up" note="Admission dates from each program’s details show here too." action={<NewFact kind="date" label="Add a date" props={props} edit="new:date" />}>
      <ul className={styles.rows}>
        {season && !season.done ? (
          <MissingRow slot={season} props={props}>
            {newForm('date', { type: 'season' }, 'Admission season', props)}
          </MissingRow>
        ) : null}
        {entries.map((entry) =>
          'item' in entry && entry.item ? (
            <ItemRow key={entry.item.id} item={entry.item as AnyBrainItem} props={props} />
          ) : 'entry' in entry && entry.entry ? (
            <li key={`p:${entry.entry.key}`} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowLabel}>{DATE_TYPE_LABELS.season}</p>
                <p className={styles.rowValue}>{entry.entry.what}</p>
                <p className={styles.rowLines}>{formatDate(entry.day)}</p>
                <p className={styles.rowSource}>
                  <span>From Programs</span>
                </p>
              </div>
            </li>
          ) : null,
        )}
      </ul>
      {props.canEdit ? (
        <p className={styles.sourceRow}>
          <NewFact kind="date" preset={{ type: 'no_post' }} label="Add days not to post" props={props} edit="new:date:no_post" />
        </p>
      ) : null}
    </Group>
  );
}

function Content(props: SectionProps) {
  const c = Ctx(props);
  const plan = brainSlots(props.page.brain).find((slot) => slot.key === 'plan');
  const scripts = itemsOf(props.page.brain, 'script').filter((item) => !item.toConfirm);
  return (
    <>
      <Group id="plan" title="Content plan" action={<NewFact kind="plan" label="Add a month’s plan" props={props} edit="new:plan" />}>
        <ul className={styles.rows}>
          {plan && !plan.done ? (
            <MissingRow slot={plan} props={props}>
              {newForm('plan', {}, 'First month’s content plan', props)}
            </MissingRow>
          ) : null}
        </ul>
        <List kind="plan" props={props} />
      </Group>
      <Group id="scripts" title="Scripts" action={<NewFact kind="script" label="Add a script" props={props} edit="new:script" />}>
        {scripts.length ? (
          <ul className={styles.rows}>
            {scripts.map((item) => (
              <ItemRow
                key={item.id}
                item={item as AnyBrainItem}
                props={props}
                extra={
                  props.team && props.canEdit && item.fields.status === 'approved' ? (
                    <form action={logScriptAction.bind(null, { ...c.form, itemId: item.id })} className={styles.inlineForm}>
                      <Button type="submit" size="sm" variant="quiet" icon="plus">
                        Add to work log
                      </Button>
                    </form>
                  ) : undefined
                }
              />
            ))}
          </ul>
        ) : (
          <p className={styles.groupNote}>No scripts yet.</p>
        )}
      </Group>
      <Group id="worked" title="What worked" action={<NewFact kind="worked" label="Add what worked" props={props} edit="new:worked" />}>
        <List kind="worked" props={props} empty="Nothing noted yet." />
      </Group>
      <Group
        id="work"
        title="The work log"
        action={
          <Link href={props.team ? `/team/institutions/${props.page.brain.institution.id}` : '/work'} className={styles.quietLink}>
            See all work
            <Icon name="arrowRight" size={14} />
          </Link>
        }
      >
        {props.page.work.length ? <WorkList entries={props.page.work.slice(0, 5)} size="sm" /> : <p className={styles.groupNote}>The team adds each piece of work as it is done.</p>}
      </Group>
    </>
  );
}

function Notes(props: SectionProps & { teamOnly?: ReactNode }) {
  const notes = itemsOf(props.page.brain, 'note')
    .filter((item) => !item.toConfirm)
    .sort((a, b) => (b.fields.on ?? b.updatedAt).localeCompare(a.fields.on ?? a.updatedAt));
  return (
    <>
      {props.teamOnly}
      <Group id="notes" title="Notes and decisions" action={<NewFact kind="note" label="Add a note" props={props} edit="new:note" />}>
        {notes.length ? (
          <ul className={styles.rows}>
            {notes.map((item) => (
              <ItemRow key={item.id} item={item as AnyBrainItem} props={props} />
            ))}
          </ul>
        ) : (
          <p className={styles.groupNote}>Meeting notes, decisions and feedback show here, each with who and when.</p>
        )}
      </Group>
    </>
  );
}

export function SectionBody(props: SectionProps & { teamOnly?: ReactNode }) {
  switch (props.section) {
    case 'basics':
      return <Basics {...props} />;
    case 'programs':
      return <Programs {...props} />;
    case 'brand':
      return <Brand {...props} />;
    case 'proof':
      return <Proof {...props} />;
    case 'links':
      return <Links {...props} />;
    case 'calendar':
      return <Calendar {...props} />;
    case 'content':
      return <Content {...props} />;
    case 'notes':
      return <Notes {...props} />;
  }
}

/** What each section's flag in the list says: something to check, or missing. */
export function sectionFlags(page: BrainPage): Partial<Record<BrainSection, string>> {
  const flags: Partial<Record<BrainSection, string>> = {};
  const check = new Map<BrainSection, number>();
  for (const fact of page.stale) check.set(fact.section, (check.get(fact.section) ?? 0) + 1);
  const missing = new Map<BrainSection, number>();
  for (const slot of page.progress.missing) missing.set(slot.section, (missing.get(slot.section) ?? 0) + 1);
  for (const [section, count] of check) flags[section] = `${count} to check`;
  for (const [section, count] of missing) if (!flags[section]) flags[section] = `${count} missing`;
  return flags;
}

export { sectionOf };
