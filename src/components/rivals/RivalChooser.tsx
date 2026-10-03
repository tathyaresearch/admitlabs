'use client';

// Picking 3 to 5 rivals: the current list, suggestions with the reason for each, and a form to
// add a rival that isn't listed. Nothing is saved until "Save rivals"; the server checks every
// rule again when it saves.

import { useActionState, useState, type FormEvent } from 'react';
import { saveRivalsAction, type SaveRivalsState } from '@/app/(dashboard)/rivals/actions';
import { CityPicker } from '@/components/institution/CityPicker';
import { SectionHead } from '@/components/audit/AuditHeader';
import { Button } from '@/components/ui/Button';
import { Checkbox, RadioGroup, TextField } from '@/components/ui/Form';
import { RIVAL_RULES } from '@/config/rivals';
import { INSTITUTION_TYPE_LABELS, INSTITUTION_TYPES, type InstitutionType } from '@/domain/types';
import { checkRivalEntry, type RivalEntry, type RivalEntryErrors } from '@/rivals/entry';
import audit from '@/components/audit/audit.module.css';
import styles from './rivals.module.css';

export interface ChooserRival {
  id: string;
  name: string;
  sub: string;
}

type Picked = { key: string; name: string; sub: string } & ({ kind: 'existing'; id: string } | { kind: 'new'; entry: RivalEntry });

interface RivalChooserProps {
  institution: { type: InstitutionType; website: string; city: string; state: string };
  current: readonly ChooserRival[];
  suggestions: ReadonlyArray<ChooserRival & { reason: string }>;
  programs: ReadonlyArray<{ id: string; name: string }>;
  /** One line under the save button about what saving means on this plan. */
  saveNote: string;
}

const START: SaveRivalsState = { status: 'idle', message: null };

export function RivalChooser({ institution, current, suggestions, programs, saveNote }: RivalChooserProps) {
  const [state, action, pending] = useActionState(saveRivalsAction, START);
  const [picked, setPicked] = useState<Picked[]>(current.map((rival) => ({ key: rival.id, kind: 'existing', id: rival.id, name: rival.name, sub: rival.sub })));
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<RivalEntryErrors>({});
  const [formKey, setFormKey] = useState(0);

  const count = picked.length;
  const full = count >= RIVAL_RULES.max;
  const isPicked = (id: string) => picked.some((item) => item.kind === 'existing' && item.id === id);

  function toggle(rival: ChooserRival) {
    setPicked((list) =>
      list.some((item) => item.kind === 'existing' && item.id === rival.id)
        ? list.filter((item) => !(item.kind === 'existing' && item.id === rival.id))
        : [...list, { key: rival.id, kind: 'existing', id: rival.id, name: rival.name, sub: rival.sub }],
    );
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? '');
    const { entry, errors: found } = checkRivalEntry(
      {
        name: field('name'),
        type: field('type'),
        city: field('city'),
        state: field('state'),
        website: field('website'),
        instagram: field('instagram'),
        programs: data.getAll('programs').map(String),
      },
      {
        ownPrograms: programs.map((program) => program.id),
        ownWebsite: institution.website,
        listed: picked.flatMap((item) => (item.kind === 'new' ? [item.entry.website] : [])),
      },
    );
    setErrors(found);
    if (!entry) return;
    setPicked((list) => [...list, { key: `new-${entry.website}`, kind: 'new', entry, name: entry.name, sub: `${INSTITUTION_TYPE_LABELS[entry.type]}, ${entry.city}. Added by you.` }]);
    setAdding(false);
    setFormKey((key) => key + 1);
  }

  const short = RIVAL_RULES.min - count;
  return (
    <div className={styles.chooser}>
      <section className={audit.section} aria-labelledby="picked-title">
        <SectionHead
          id="picked-title"
          title="Your rivals"
          help={`${count} of ${RIVAL_RULES.max} picked.${short > 0 ? ` Pick ${short} more to save.` : ''}`}
        />
        {picked.length ? (
          <ul className={styles.picked}>
            {picked.map((item) => (
              <li key={item.key} className={styles.pickedRow}>
                <span className={styles.who}>
                  <span className={styles.whoName}>{item.name}</span>
                  <span className={styles.whoSub}>{item.sub}</span>
                </span>
                <Button type="button" variant="quiet" size="sm" onClick={() => setPicked((list) => list.filter((other) => other.key !== item.key))}>
                  Remove<span className="visually-hidden"> {item.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={audit.quietNote}>{suggestions.length ? 'None yet. Start with the suggestions below.' : 'None yet. Add the ones you compete with below.'}</p>
        )}
      </section>

      <section className={audit.section} aria-labelledby="suggested-title">
        <SectionHead id="suggested-title" title="Suggested for you" help="Same type as you, with programs in common. Your city first, then your state." />
        {suggestions.length ? (
          <ul className={styles.suggestions}>
            {suggestions.map((rival) => {
              const on = isPicked(rival.id);
              return (
                <li key={rival.id} className={styles.suggestion} data-picked={on}>
                  <span className={styles.who}>
                    <span className={styles.whoName}>{rival.name}</span>
                    <span className={styles.whoSub}>{rival.reason}</span>
                  </span>
                  <Button type="button" variant={on ? 'secondary' : 'primary'} size="sm" icon={on ? 'check' : 'plus'} disabled={!on && full} onClick={() => toggle(rival)} aria-pressed={on}>
                    {on ? 'Added' : 'Add'}
                    <span className="visually-hidden"> {rival.name}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          // Why there are none, and what to do instead.
          <p className={audit.quietNote}>
            No suggestions for {institution.city} yet. Drishti suggests institutions it already checks: the same type as you, with programs in common, in {institution.city} first, then the rest of{' '}
            {institution.state}. Add the ones you compete with below. A name and a website are enough.
          </p>
        )}
      </section>

      <section className={audit.section} aria-labelledby="add-title">
        <SectionHead id="add-title" title="Add a rival that isn't listed" help="Drishti checks them from their public website and social links. They never know." />
        {adding ? (
          <form key={formKey} className={styles.addPanel} onSubmit={add} noValidate>
            <div className={styles.addGrid}>
              <TextField id="rival-name" name="name" label="Name" error={errors.name} autoComplete="off" />
              <TextField id="rival-website" name="website" label="Website" inputMode="url" placeholder="theircollege.edu.in" error={errors.website} />
            </div>
            <RadioGroup
              name="type"
              legend="Type"
              defaultValue={institution.type}
              error={errors.type}
              options={INSTITUTION_TYPES.map((type) => ({ value: type, label: INSTITUTION_TYPE_LABELS[type] }))}
            />
            <div className={styles.addGrid}>
              <CityPicker id="rival-city" error={errors.city} />
              <TextField id="rival-instagram" name="instagram" label="Instagram (optional)" placeholder="@theircollege" error={errors.instagram} hint="Helps Drishti find their best posts." />
            </div>
            <fieldset className={styles.programsField} aria-describedby={errors.programs ? 'rival-programs-error' : undefined}>
              <legend className={styles.fieldLegend}>Which of your programs do they also offer?</legend>
              <div className={styles.programChoices}>
                {programs.map((program) => (
                  <Checkbox key={program.id} id={`rival-program-${program.id}`} name="programs" value={program.id} label={program.name} />
                ))}
              </div>
              {errors.programs ? (
                <p id="rival-programs-error" className={styles.formError}>
                  {errors.programs}
                </p>
              ) : null}
            </fieldset>
            <div className={styles.saveBar}>
              <Button type="submit" icon="plus" disabled={full}>
                Add to my rivals
              </Button>
              <Button type="button" variant="quiet" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button type="button" variant="secondary" icon="plus" disabled={full} onClick={() => setAdding(true)}>
              Add a rival
            </Button>
          </div>
        )}
      </section>

      <form action={action} className={styles.saveBar}>
        {picked.map((item) => (item.kind === 'existing' ? <input key={item.key} type="hidden" name="picked" value={item.id} /> : null))}
        <input type="hidden" name="added" value={JSON.stringify(picked.flatMap((item) => (item.kind === 'new' ? [item.entry] : [])))} />
        <Button type="submit" loading={pending} disabled={count < RIVAL_RULES.min || count > RIVAL_RULES.max}>
          Save rivals
        </Button>
        <p className={styles.saveNote}>{saveNote}</p>
        {state.message ? (
          <p className={styles.formError} role="alert">
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
