'use client';

// Picking 3 to 5 rivals (spec 8.2), as the version 2 mock was approved: institutions in your city
// that offer one of your programs, then, when your city has fewer than 3, some from the nearest
// bigger city, marked "Nearby city"; and a rival you add yourself. Nothing is saved until "Save
// rivals"; the server checks every rule again when it saves.

import { useActionState, useState, type FormEvent } from 'react';
import { saveRivalsAction, type SaveRivalsState } from '@/app/(dashboard)/rivals/actions';
import { SectionTitle, Tag } from '@/components/audit/PlaceBits';
import { CityPicker } from '@/components/institution/CityPicker';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { Checkbox, RadioGroup, TextField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { RIVAL_RULES } from '@/config/rivals';
import { INSTITUTION_TYPE_LABELS, INSTITUTION_TYPES, type InstitutionType } from '@/domain/types';
import { checkRivalEntry, type RivalEntry, type RivalEntryErrors } from '@/rivals/entry';
import audit from '@/components/audit/places.module.css';
import styles from './city.module.css';
import legacy from './rivals.module.css';

export interface ChooserRow {
  id: string;
  name: string;
  /** "Skilling institute, Guwahati. Also offers Digital Marketing." */
  sub: string;
  nearby: boolean;
}

interface RivalChooserProps {
  institution: { type: InstitutionType; website: string; city: string; state: string };
  /** The nearest bigger city, when Drishti suggests from it. */
  nearCity: string | null;
  /** In your city: your rivals there, then the suggestions. */
  local: readonly ChooserRow[];
  /** From another city: your rivals there, then the Nearby city suggestions. */
  nearby: readonly ChooserRow[];
  /** The ones picked now. */
  picked: readonly string[];
  programs: ReadonlyArray<{ id: string; name: string }>;
  /** One line about what saving means on this plan. */
  saveNote: string;
}

const START: SaveRivalsState = { status: 'idle', message: null };
const COUNT_WORDS = ['No institution', 'Only one institution', 'Only two institutions'];

function Row({ row, checked, disabled, onToggle }: { row: ChooserRow; checked: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <li className={styles.chooseRow}>
      <label className={styles.chooseLabel}>
        <input type="checkbox" className={styles.checkInput} checked={checked} disabled={disabled} onChange={onToggle} />
        <span className={styles.checkBox} aria-hidden="true">
          <Icon name="check" size={14} />
        </span>
        <span className={styles.chooseText}>
          <span className={styles.chooseName}>
            {row.name}
            {row.nearby ? <Tag>Nearby city</Tag> : null}
          </span>
          <span className={audit.quiet}>{row.sub}</span>
        </span>
      </label>
    </li>
  );
}

export function RivalChooser({ institution, nearCity, local, nearby, picked: initial, programs, saveNote }: RivalChooserProps) {
  const [state, action, pending] = useActionState(saveRivalsAction, START);
  const [picked, setPicked] = useState<string[]>([...initial]);
  const [added, setAdded] = useState<RivalEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<RivalEntryErrors>({});
  const [formKey, setFormKey] = useState(0);

  const count = picked.length + added.length;
  const full = count >= RIVAL_RULES.max;
  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  const rows = (list: readonly ChooserRow[]) =>
    list.map((row) => <Row key={row.id} row={row} checked={picked.includes(row.id)} disabled={!picked.includes(row.id) && full} onToggle={() => toggle(row.id)} />);

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
      { ownPrograms: programs.map((program) => program.id), ownWebsite: institution.website, listed: added.map((item) => item.website) },
    );
    setErrors(found);
    if (!entry) return;
    setAdded((list) => [...list, entry]);
    setAdding(false);
    setFormKey((key) => key + 1);
  }

  const showNear = nearby.length > 0;
  return (
    <>
      <section className={audit.block} aria-labelledby="in-city">
        <SectionTitle id="in-city" icon="mapPin" title={`In ${institution.city}`} help="Institutions in your city that offer one of your programs." />
        <div className={audit.card}>
          {local.length ? (
            <ul className={styles.chooseList}>{rows(local)}</ul>
          ) : (
            <p className={audit.quiet}>Drishti does not know an institution in {institution.city} with one of your programs yet. Add the ones you compete with below: a name and a website are enough.</p>
          )}
        </div>
      </section>

      {showNear && local.length < RIVAL_RULES.min && nearCity ? (
        <Notice icon="info" title={`${COUNT_WORDS[local.length] ?? 'Few institutions'} in ${institution.city} ${local.length === 1 ? 'shares' : 'share'} your programs.`}>
          So here are some from {nearCity}, the nearest bigger city. They are marked Nearby city wherever they show.
        </Notice>
      ) : null}

      {showNear ? (
        <section className={audit.block} aria-labelledby="near-city">
          <SectionTitle id="near-city" icon="mapPin" title={nearCity ? `Nearby city: ${nearCity}` : 'From other cities'} />
          <div className={audit.card}>
            <ul className={styles.chooseList}>{rows(nearby)}</ul>
          </div>
        </section>
      ) : null}

      {added.length ? (
        <section className={audit.block} aria-labelledby="added-title">
          <SectionTitle id="added-title" icon="plus" title="Added by you" help="Drishti checks them from their public website and social links. They never know." />
          <div className={audit.card}>
            <ul className={styles.chooseList}>
              {added.map((entry) => (
                <Row
                  key={entry.website}
                  row={{
                    id: entry.website,
                    name: entry.name,
                    sub: `${INSTITUTION_TYPE_LABELS[entry.type]}, ${entry.city}. Added by you.`,
                    nearby: entry.city !== institution.city,
                  }}
                  checked
                  disabled={false}
                  onToggle={() => setAdded((list) => list.filter((item) => item.website !== entry.website))}
                />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {adding ? (
        <section className={audit.block} aria-labelledby="add-title">
          <SectionTitle id="add-title" icon="plus" title="Add one that is not here" help="Drishti checks them from their public website and social links. They never know." />
          <form key={formKey} className={[audit.card, legacy.addPanel].join(' ')} onSubmit={add} noValidate>
            <div className={legacy.addGrid}>
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
            <div className={legacy.addGrid}>
              <CityPicker id="rival-city" error={errors.city} />
              <TextField id="rival-instagram" name="instagram" label="Instagram (optional)" placeholder="@theircollege" error={errors.instagram} hint="Helps Drishti find their best posts." />
            </div>
            <fieldset className={legacy.programsField} aria-describedby={errors.programs ? 'rival-programs-error' : undefined}>
              <legend className={legacy.fieldLegend}>Which of your programs do they also offer?</legend>
              <div className={legacy.programChoices}>
                {programs.map((program) => (
                  <Checkbox key={program.id} id={`rival-program-${program.id}`} name="programs" value={program.id} label={program.name} />
                ))}
              </div>
              {errors.programs ? (
                <p id="rival-programs-error" className={legacy.formError}>
                  {errors.programs}
                </p>
              ) : null}
            </fieldset>
            <div className={legacy.saveBar}>
              <Button type="submit" icon="plus" disabled={full}>
                Add to my rivals
              </Button>
              <Button type="button" variant="quiet" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <form action={action} className={styles.chooseFoot}>
        {picked.map((id) => (
          <input key={id} type="hidden" name="picked" value={id} />
        ))}
        <input type="hidden" name="added" value={JSON.stringify(added)} />
        {adding ? null : (
          <button type="button" className={audit.linkButton} onClick={() => setAdding(true)} disabled={full}>
            <Icon name="plus" size={16} />
            Add one that is not here
          </button>
        )}
        <span className={styles.chooseCount}>
          <span className="num">{count}</span> picked{count < RIVAL_RULES.min ? `, pick ${RIVAL_RULES.min - count} more` : ''}
        </span>
        <span className={styles.chooseSave}>
          <Button type="submit" loading={pending} disabled={count < RIVAL_RULES.min || count > RIVAL_RULES.max}>
            Save rivals
          </Button>
          <span className={audit.quiet}>{saveNote}</span>
          {state.message ? (
            <span className={legacy.formError} role="alert">
              {state.message}
            </span>
          ) : null}
        </span>
      </form>
    </>
  );
}
