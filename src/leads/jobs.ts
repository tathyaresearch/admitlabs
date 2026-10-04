// Leads on the server, with the service key (spec section 23): the email to the admissions team
// for each new enquiry, sent straight away (it never waits for a review), each one logged in
// email_log (who, when and whether it went, never the message); and every day, deleting the
// enquiries past their college's keeping time. The one path for the form, the scripts and tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types.ts';
import { getEmailProvider } from '../providers/registry.ts';
import { leadAlertEmail } from './alert.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

export class LeadsJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadsJobError';
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new LeadsJobError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new LeadsJobError(`No ${what} found.`);
  return result.data;
}

/** The alert for one new enquiry, to each address that gets them. Returns how many went and how many did not. */
export async function sendLeadAlert(db: Db, leadId: string, options: { leadsUrl: string; env?: Env }): Promise<{ sent: number; failed: number }> {
  const found = await db.from('leads').select('id, institution_id, link_id, program_id, name, phone, email, city, created_at').eq('id', leadId).maybeSingle();
  if (found.error) throw new LeadsJobError(`Could not read the enquiry: ${found.error.message}`);
  const lead = found.data;
  if (!lead) throw new LeadsJobError('No enquiry found.');
  const [institution, link, program, recipients] = await Promise.all([
    db.from('institutions').select('name').eq('id', lead.institution_id).single(),
    lead.link_id ? db.from('lead_links').select('name, used_on').eq('id', lead.link_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    lead.program_id ? db.from('programs').select('name').eq('id', lead.program_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    db.rpc('lead_alert_recipients', { p_institution: lead.institution_id }),
  ]);
  const college = must(institution, 'institution').name;
  if (recipients.error) throw new LeadsJobError(`Could not read who gets the alert: ${recipients.error.message}`);
  const to = recipients.data ?? [];
  if (to.length === 0) return { sent: 0, failed: 0 };

  const email = getEmailProvider(options.env);
  const results = await email.send(
    leadAlertEmail(
      {
        college,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        course: program.data?.name ?? null,
        link: link.data ? { name: link.data.name, usedOn: link.data.used_on } : null,
        sentAt: lead.created_at,
        leadsUrl: options.leadsUrl,
      },
      to,
    ),
  );
  const logged = await db
    .from('email_log')
    .insert(results.map((result) => ({ kind: 'lead_alert' as const, institution_id: lead.institution_id, recipient: result.recipient, sender: email.sender, ok: result.ok, error: result.error })));
  if (logged.error) throw new LeadsJobError(`Could not log the alert: ${logged.error.message}`);
  return { sent: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length };
}

/** Every enquiry past its college's keeping time, deleted for good. Returns how many. */
export async function purgeOldLeads(db: Db, now: Date): Promise<number> {
  const { data, error } = await db.rpc('purge_old_leads', { p_now: now.toISOString() });
  if (error) throw new LeadsJobError(`Could not delete old enquiries: ${error.message}`);
  return data ?? 0;
}
