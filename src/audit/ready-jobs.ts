// Free's Audit ready email on the server, with the service key (spec sections 11 and 24): when a
// free Audit is approved (by the team, or as it is made when it is sent automatically), to the
// owner and the members who keep it on. Each send is logged in email_log: who, when and whether it
// went, never the message. In this build it goes to the local test inbox.

import type { SupabaseClient } from '@supabase/supabase-js';
import { auditFixPath } from '../domain/fix-key.ts';
import { formatDate } from '../domain/format.ts';
import { upcomingAudit } from '../domain/schedule.ts';
import { EFFORT_LABELS, IMPACT_LABELS, PLACE_LABELS } from '../domain/types.ts';
import type { Database } from '../lib/supabase/database.types.ts';
import { APP_URL } from '../lib/urls.ts';
import { getEmailProvider } from '../providers/registry.ts';
import { auditPlaces } from './places.ts';
import { storedAuditById, storedFindings } from './read.ts';
import { auditReadyEmail } from './ready-email.ts';

type Db = SupabaseClient<Database>;
type Env = Readonly<Record<string, string | undefined>>;

export class ReadyEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadyEmailError';
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new ReadyEmailError(`Could not read ${what}: ${result.error.message}`);
  if (result.data === null) throw new ReadyEmailError(`No ${what} found.`);
  return result.data;
}

/** The Audit ready email for one approved free Audit, to each person who keeps it on. Returns how many went and how many did not. */
export async function sendAuditReadyEmails(
  db: Db,
  auditId: string,
  options: { reviewed: boolean; now?: Date; env?: Env; appUrl?: string },
): Promise<{ sent: number; failed: number }> {
  const audit = await storedAuditById(db, auditId);
  if (!audit || audit.kind !== 'free' || audit.review !== 'approved') return { sent: 0, failed: 0 };
  const [institutionResult, planResult, programsResult, findings, recipients, earlier] = await Promise.all([
    db.from('institutions').select('name, type, city').eq('id', audit.institutionId).maybeSingle(),
    db.from('plans').select('tier, starts_at, ends_at, free_program_id').eq('institution_id', audit.institutionId).maybeSingle(),
    db.from('programs').select('id, name').eq('institution_id', audit.institutionId),
    storedFindings(db, auditId),
    db.rpc('summary_recipients', { p_institution: audit.institutionId }),
    db
      .from('audits')
      .select('run_at, trigger')
      .eq('institution_id', audit.institutionId)
      .in('kind', ['free', 'paid', 'client'])
      .eq('review', 'approved')
      .lt('run_at', audit.runAt)
      .order('run_at', { ascending: false }),
  ]);
  const institution = must(institutionResult, 'the institution');
  const programs = must(programsResult, 'programs');
  if (planResult.error) throw new ReadyEmailError(`Could not read the plan: ${planResult.error.message}`);
  if (recipients.error) throw new ReadyEmailError(`Could not read who gets the email: ${recipients.error.message}`);
  const before = must(earlier, 'earlier Audits');
  const to = recipients.data ?? [];
  if (to.length === 0) return { sent: 0, failed: 0 };

  const names = new Map(programs.map((program) => [program.id, program.name]));
  const view = auditPlaces(audit, findings, { institutionType: institution.type, city: institution.city, programNames: names, previousRunAt: before[0]?.run_at ?? null });
  const appUrl = options.appUrl ?? APP_URL;
  const plan = planResult.data ? { tier: planResult.data.tier, startsAt: new Date(planResult.data.starts_at), endsAt: planResult.data.ends_at ? new Date(planResult.data.ends_at) : null } : null;
  // The schedule counts from the sign up and scheduled Audits, never an extra refresh.
  const lastScheduled = audit.trigger === 'signup' || audit.trigger === 'scheduled' ? audit.runAt : (before.find((row) => row.trigger === 'signup' || row.trigger === 'scheduled')?.run_at ?? null);
  const next = upcomingAudit(plan, lastScheduled ? new Date(lastScheduled) : null, options.now ?? new Date());
  const first = before.length === 0;

  const email = getEmailProvider(options.env);
  const results = await email.send(
    auditReadyEmail(
      {
        institution: institution.name,
        program: planResult.data?.free_program_id ? (names.get(planResult.data.free_program_id) ?? null) : null,
        city: institution.city,
        words: view.words.map((word) => ({ name: word.name, score: Math.round(word.score), word: word.word, note: word.moved ?? word.question })),
        fixes: view.topFixes.map((fix) => ({
          title: fix.title,
          meta: [`${PLACE_LABELS[fix.place]}, ${fix.label}`, `Impact ${IMPACT_LABELS[fix.impact]}`, fix.effort ? `Effort ${EFFORT_LABELS[fix.effort]}` : null].filter(Boolean).join(' · '),
          url: `${appUrl}${auditFixPath(fix.id)}`,
        })),
        first,
        reviewed: options.reviewed,
        auditUrl: first ? `${appUrl}/audit` : `${appUrl}/#changed`,
        planUrl: `${appUrl}/plan`,
        nextAuditOn: next && next.tier === 'free' ? formatDate(next.on) : null,
      },
      to,
    ),
  );
  const logged = await db
    .from('email_log')
    .insert(results.map((result) => ({ kind: 'audit_ready' as const, institution_id: audit.institutionId, recipient: result.recipient, sender: email.sender, ok: result.ok, error: result.error })));
  if (logged.error) throw new ReadyEmailError(`Could not log the email: ${logged.error.message}`);
  return { sent: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length };
}
