// Enquiries on the server, with the service key (spec section 27): the alert emails the database
// queued when a lead came in or came back, sent and logged in email_log (who, when and whether it
// went, never the message). Called right after anything comes in (the website's form, a request
// from a dashboard, a new Free college, a lead added by hand); whatever waits from before goes too.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types.ts';
import { getEmailProvider } from '../providers/registry.ts';
import { teamLeadAlertEmail } from './alert.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

export class EnquiryJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnquiryJobError';
  }
}

/** Sends every alert waiting. Returns how many emails went and how many did not. */
export async function sendTeamLeadAlerts(db: Db, options: { appUrl: string; env?: Env }): Promise<{ sent: number; failed: number }> {
  const claimed = await db.rpc('claim_team_lead_alerts');
  if (claimed.error) throw new EnquiryJobError(`Could not read the alerts waiting: ${claimed.error.message}`);
  let sent = 0;
  let failed = 0;
  const email = getEmailProvider(options.env);
  for (const alert of claimed.data ?? []) {
    const [found, recipients] = await Promise.all([
      db.from('team_leads').select('id, name, institution, institution_id, city, phone, email, wants, source, source_detail, owner_id, last_in_at, created_at').eq('id', alert.lead_id).maybeSingle(),
      db.rpc('team_lead_alert_recipients', { p_lead: alert.lead_id, p_skip: alert.skip_user ?? undefined }),
    ]);
    if (found.error) throw new EnquiryJobError(`Could not read the enquiry: ${found.error.message}`);
    if (recipients.error) throw new EnquiryJobError(`Could not read who gets the alert: ${recipients.error.message}`);
    const lead = found.data;
    const to = (recipients.data ?? []) as string[];
    if (!lead || to.length === 0) continue;
    const owner = lead.owner_id ? await ownerName(db, lead.owner_id) : null;
    const results = await email.send(
      teamLeadAlertEmail(
        {
          kind: alert.kind === 'returning' ? 'returning' : 'new',
          name: lead.name,
          institution: lead.institution,
          city: lead.city,
          phone: lead.phone,
          email: lead.email,
          wants: lead.wants,
          source: lead.source,
          sourceDetail: lead.source_detail,
          owner,
          at: alert.created_at,
          url: `${options.appUrl}/team/enquiries/${lead.id}`,
        },
        to,
      ),
    );
    const logged = await db
      .from('email_log')
      .insert(results.map((result) => ({ kind: 'team_lead_alert' as const, institution_id: lead.institution_id, recipient: result.recipient, sender: email.sender, ok: result.ok, error: result.error })));
    if (logged.error) throw new EnquiryJobError(`Could not log the alert: ${logged.error.message}`);
    sent += results.filter((result) => result.ok).length;
    failed += results.filter((result) => !result.ok).length;
  }
  return { sent, failed };
}

async function ownerName(db: Db, userId: string): Promise<string | null> {
  const [name, user] = await Promise.all([db.from('person_names').select('name').eq('user_id', userId).maybeSingle(), db.auth.admin.getUserById(userId)]);
  return name.data?.name ?? user.data.user?.email ?? null;
}

/**
 * After something came in: the alerts go, and a problem sending never loses the enquiry (it is
 * saved already). Used by the website's form, the dashboard's requests, sign up and the team.
 */
export async function alertAfterEnquiry(send: () => Promise<unknown>): Promise<void> {
  try {
    await send();
  } catch (error) {
    console.error(`The enquiry alert did not go: ${error instanceof Error ? error.message : String(error)}`);
  }
}
