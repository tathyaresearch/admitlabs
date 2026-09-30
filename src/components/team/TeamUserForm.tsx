'use client';

// An Admin adds someone to the team by email. The server action and the database both check the
// Admin role; this only shows progress and the reply.

import { useActionState } from 'react';
import type { ActionState } from '@/app/team/institutions/[id]/actions';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Form';
import { TEAM_ROLE_LABELS, TEAM_ROLES } from '@/domain/types';
import styles from './team.module.css';

const IDLE: ActionState = { status: 'idle', message: null, attempt: 0 };
const ROLE_OPTIONS = TEAM_ROLES.map((role) => ({ value: role, label: TEAM_ROLE_LABELS[role] }));

export function TeamUserForm({ action }: { action: (previous: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, submit, pending] = useActionState(action, IDLE);
  return (
    <form key={state.status === 'done' ? state.attempt : 'add'} action={submit} className={styles.facts}>
      <TextField id="team-email" name="email" type="email" label="Email" autoComplete="off" spellCheck={false} required placeholder="name@admitlabs.in" />
      <SelectField id="team-role" name="role" label="Role" options={ROLE_OPTIONS} defaultValue="team" />
      <div className={styles.inlineForm}>
        <Button type="submit" size="sm" icon="plus" loading={pending}>
          Add to the team
        </Button>
      </div>
      {state.message ? (
        <p className={state.status === 'error' ? styles.formError : styles.done} role={state.status === 'error' ? 'alert' : 'status'}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
