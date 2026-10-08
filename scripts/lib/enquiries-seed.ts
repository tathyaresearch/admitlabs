// Seeds the sample Enquiries (spec section 27) through the database directly, with the service
// key: the team's tracking links, then everything that came in and what the team did, in date
// order, so each lead's History reads as it would live. The database joins each enquiry to its
// lead (the same email or phone) as it would for the website. Nobody is emailed: every alert the
// sample makes counts as sent.

import type { SupabaseClient } from '@supabase/supabase-js';
import { istDate } from '../../src/domain/dates.ts';
import type { Database } from '../../src/lib/supabase/database.types.ts';
import { SAMPLE_DASHBOARD_ASKS, SAMPLE_HAND_LEADS, SAMPLE_LEAD_WORK, SAMPLE_TALK_ENQUIRIES, SAMPLE_TEAM_LINKS } from '../../src/sample/enquiries.ts';
import { institutionId } from '../../src/sample/ids.ts';
import { SAMPLE_INSTITUTIONS } from '../../src/sample/institutions.ts';
import { fail } from './local.ts';

type Db = SupabaseClient<Database>;

const at = (ymd: string, hour = 10) => istDate(ymd, hour).toISOString();

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) fail(`Could not seed Enquiries (${what}): ${result.error.message}`);
  return result.data as T;
}

type Step = { at: string; run: () => Promise<void> };

export async function seedEnquiries(db: Db, user: (email: string) => string): Promise<{ leads: number; links: number }> {
  const links = must(
    await db
      .from('team_lead_links')
      .insert(SAMPLE_TEAM_LINKS.map((link) => ({ code: link.code, name: link.name, source: link.source, created_by: user(link.by), created_at: at(link.on, 9) })))
      .select('id, code'),
    'tracking links',
  );
  const linkId = (code: string) => links.find((link) => link.code === code)?.id ?? fail(`No link ${code}.`);

  /** A lead by its email or phone (the last 10 digits). */
  async function lead(match: string): Promise<string> {
    const query = match.includes('@') ? db.from('team_leads').select('id').eq('email', match) : db.from('team_leads').select('id').like('phone', `%${match.slice(-10)}`);
    const rows = must(await query.limit(1), `the lead for ${match}`);
    return rows[0]?.id ?? fail(`No lead for ${match}.`);
  }

  const steps: Step[] = [
    ...SAMPLE_TALK_ENQUIRIES.map((entry) => ({
      at: at(entry.on, entry.hour),
      run: async () => {
        must(
          await db.from('enquiries').insert({
            kind: 'work_with_us',
            name: entry.name,
            institution: entry.institution,
            role: entry.role,
            email: entry.email,
            phone: entry.phone,
            program: entry.program,
            message: entry.message,
            team_link_id: entry.link ? linkId(entry.link) : null,
            created_at: at(entry.on, entry.hour),
          }),
          'the Talk to us form',
        );
      },
    })),
    ...SAMPLE_DASHBOARD_ASKS.map((ask) => ({
      at: at(ask.on, 12),
      run: async () => {
        const sample = SAMPLE_INSTITUTIONS.find((entry) => entry.slug === ask.slug) ?? fail(`No sample ${ask.slug}.`);
        const owner = sample.owner ?? fail(`${ask.slug} has no owner.`);
        must(
          await db.from('enquiries').insert({
            kind: ask.kind,
            institution_id: institutionId(ask.slug),
            asked_by: user(owner),
            institution: sample.name,
            email: owner,
            paid_months: ask.kind === 'ask_paid' ? (ask.months ?? 3) : null,
            created_at: at(ask.on, 12),
            handled_at: at(ask.handledOn, 15),
            handled_by: user(SAMPLE_LEAD_WORK.find((work) => work.match === owner)?.by ?? owner),
          }),
          'a request from a dashboard',
        );
      },
    })),
    ...SAMPLE_HAND_LEADS.map((entry) => ({
      at: at(entry.on, 13),
      run: async () => {
        const by = user(entry.by);
        const [row] = must(
          await db
            .from('team_leads')
            .insert({
              name: entry.name,
              institution: entry.institution,
              city: entry.city,
              phone: entry.phone,
              email: entry.email,
              wants: entry.wants,
              source: entry.source,
              owner_id: by,
              created_at: at(entry.on, 13),
              last_in_at: at(entry.on, 13),
              updated_at: at(entry.on, 13),
              created_by: by,
              updated_by: by,
            })
            .select('id'),
          'a lead added by hand',
        );
        if (!row) fail('A lead added by hand was not saved.');
        must(await db.from('team_lead_activity').insert({ lead_id: row.id, at: at(entry.on, 13), by, kind: 'created', data: { source: entry.source, by_hand: true } }), 'History');
      },
    })),
    ...SAMPLE_LEAD_WORK.map((work) => ({
      at: at(work.on, 16),
      run: async () => {
        const id = await lead(work.match);
        const when = at(work.on, 16);
        const by = user(work.by);
        const change: Database['public']['Tables']['team_leads']['Update'] = { updated_at: when, updated_by: by };
        if (work.owner !== undefined) change.owner_id = work.owner ? user(work.owner) : null;
        if (work.status) {
          change.status = work.status;
          change.lost_reason = work.lost?.reason ?? null;
          change.lost_note = work.lost?.note ?? null;
        }
        if (work.followUp !== undefined) change.next_follow_up = work.followUp;
        if (work.madeClient) {
          change.institution_id = institutionId(work.madeClient);
          change.made_client_at = when;
        }
        must(await db.from('team_leads').update(change).eq('id', id), 'what the team did');
        if (work.note) must(await db.from('team_lead_activity').insert({ lead_id: id, at: at(work.on, 17), by, kind: 'note', body: work.note }), 'a note');
      },
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  for (const step of steps) await step.run();

  // The sample emails nobody.
  must(await db.from('team_lead_alerts').update({ sent_at: new Date().toISOString() }).is('sent_at', null), 'the alerts');
  const { count, error } = await db.from('team_leads').select('id', { count: 'exact', head: true });
  if (error) fail(`Could not count leads: ${error.message}`);
  return { leads: count ?? 0, links: links.length };
}
