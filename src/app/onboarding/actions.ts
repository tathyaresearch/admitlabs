'use server';

// Onboarding (spec section 6): the institution's details, then the one program a Free Audit
// covers, then the first Audit. Inputs are checked here and again in the database.

import { redirect } from 'next/navigation';
import { AuditRunError, runAudit } from '@/audit/run';
import type { ChosenProgram } from '@/components/institution/ProgramPicker';
import { listedProgram } from '@/config/programs';
import { checkInstitution, checkPrograms, type InstitutionFields } from '@/domain/onboarding';
import { effectiveTier } from '@/domain/tiers';
import { getViewer } from '@/lib/auth/viewer';
import { pullDemandFirst } from '@/lib/demand/first';
import { friendlyError } from '@/lib/institution/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { alertAfterEnquiry, sendTeamLeadAlerts } from '@/enquiries/jobs';
import { APP_URL } from '@/lib/urls';

const FIELDS = ['name', 'type', 'city', 'state', 'website', 'instagram', 'youtube', 'facebook', 'linkedin'] as const;

export interface OnboardingState {
  /** Changes on every reply, so the form redraws with what was typed. */
  attempt: number;
  values: Partial<Record<(typeof FIELDS)[number], string>>;
  programs: ChosenProgram[];
  errors: Partial<Record<keyof InstitutionFields | 'programs', string>>;
  formError: string | null;
}

export async function onboardAction(previous: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (viewer.membership) redirect('/onboarding');

  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? '')])) as Record<(typeof FIELDS)[number], string>;
  const listed = formData.getAll('program').map(String);
  const others = formData.getAll('other').map(String);
  const echo: ChosenProgram[] = [...listed.map((name) => ({ name, programKey: listedProgram(name)?.key ?? null })), ...others.map((name) => ({ name, programKey: null }))];
  const reply = (patch: Partial<OnboardingState>): OnboardingState => ({
    attempt: previous.attempt + 1,
    values,
    programs: echo,
    errors: {},
    formError: null,
    ...patch,
  });

  const { details, errors } = checkInstitution(values);
  const programs = checkPrograms(listed, others);
  if (!details || !programs.ok) {
    return reply({ errors: { ...errors, ...(programs.ok ? {} : { programs: programs.error }) }, formError: 'Check the fields marked below.' });
  }

  const supabase = await createClient();
  const { data: institutionId, error } = await supabase.rpc('onboard_institution', {
    p_name: details.name,
    p_type: details.type,
    p_city: details.city,
    p_state: details.state,
    p_website: details.website,
    p_instagram: details.instagram,
    p_youtube: details.youtube ?? '',
    p_other_links: details.otherLinks,
    p_programs: programs.value.map((program) => ({ name: program.name, program_key: program.programKey ?? '' })),
  });
  if (error || !institutionId) {
    if (error?.message.includes('already_onboarded')) redirect('/');
    return reply({ formError: friendlyError(error?.message) });
  }

  await pullDemandFirst(institutionId);
  // A new Free college is a lead for the team (spec section 27): the alert goes now.
  await alertAfterEnquiry(() => sendTeamLeadAlerts(createAdminClient(), { appUrl: APP_URL }));

  // A claimed record may already have a Paid or Client plan (set by the team). Then there is no
  // Free program to pick, and the first Audit runs straight away.
  const { data: plan } = await supabase.from('plans').select('tier, starts_at, ends_at').eq('institution_id', institutionId).maybeSingle();
  const tier = effectiveTier(plan ? { tier: plan.tier, startsAt: new Date(plan.starts_at), endsAt: plan.ends_at ? new Date(plan.ends_at) : null } : null, new Date());
  if (tier === 'free') redirect('/onboarding');

  try {
    await runAudit(createAdminClient(), { institutionId, asOf: new Date(), trigger: 'signup', createdBy: viewer.userId });
  } catch (runError) {
    // The institution is saved either way. The Audit page says when the first Audit runs.
    if (runError instanceof AuditRunError) redirect('/audit');
    throw runError;
  }
  // Home, where Start here walks through the score, the first fix and rivals.
  redirect('/');
}

export interface ChoiceState {
  error: string | null;
}

export async function chooseFreeProgramAction(_previous: ChoiceState, formData: FormData): Promise<ChoiceState> {
  const viewer = await getViewer();
  if (!viewer?.membership) redirect('/onboarding');
  if (viewer.membership.role !== 'owner') return { error: 'The owner of this account picks the program.' };

  const programId = String(formData.get('program') ?? '');
  if (!programId) return { error: 'Choose one program.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_free_program', { p_program: programId });
  if (error) return { error: friendlyError(error.message) };

  // The first Audit runs now. If there is already an Audit (for example after a Paid plan
  // ended), the choice simply applies at the next free Audit.
  const { count } = await supabase.from('audits').select('id', { count: 'exact', head: true }).eq('institution_id', viewer.membership.institution.id);
  if (!count) {
    try {
      await runAudit(createAdminClient(), { institutionId: viewer.membership.institution.id, asOf: new Date(), trigger: 'signup', createdBy: viewer.userId });
    } catch (runError) {
      if (runError instanceof AuditRunError) return { error: runError.message };
      throw runError;
    }
    redirect('/');
  }
  redirect('/audit');
}
