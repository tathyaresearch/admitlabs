'use server';

// The Team page (spec sections 5 and 27): an Admin adds people by email, sets their level (Admin,
// Team member, Client manager) and removes them.
// Each action checks the Admin role here, and the database functions check it again. The last
// Admin can never be removed or made Team, so the team area always has someone to run it.

import { revalidatePath } from 'next/cache';
import { TEAM_ROLE_LABELS, TEAM_ROLES, type TeamRole } from '@/domain/types';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/app/team/institutions/[id]/actions';

const reply = (previous: ActionState, status: ActionState['status'], message: string | null): ActionState => ({ status, message, attempt: previous.attempt + 1 });

const NOT_ADMIN = 'Only an Admin changes the team.';
const LAST_ADMIN = 'The team always keeps one Admin. Make someone else an Admin first.';
const PAGE = '/team/users';

async function isAdmin(): Promise<boolean> {
  const viewer = await getViewer();
  return viewer?.teamRole === 'admin';
}

function readRole(value: FormDataEntryValue | null): TeamRole | null {
  return TEAM_ROLES.find((role) => role === value) ?? null;
}

export async function addTeamUserAction(previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return reply(previous, 'error', NOT_ADMIN);
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const role = readRole(formData.get('role'));
  if (!role) return reply(previous, 'error', 'Choose a level: Admin, Team member or Client manager.');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('add_team_user', { p_email: email, p_role: role });
  if (error) {
    const message = error.message.includes('team_email')
      ? 'Enter a valid email address, like name@admitlabs.in.'
      : error.message.includes('institution_user')
        ? 'This email already uses Drishti for an institution. Add a different email for the team.'
        : error.message.includes('already_team')
          ? 'This person is already on the team.'
          : 'They could not be added. Try again.';
    return reply(previous, 'error', message);
  }
  revalidatePath(PAGE);
  return reply(
    previous,
    'done',
    data === 'added' ? `${email} is on the team now, as ${TEAM_ROLE_LABELS[role]}.` : `${email} joins the team as ${TEAM_ROLE_LABELS[role]} when they first sign in with this email.`,
  );
}

export async function setTeamRoleAction(userId: string, role: TeamRole, previous: ActionState): Promise<ActionState> {
  if (!(await isAdmin())) return reply(previous, 'error', NOT_ADMIN);
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_team_role', { p_user: userId, p_role: role });
  if (error) return reply(previous, 'error', error.message.includes('last_admin') ? LAST_ADMIN : 'The level could not be changed. Try again.');
  revalidatePath(PAGE);
  return reply(previous, 'done', `Now ${TEAM_ROLE_LABELS[role]}.`);
}

export async function removeTeamUserAction(userId: string, previous: ActionState): Promise<ActionState> {
  if (!(await isAdmin())) return reply(previous, 'error', NOT_ADMIN);
  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_team_user', { p_user: userId });
  if (error) return reply(previous, 'error', error.message.includes('last_admin') ? LAST_ADMIN : 'They could not be removed. Try again.');
  revalidatePath(PAGE);
  return reply(previous, 'done', 'Removed from the team.');
}

export async function removeTeamInviteAction(email: string, previous: ActionState): Promise<ActionState> {
  if (!(await isAdmin())) return reply(previous, 'error', NOT_ADMIN);
  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_team_invite', { p_email: email });
  if (error) return reply(previous, 'error', 'It could not be removed. Try again.');
  revalidatePath(PAGE);
  return reply(previous, 'done', 'Removed.');
}
