'use server';

// Enquiries (spec section 27): adding a lead by hand, working one (details, status, owner,
// follow-up, notes, the college it is), making a won lead a Client, and the team's tracking links.
// Each checks the person here; the database functions check the same again: Admins and Team
// members any lead, a Client manager the leads they own; owners, links and Make Client for Admins
// and Team members only.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuditRunError, runAudit } from '@/audit/run';
import { foundItems } from '@/brain/jobs';
import { isFullTeam } from '@/domain/types';
import { checkCity, checkName, checkType, checkWebsite, tidyText } from '@/domain/onboarding';
import { clientInviteEmail } from '@/enquiries/invite-email';
import { getEmailProvider } from '@/providers/registry';
import { alertAfterEnquiry, sendTeamLeadAlerts } from '@/enquiries/jobs';
import { LOST_REASONS, SOCIAL_SOURCES, TEAM_LEAD_STATUSES, type LostReason, type SocialSource, type TeamLeadStatus } from '@/enquiries/model';
import { getViewer } from '@/lib/auth/viewer';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';
import { APP_URL } from '@/lib/urls';
import { writeRivalActions } from '@/rivals/jobs';
import { indianPhone } from '@/leads/form';
import type { ActionState } from '@/app/team/institutions/[id]/actions';

const reply = (previous: ActionState, status: ActionState['status'], message: string | null): ActionState => ({ status, message, attempt: previous.attempt + 1 });

const LIST = '/team/enquiries';
const leadPath = (id: string) => `${LIST}/${id}`;
const NOT_ALLOWED = 'Only the AdmitLabs team works on enquiries.';
const FAILED = 'That did not save. Try again.';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function teamUser() {
  const viewer = await getViewer();
  return viewer?.teamRole && !viewer.viewingAs ? viewer : null;
}

const field = (formData: FormData, name: string) => tidyText(String(formData.get(name) ?? '').replace(/\s+/g, ' ').trim());

/** The details a person types for a lead, checked; the database checks again. */
function readDetails(formData: FormData, has: (name: string) => boolean): { fields: Record<string, string | null> } | { error: string } {
  const fields: Record<string, string | null> = {};
  if (has('name')) fields.name = field(formData, 'name') || null;
  if (has('institution')) fields.institution = field(formData, 'institution') || null;
  if (has('city')) fields.city = field(formData, 'city') || null;
  if (has('wants')) fields.wants = tidyText(String(formData.get('wants') ?? '').trim()) || null;
  if (has('email')) {
    const email = field(formData, 'email').toLowerCase();
    if (email && !EMAIL.test(email)) return { error: 'Enter a valid email, like name@college.ac.in.' };
    fields.email = email || null;
  }
  if (has('phone')) {
    const typed = field(formData, 'phone');
    const phone = typed ? indianPhone(typed) : null;
    if (typed && !phone) return { error: 'Enter a phone number of 10 digits, like 98765 43210.' };
    fields.phone = phone;
  }
  if (has('next_follow_up')) {
    const day = field(formData, 'next_follow_up');
    if (day && !DATE.test(day)) return { error: 'Pick a day for the next follow-up.' };
    fields.next_follow_up = day || null;
  }
  if ((fields.name ?? null) === null && (fields.institution ?? null) === null && has('name') && has('institution')) return { error: 'Add their name, or their institution.' };
  if ((fields.name?.length ?? 0) > 120 || (fields.institution?.length ?? 0) > 160 || (fields.city?.length ?? 0) > 80 || (fields.wants?.length ?? 0) > 500) {
    return { error: 'Shorten it a little: a name up to 120 characters, what they want up to 500.' };
  }
  return { fields };
}

function friendly(message: string): string {
  if (message.includes('lost_reason')) return 'Pick why it was lost.';
  if (message.includes('team_leads_contact')) return 'Keep a phone number or an email, so the team can reach them.';
  if (message.includes('team_leads_who')) return 'Keep their name, or their institution.';
  if (message.includes('not_allowed') || message.includes('not_team')) return NOT_ALLOWED;
  return FAILED;
}

/** A lead added by hand, from a call, an event or a message. The same email or phone joins the lead there is. */
export async function addLeadAction(previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await teamUser();
  if (!viewer) return reply(previous, 'error', NOT_ALLOWED);
  const read = readDetails(formData, () => true);
  if ('error' in read) return reply(previous, 'error', read.error);
  if (!read.fields.phone && !read.fields.email) return reply(previous, 'error', 'Add a phone number or an email, so the team can reach them.');
  const source = String(formData.get('source') ?? '');
  if (!(SOCIAL_SOURCES as readonly string[]).includes(source)) return reply(previous, 'error', 'Say where they came from.');
  const owner = String(formData.get('owner') ?? '');
  const note = tidyText(String(formData.get('note') ?? '').trim());
  if (note.length > 2000) return reply(previous, 'error', 'Keep the note under 2,000 characters.');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('add_team_lead', {
    p_fields: read.fields as unknown as Json,
    p_source: source as SocialSource,
    p_owner: isFullTeam(viewer.teamRole) && owner ? owner : undefined,
    p_note: note || undefined,
  });
  const added = data?.[0];
  if (error || !added) return reply(previous, 'error', error ? friendly(error.message) : FAILED);
  await alertAfterEnquiry(() => sendTeamLeadAlerts(createAdminClient(), { appUrl: APP_URL }));
  revalidatePath(LIST);
  redirect(`${leadPath(added.lead_id)}${added.joined ? '?joined=1' : ''}`);
}

/** The lead's details: who, the institution, city, phone, email, what they want, the next follow-up. */
export async function saveLeadAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await teamUser())) return reply(previous, 'error', NOT_ALLOWED);
  const read = readDetails(formData, (name) => formData.has(name));
  if ('error' in read) return reply(previous, 'error', read.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc('save_team_lead', { p_lead: leadId, p_fields: read.fields as unknown as Json });
  if (error) return reply(previous, 'error', friendly(error.message));
  revalidatePath(leadPath(leadId));
  revalidatePath(LIST);
  return reply(previous, 'done', 'Saved.');
}

export async function setStatusAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await teamUser())) return reply(previous, 'error', NOT_ALLOWED);
  const status = String(formData.get('status') ?? '');
  if (!(TEAM_LEAD_STATUSES as readonly string[]).includes(status)) return reply(previous, 'error', 'Pick a status.');
  const reason = String(formData.get('reason') ?? '');
  if (status === 'lost' && !(LOST_REASONS as readonly string[]).includes(reason)) return reply(previous, 'error', 'Pick why it was lost.');
  const note = tidyText(String(formData.get('lost_note') ?? '').trim());
  if (note.length > 300) return reply(previous, 'error', 'Keep the note under 300 characters.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_team_lead_status', {
    p_lead: leadId,
    p_status: status as TeamLeadStatus,
    p_reason: status === 'lost' ? (reason as LostReason) : undefined,
    p_note: status === 'lost' && note ? note : undefined,
  });
  if (error) return reply(previous, 'error', friendly(error.message));
  revalidatePath(leadPath(leadId));
  revalidatePath(LIST);
  return reply(previous, 'done', status === 'won' ? 'Won. Make them a Client below when they are ready.' : 'Saved.');
}

/** Admins and Team members give a lead to someone on the team, or to nobody. */
export async function setOwnerAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await teamUser();
  if (!isFullTeam(viewer?.teamRole)) return reply(previous, 'error', 'Admins and Team members give a lead its owner.');
  const owner = String(formData.get('owner') ?? '');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_team_lead_owner', { p_lead: leadId, p_owner: (owner || null) as string });
  if (error) return reply(previous, 'error', friendly(error.message));
  revalidatePath(leadPath(leadId));
  revalidatePath(LIST);
  return reply(previous, 'done', owner ? 'Owner saved. They see it in their Enquiries.' : 'Nobody owns it now.');
}

export async function addLeadNoteAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await teamUser())) return reply(previous, 'error', NOT_ALLOWED);
  const body = String(formData.get('body') ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line.trim() ? tidyText(line) : ''))
    .join('\n')
    .trim();
  if (!body) return reply(previous, 'error', 'Write the note first.');
  if (body.length > 2000) return reply(previous, 'error', 'Keep a note under 2,000 characters.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('add_team_lead_note', { p_lead: leadId, p_body: body });
  if (error) return reply(previous, 'error', friendly(error.message));
  revalidatePath(leadPath(leadId));
  return reply(previous, 'done', 'Note added.');
}

/** The college a lead is, in Drishti, or none. */
export async function linkInstitutionAction(leadId: string, institutionId: string | null): Promise<void> {
  if (!(await teamUser())) return;
  const supabase = await createClient();
  await supabase.rpc('link_team_lead', { p_lead: leadId, p_institution: institutionId as string });
  revalidatePath(leadPath(leadId));
  redirect(leadPath(leadId));
}

/**
 * Make Client (Admins and Team members): a Won lead whose college has signed up becomes a Client.
 * The database sets the plan and starts onboarding; then, as Make them a Client on the
 * institution page does, the first Client Audit runs, and what Drishti found waits in the Client
 * Brain for the team to confirm.
 */
export async function makeClientAction(leadId: string, previous: ActionState): Promise<ActionState> {
  const viewer = await teamUser();
  if (!viewer || !isFullTeam(viewer.teamRole)) return reply(previous, 'error', 'Admins and Team members make a won enquiry a Client.');
  const supabase = await createClient();
  const { data: institutionId, error } = await supabase.rpc('make_client_from_lead', { p_lead: leadId });
  if (error || !institutionId) {
    const message = error?.message ?? '';
    return reply(
      previous,
      'error',
      message.includes('not_won')
        ? 'Mark it Won first.'
        : message.includes('not_signed_up')
          ? 'Their college has not signed up for Drishti yet. Once it has, link it here and make them a Client.'
          : message.includes('no_institution')
            ? 'Link it to their college in Drishti first.'
            : message.includes('made_client')
              ? 'They are a Client already.'
              : FAILED,
    );
  }
  const problem = await firstClientAudit(institutionId, viewer.userId);
  revalidatePath(leadPath(leadId));
  revalidatePath(LIST);
  revalidatePath('/team', 'layout');
  return reply(
    previous,
    'done',
    problem ? `They are a Client now, and onboarding has started. The first Client Audit could not run: ${problem}` : 'They are a Client now. Onboarding has started: their Client Brain is open, with what Drishti found to confirm.',
  );
}

/**
 * After a college becomes a Client: its first Client Audit, then what Drishti found waits in the
 * Client Brain for the team to confirm. Says what stopped the Audit, if anything (a college with
 * no programs yet has nothing to audit).
 */
async function firstClientAudit(institutionId: string, userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const now = new Date();
    await runAudit(admin, { institutionId, asOf: now, trigger: 'scheduled', createdBy: userId });
    await writeRivalActions(admin, institutionId, now);
    const found = await foundItems(supabase, institutionId);
    if (found.length) {
      await supabase.rpc('add_found_brain_items', {
        p_institution: institutionId,
        p_items: found.map((item) => ({ kind: item.kind, fields: item.fields, source_url: item.sourceUrl, found_at: item.foundAt })) as unknown as Json,
      });
    }
    return null;
  } catch (runError) {
    if (!(runError instanceof AuditRunError)) throw runError;
    return runError.message;
  }
}

/**
 * Make Client for a college not in Drishti (Admins and Team members): the college is added (or,
 * when the owner's email or the website is already a college in Drishti, that one is linked), it
 * becomes a Client, onboarding starts, and the owner gets an email to sign in.
 */
export async function makeClientWithCollegeAction(leadId: string, previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await teamUser();
  if (!viewer || !isFullTeam(viewer.teamRole)) return reply(previous, 'error', 'Admins and Team members make a won enquiry a Client.');
  const name = checkName(String(formData.get('name') ?? ''));
  const type = checkType(String(formData.get('type') ?? ''));
  const place = checkCity(String(formData.get('city') ?? ''), String(formData.get('state') ?? ''));
  const website = checkWebsite(String(formData.get('website') ?? ''));
  const email = field(formData, 'owner_email').toLowerCase();
  if (!name.ok) return reply(previous, 'error', 'Enter the college’s name.');
  if (!type.ok) return reply(previous, 'error', type.error);
  if (!place.ok) return reply(previous, 'error', 'Choose their city from the list.');
  if (!website.ok) return reply(previous, 'error', 'Enter their website, like college.edu.in.');
  if (!EMAIL.test(email)) return reply(previous, 'error', 'Enter the owner’s email, like principal@college.edu.in.');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('make_client_with_college', {
    p_lead: leadId,
    p_name: name.value,
    p_type: type.value,
    p_city: place.value.city,
    p_state: place.value.state,
    p_website: website.value,
    p_owner_email: email,
  });
  const made = data?.[0];
  if (error || !made) {
    const message = error?.message ?? '';
    return reply(
      previous,
      'error',
      message.includes('team_email')
        ? 'That email is on the AdmitLabs team. Enter the college owner’s own email.'
        : message.includes('not_won')
          ? 'Mark it Won first.'
          : message.includes('linked')
            ? 'It is linked to a college already: use Make Client above.'
            : message.includes('made_client')
              ? 'They are a Client already.'
              : FAILED,
    );
  }
  const { data: college } = await supabase.from('institutions').select('name').eq('id', made.institution_id).maybeSingle();
  const collegeName = college?.name ?? name.value;
  if (made.invited) await alertAfterEnquiry(() => sendClientInvite(made.institution_id, collegeName, email, viewer.userId));
  const problem = await firstClientAudit(made.institution_id, viewer.userId);
  revalidatePath(leadPath(leadId));
  revalidatePath(LIST);
  revalidatePath('/team', 'layout');
  const what =
    made.outcome === 'linked'
      ? `${collegeName} is in Drishti already, so it is linked: no second one. It is a Client now, and onboarding has started.`
      : `${collegeName} is in Drishti and a Client now. Onboarding has started.`;
  const invited = made.invited ? ` ${email} has an email to sign in as its owner.` : '';
  const audit = problem ? ' Their first Client Audit runs once they add their programs.' : ' Their first Client Audit is ready.';
  return reply(previous, 'done', `${what}${invited}${audit}`);
}

/** The owner's invitation email, logged like every email (never the message). */
async function sendClientInvite(institutionId: string, college: string, to: string, by: string): Promise<void> {
  const admin = createAdminClient();
  const { data: name } = await admin.from('person_names').select('name').eq('user_id', by).maybeSingle();
  const email = getEmailProvider();
  const results = await email.send(clientInviteEmail({ college, from: name?.name ?? null, loginUrl: `${APP_URL}/login` }, to));
  await admin.from('email_log').insert(results.map((result) => ({ kind: 'client_invite' as const, institution_id: institutionId, recipient: result.recipient, sender: email.sender, ok: result.ok, error: result.error })));
}

// Tracking links -------------------------------------------------------------------------------------

export async function createLinkAction(previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await teamUser();
  if (!isFullTeam(viewer?.teamRole)) return reply(previous, 'error', 'Admins and Team members make tracking links.');
  const name = field(formData, 'name');
  const source = String(formData.get('source') ?? '');
  if (name.length < 2) return reply(previous, 'error', 'Name the link, like "Instagram bio".');
  if (name.length > 80) return reply(previous, 'error', 'Keep the name under 80 characters.');
  if (!(SOCIAL_SOURCES as readonly string[]).includes(source)) return reply(previous, 'error', 'Say where the link will be used.');
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_team_lead_link', { p_name: name, p_source: source as SocialSource });
  if (error) return reply(previous, 'error', FAILED);
  revalidatePath(LIST);
  return reply(previous, 'done', 'Link made. Copy it below.');
}

export async function archiveLinkAction(linkId: string): Promise<void> {
  const viewer = await teamUser();
  if (!isFullTeam(viewer?.teamRole)) return;
  const supabase = await createClient();
  await supabase.rpc('archive_team_lead_link', { p_link: linkId });
  revalidatePath(LIST);
}
