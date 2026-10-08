import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { aboutRows, describeItem, placementText, programRows, shortValue } from '@/brain/facts';
import { aboutInputs, factInputs, placementInputs, programInputs } from '@/brain/form-spec';
import { SECTION_INFO, contactOf, firstOf, itemsOf, type AnyBrainItem, type BrainKind, type BrainSection } from '@/brain/model';
import { brainSlots } from '@/brain/progress';
import { PasswordNote } from '@/components/brain/Bits';
import { FactForm } from '@/components/brain/FactForm';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { KpiBar } from '@/components/ui/Kpi';
import { Card, PageHead } from '@/components/ui/Layout';
import { BRAIN_RULES } from '@/config/brain';
import { INSTITUTION_TYPE_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { saveAboutAction, saveFactAction, saveProgramAction, type FormContext } from '@/lib/brain/actions';
import { loadBrainPage, type BrainPage } from '@/lib/brain/page';
import styles from '@/components/brain/brain.module.css';

export const metadata: Metadata = { title: 'Help us know you' };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
const BASE = '/brain/help';

// Help us know you (spec section 26): what only the college knows, block by block, each saved into
// its Brain section as it goes; the same facts the team fills in the Brain. Ticked blocks say what
// was given, with Change. No passwords anywhere.

function Block({ id, title, done, summary, children, editing }: { id: string; title: string; done: boolean; summary: ReactNode; children: ReactNode; editing: boolean }) {
  return (
    <Card padding="md" className={styles.helpBlock}>
      <div id={id} className={styles.groupHead}>
        <h3 className={styles.groupTitle}>{title}</h3>
        {done && !editing ? <span className={styles.leftCount}>Done</span> : null}
      </div>
      {done && !editing ? (
        <p className={styles.doneLine}>
          <span className={styles.doneTick} aria-hidden="true">
            <Icon name="check" size={12} />
          </span>
          <span className={styles.doneText}>{summary}</span>
          <Link href={`${BASE}?edit=${id}#${id}`} className={styles.textButton} scroll={false}>
            Change
          </Link>
        </p>
      ) : (
        children
      )}
    </Card>
  );
}

function Section({ section, children }: { section: BrainSection; children: ReactNode }) {
  return (
    <section className={styles.helpSection} aria-label={SECTION_INFO[section].name}>
      <h2 className={styles.helpSectionTitle}>
        <Icon name={SECTION_INFO[section].icon} size={20} className={styles.sectionIcon} />
        {SECTION_INFO[section].name}
      </h2>
      {children}
    </section>
  );
}

function fact(page: BrainPage, kind: Exclude<BrainKind, 'found' | 'skip'>, ctx: FormContext, edit: string | null, title: string, preset: Record<string, string> = {}) {
  const item = kind === 'contact' ? contactOf(page.brain, (preset.role as 'main' | 'approver') ?? 'main') : firstOf(page.brain, kind);
  const id = kind === 'contact' ? `contact-${preset.role}` : kind;
  return (
    <Block id={id} title={title} done={Boolean(item)} editing={edit === id} summary={item ? shortValue(describeItem(item as AnyBrainItem, page.brain.programs)) : null}>
      <FactForm
        plain
        action={saveFactAction.bind(null, { ...ctx, returnTo: `${BASE}#${id}`, kind, itemId: item?.id ?? null })}
        inputs={factInputs(kind, (item?.fields ?? null) as never, preset)}
        submit="Save"
        cancelHref={item ? `${BASE}#${id}` : null}
      />
    </Block>
  );
}

/** A list of facts (awards, alumni, reviews, dates): what was given, then a form for one more. */
function many(page: BrainPage, kind: Exclude<BrainKind, 'found' | 'skip'>, ctx: FormContext, edit: string | null, title: string, addLabel: string, filter: (item: AnyBrainItem) => boolean = () => true, preset: Record<string, string> = {}) {
  const items = itemsOf(page.brain, kind).filter((item) => !item.toConfirm && filter(item as AnyBrainItem));
  const id = preset.type ? `${kind}-${preset.type}` : kind;
  const open = !items.length || edit === id;
  return (
    <Card padding="md" className={styles.helpBlock}>
      <div id={id} className={styles.groupHead}>
        <h3 className={styles.groupTitle}>{title}</h3>
        {items.length ? <span className={styles.leftCount}>{items.length} added</span> : null}
      </div>
      {items.length ? (
        <ul className={styles.factList}>
          {items.map((item) => (
            <li key={item.id}>{shortValue(describeItem(item as AnyBrainItem, page.brain.programs))}</li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <FactForm plain action={saveFactAction.bind(null, { ...ctx, returnTo: `${BASE}#${id}`, kind, itemId: null })} inputs={factInputs(kind, null, preset)} submit="Add" cancelHref={items.length ? `${BASE}#${id}` : null} />
      ) : (
        <p>
          <Link href={`${BASE}?edit=${id}#${id}`} className={styles.quietLink} scroll={false}>
            <Icon name="plus" size={14} />
            {addLabel}
          </Link>
        </p>
      )}
    </Card>
  );
}

export default async function HelpUsKnowYou({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  if (viewer.tier !== 'client' || viewer.viewingAs) notFound();
  const institutionId = viewer.membership.institution.id;
  const query = await searchParams;
  const page = await loadBrainPage(institutionId, false);
  const head = (caption?: string[]) => (
    <PageHead back={{ href: '/brain', label: 'Brain' }} title="Help us know you" question="A few things only you know. Your AdmitLabs team uses them in every post and fix." caption={caption} />
  );
  if (!page) {
    return (
      <div className={`${styles.page} ${styles.narrow}`}>
        {head()}
        <EmptyState icon="brain" title="Your AdmitLabs team starts this with you">
          It opens once your AdmitLabs team has started your Brain, at the start of your service.
        </EmptyState>
      </div>
    );
  }
  if (one(query.done) === '1') {
    return (
      <div className={`${styles.page} ${styles.narrow}`}>
        {head()}
        <Card padding="lg" className={styles.thanks}>
          <span className={styles.thanksIcon} aria-hidden="true">
            <Icon name="check" size={22} />
          </span>
          <h2 className={styles.thanksTitle}>Thanks. Your AdmitLabs team has it.</h2>
          <p className={styles.groupNote}>Your Brain is {page.progress.percent}% complete. Your team goes through the rest with you on your next call.</p>
          <div className={styles.thanksBar}>
            <span className={`${styles.thanksNum} num`}>{page.progress.percent}%</span>
            <KpiBar value={page.progress.percent} />
          </div>
          <div className={styles.formActions}>
            <ButtonLink href="/brain" iconAfter="arrowRight">
              See your Brain
            </ButtonLink>
            <ButtonLink href="/" variant="quiet">
              Back to Home
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const edit = one(query.edit);
  const ctx: FormContext = { institutionId, returnTo: BASE, viaHelp: true };
  const brain = page.brain;
  const slots = brainSlots(brain);
  const left = page.progress.missing.filter((slot) => slot.key !== 'plan').length;
  const about = aboutRows(brain.details, brain.institution.type);
  const aboutDone = slots.filter((slot) => slot.key === 'founded' || slot.key === 'approvals' || slot.key === 'address').every((slot) => slot.done);
  const i = brain.institution;
  const owner = viewer.membership.role === 'owner';
  const record: Array<[string, string | null]> = [
    ['Website', i.website],
    ['Instagram', i.instagram ? `@${i.instagram}` : null],
    ['YouTube', i.youtube],
    ['LinkedIn', i.linkedin],
    ['Facebook', i.facebook],
    ['Google Business profile', i.googleMaps],
  ];

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      {head([left ? `${left} ${left === 1 ? 'thing' : 'things'} left` : 'Everything we need is here', 'Saved as you go'])}

      <Section section="basics">
        <Block id="about" title="About the college" done={aboutDone} editing={edit === 'about'} summary={about.filter((row) => row.value).map((row) => `${row.label}: ${row.value}`).join('. ')}>
          <p className={styles.groupNote}>
            {i.name}, a {INSTITUTION_TYPE_LABELS[i.type].toLowerCase()} in {i.city}. {owner ? 'You change these in Settings.' : 'The owner changes these in Settings.'}
          </p>
          <FactForm
            plain
            action={saveAboutAction.bind(null, { ...ctx, returnTo: `${BASE}#about` })}
            inputs={aboutInputs(brain.details, i.type).filter((input) => !['admissions_phone', 'admissions_email'].includes(input.name))}
            hidden={i.type === 'skilling' ? { has_skilling: '1' } : {}}
            cancelHref={aboutDone ? `${BASE}#about` : null}
          />
        </Block>
        {fact(page, 'contact', ctx, edit, 'Main contact', { role: 'main' })}
        {fact(page, 'contact', ctx, edit, 'Who approves our content', { role: 'approver' })}
        {fact(page, 'goals', ctx, edit, 'Top 3 goals this year')}
        {fact(page, 'target', ctx, edit, 'Admission target')}
        {fact(page, 'rivals', ctx, edit, 'Main rivals')}
        {fact(page, 'regions', ctx, edit, 'Cities and states you want students from')}
      </Section>

      <Section section="programs">
        {brain.programs.map((program) => {
          const id = `program-${program.id}`;
          const done = slots.filter((slot) => slot.key.startsWith(`program:${program.id}:`)).every((slot) => slot.done);
          return (
            <Block
              key={program.id}
              id={id}
              title={program.name}
              done={done}
              editing={edit === id}
              summary={programRows(program.details)
                .filter((row) => row.value && row.key !== 'highlights')
                .map((row) => row.value)
                .join(', ')}
            >
              <FactForm
                plain
                action={saveProgramAction.bind(null, { ...ctx, returnTo: `${BASE}#${id}`, programId: program.id })}
                inputs={programInputs(program.details, program.push)}
                hidden={{ has_push: '1' }}
                cancelHref={done ? `${BASE}#${id}` : null}
              />
            </Block>
          );
        })}
        <p className={styles.groupNote}>A program missing? {owner ? 'Add it' : 'The owner adds it'} in Settings, Programs.</p>
      </Section>

      <Section section="brand">
        {fact(page, 'logo', ctx, edit, 'Logo')}
        {fact(page, 'colours', ctx, edit, 'Colours')}
        {fact(page, 'fonts', ctx, edit, 'Fonts')}
        {fact(page, 'tagline', ctx, edit, 'Tagline')}
        {fact(page, 'tone', ctx, edit, 'Tone: formal or friendly')}
        {fact(page, 'avoid', ctx, edit, 'Words or topics to avoid')}
        {fact(page, 'guidelines', ctx, edit, 'Brand guidelines (optional)')}
      </Section>

      <Section section="proof">
        {many(page, 'award', ctx, edit, 'Rankings and awards', 'Add another')}
        {brain.programs.map((program) => {
          const id = `placements-${program.id}`;
          const text = placementText(program.details);
          return (
            <Block key={id} id={id} title={`${program.name}: placements`} done={Boolean(text)} editing={edit === id} summary={text}>
              <FactForm
                plain
                action={saveProgramAction.bind(null, { ...ctx, returnTo: `${BASE}#${id}`, programId: program.id })}
                inputs={placementInputs(program.details)}
                cancelHref={text ? `${BASE}#${id}` : null}
              />
            </Block>
          );
        })}
        {many(page, 'alumnus', ctx, edit, 'Known alumni', 'Add another')}
        {many(page, 'review', ctx, edit, 'Student reviews we may use', 'Add another')}
      </Section>

      <Section section="links">
        <Card padding="md" className={styles.helpBlock}>
          <h3 className={styles.groupTitle}>Your public pages</h3>
          <div>
            {record.map(([label, value]) => (
              <p key={label} className={styles.recordRow}>
                <span className={styles.recordLabel}>{label}</span>
                <span>{value ?? 'Not added yet'}</span>
              </p>
            ))}
          </div>
          <p className={styles.groupNote}>
            Drishti checks these in every Audit.{' '}
            {owner ? (
              <Link href="/settings" className={styles.quietLink}>
                Change them in Settings
              </Link>
            ) : (
              'The owner changes them in Settings.'
            )}
          </p>
        </Card>
        {many(page, 'link', ctx, edit, 'Shiksha', 'Add another', (item) => item.kind === 'link' && item.fields.type === 'shiksha', { type: 'shiksha' })}
        {many(page, 'link', ctx, edit, 'CollegeDunia', 'Add another', (item) => item.kind === 'link' && item.fields.type === 'collegedunia', { type: 'collegedunia' })}
        {many(page, 'link', ctx, edit, `A Drive folder, shared with ${BRAIN_RULES.driveShareEmail}`, 'Add another', (item) => item.kind === 'link' && item.fields.type === 'drive', { type: 'drive' })}
      </Section>

      <Section section="calendar">
        {many(page, 'date', ctx, edit, 'Admission season', 'Add another', (item) => item.kind === 'date' && item.fields.type === 'season', { type: 'season' })}
        {many(page, 'date', ctx, edit, 'Exams, fests, events and convocation', 'Add another', (item) => item.kind === 'date' && item.fields.type !== 'season' && item.fields.type !== 'no_post')}
        {many(page, 'date', ctx, edit, 'Days not to post', 'Add another', (item) => item.kind === 'date' && item.fields.type === 'no_post', { type: 'no_post' })}
      </Section>

      <Section section="notes">{many(page, 'note', ctx, edit, 'Anything else we should know', 'Add another', (item) => item.kind === 'note' && item.fields.type === 'note', { type: 'note' })}</Section>

      <PasswordNote />
      <div className={styles.formActions}>
        <ButtonLink href={`${BASE}?done=1`} iconAfter="arrowRight">
          Done for now
        </ButtonLink>
        <ButtonLink href="/brain" variant="quiet">
          See your Brain
        </ButtonLink>
      </div>
    </div>
  );
}
