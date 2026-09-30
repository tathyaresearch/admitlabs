'use client';

// Programs from the fixed list, plus "Other" for anything not on it (spec section 6: at least
// one, as many as needed). Type to find a program, or browse the list. Sends "program" fields
// for listed programs and "other" fields for the rest; the server checks them again.

import { useState } from 'react';
import { Combobox } from '@/components/ui/Combobox';
import { Icon } from '@/components/ui/Icon';
import { LISTED_PROGRAMS, PROGRAM_GROUPS, type ProgramOption } from '@/config/programs';
import { tidyText } from '@/domain/onboarding';
import styles from './institution.module.css';

export interface ChosenProgram {
  name: string;
  /** Null for programs added under Other. */
  programKey: string | null;
}

type Suggestion = { kind: 'listed'; program: ProgramOption } | { kind: 'other'; name: string };

const simplify = (text: string) => text.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();

export function ProgramPicker({ id, error, defaultPrograms = [] }: { id: string; error?: string | null; defaultPrograms?: readonly ChosenProgram[] }) {
  const [chosen, setChosen] = useState<ChosenProgram[]>([...defaultPrograms]);
  const [query, setQuery] = useState('');
  const has = (name: string) => chosen.some((program) => program.name.toLowerCase() === name.toLowerCase());

  function add(program: ChosenProgram) {
    if (!has(program.name)) setChosen((current) => [...current, program]);
    setQuery('');
  }

  function toggle(program: ProgramOption) {
    if (has(program.name)) setChosen((current) => current.filter((item) => item.name !== program.name));
    else add({ name: program.name, programKey: program.key });
  }

  function search(text: string): Suggestion[] {
    const wanted = simplify(text);
    if (!wanted) return [];
    const listed = LISTED_PROGRAMS.filter((program) => !has(program.name) && simplify(program.name).includes(wanted))
      .slice(0, 7)
      .map((program): Suggestion => ({ kind: 'listed', program }));
    const name = tidyText(text);
    const exact = LISTED_PROGRAMS.some((program) => simplify(program.name) === wanted);
    const other: Suggestion[] = name.length >= 2 && !exact && !has(name) ? [{ kind: 'other', name }] : [];
    return [...listed, ...other];
  }

  return (
    <div className={styles.picker}>
      <Combobox<Suggestion>
        id={id}
        label="Add a program"
        hint="Add every program you offer. Not on the list? Type its name and add it as Other."
        placeholder="BBA, B.Sc Nursing, Digital Marketing"
        error={error}
        query={query}
        onQueryChange={setQuery}
        search={search}
        optionKey={(item) => (item.kind === 'listed' ? `listed|${item.program.name}` : `other|${item.name}`)}
        optionLabel={(item) => (item.kind === 'listed' ? item.program.name : `Add ${item.name} as another program`)}
        renderOption={(item) =>
          item.kind === 'listed' ? (
            <span>{item.program.name}</span>
          ) : (
            <>
              <span>Add &ldquo;{item.name}&rdquo;</span>
              <span className={styles.optionMeta}>Other</span>
            </>
          )
        }
        onSelect={(item) => add(item.kind === 'listed' ? { name: item.program.name, programKey: item.program.key } : { name: item.name, programKey: null })}
        emptyText="Keep typing to add it as another program."
      />

      {chosen.length ? (
        <ul className={styles.chips} aria-label="Programs added">
          {chosen.map((program) => (
            <li key={program.name} className={styles.chip}>
              <span>{program.name}</span>
              {program.programKey === null ? <span className={styles.chipNote}>Other</span> : null}
              <button type="button" className={styles.chipRemove} aria-label={`Remove ${program.name}`} onClick={() => setChosen((current) => current.filter((item) => item.name !== program.name))}>
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.chipsEmpty}>No programs added yet.</p>
      )}

      <details className={styles.browse}>
        <summary className={styles.browseSummary}>
          Browse the full list
          <Icon name="chevronDown" size={16} className={styles.browseIcon} />
        </summary>
        <div className={styles.groups}>
          {PROGRAM_GROUPS.map((group) => (
            <div key={group.group} className={styles.group}>
              <p className={styles.groupName}>{group.group}</p>
              <div className={styles.groupItems}>
                {group.programs.map((program) => (
                  <button key={program.name} type="button" className={styles.groupItem} aria-pressed={has(program.name)} onClick={() => toggle(program)}>
                    {has(program.name) ? <Icon name="check" size={14} /> : null}
                    {program.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {chosen.map((program) => (
        <input key={program.name} type="hidden" name={program.programKey ? 'program' : 'other'} value={program.name} />
      ))}
    </div>
  );
}
