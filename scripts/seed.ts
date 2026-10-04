// Seeds Drishti's local database with the fictional sample world (spec section 20).
// Runs as part of `npm run db:reset`, which rebuilds the database first. Every sample Audit
// runs through the same path as a live one (mock providers, then the scoring engine, then
// record_audit). Rival checks and Demand pulls run through their live paths with the mock providers too.

import { INDIA_CITIES, nearCity } from '../src/config/cities.ts';
import { SCORING_V1 } from '../src/config/scoring.v1.ts';
import { TEAM_RULES } from '../src/config/team.ts';
import { runAudit } from '../src/audit/run.ts';
import { neededNow, pullDemand } from '../src/demand/jobs.ts';
import { pullDayOf } from '../src/demand/schedule.ts';
import { istDate } from '../src/domain/dates.ts';
import { formatDate } from '../src/domain/format.ts';
import { institutionDetailsToRow, programDetailsToRow } from '../src/domain/details.ts';
import { paidPlanEndsAt } from '../src/domain/tiers.ts';
import { TIER_LABELS } from '../src/domain/types.ts';
import type { Database, Json } from '../src/lib/supabase/database.types.ts';
import { makeReport, reportsDue } from '../src/report/jobs.ts';
import { monthEnd, reportDayOf } from '../src/report/schedule.ts';
import { checkRival, recordRivalAd, writeRivalActions } from '../src/rivals/jobs.ts';
import { consentLine } from '../src/leads/text.ts';
import {
  ADMIN_EMAIL,
  DEMAND_MONTHS,
  SAMPLE_ADS,
  SAMPLE_INSTITUTION_DETAILS,
  SAMPLE_GUIDE_CLOSED,
  SAMPLE_FIX_REQUESTS,
  SAMPLE_INSTITUTIONS,
  SAMPLE_LEAD_LINKS,
  SAMPLE_LEAD_SETTINGS,
  SAMPLE_LEADS,
  SAMPLE_MARKS,
  SAMPLE_NOTES,
  SAMPLE_PROGRAM_DETAILS,
  SAMPLE_RIVALS,
  SAMPLE_RUNS,
  SAMPLE_SHARES,
  SAMPLE_TEAM_WORK,
  SAMPLE_TODAY,
  SAMPLE_USERS,
  SAMPLE_WEEKLY_CHECKS_FROM,
  TEAM_EMAIL,
  institutionId,
  programId,
  sampleInstitution,
  sampleToken,
} from '../src/sample/index.ts';
import { serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Insert'];

const DAY_MS = 86_400_000;
/** The sample world's monthly reports: April to August 2026, each made on the 1st of the next month. */
const REPORT_MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'] as const;

const db = serviceClient();

const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
const at = (ymd: string, hour = 10) => istDate(ymd, hour).toISOString();

async function insert<T extends keyof Tables>(table: T, rows: Row<T>[]): Promise<void> {
  for (let start = 0; start < rows.length; start += 500) {
    const { error } = await db.from(table).insert(rows.slice(start, start + 500) as never);
    if (error) fail(`Could not insert into ${String(table)}: ${error.message}`);
  }
}

async function createUsers(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const user of SAMPLE_USERS) {
    const { data, error } = await db.auth.admin.createUser({ email: user.email, email_confirm: true });
    if (error || !data.user) fail(`Could not create the sample user ${user.email}: ${error?.message ?? 'no user returned'}`);
    ids.set(user.email, data.user.id);
  }
  return ids;
}


async function main(): Promise<void> {
  const { count, error } = await db.from('institutions').select('id', { count: 'exact', head: true });
  if (error) fail(`Could not reach Drishti's local database: ${error.message}`);
  if (count) fail('The database already has data. Run `npm run db:reset` to rebuild it with sample data.');

  const users = await createUsers();
  const userId = (email: string | null) => (email ? (users.get(email) ?? null) : null);
  const requireUser = (email: string) => users.get(email) ?? fail(`Sample user ${email} was not created.`);

  await insert('cities', INDIA_CITIES.map((city) => ({ name: city.name, state: city.state, near: nearCity(city) })));
  await insert('scoring_config', [
    {
      version: SCORING_V1.version,
      weights: json(SCORING_V1.weights),
      result_shares: json(SCORING_V1.resultShares),
      thresholds: json(SCORING_V1.thresholds),
      labels: json(SCORING_V1.labels),
      impact: json(SCORING_V1.impact),
      active: true,
    },
  ]);

  await insert(
    'institutions',
    SAMPLE_INSTITUTIONS.map((sample) => ({
      id: institutionId(sample.slug),
      slug: sample.slug,
      name: sample.name,
      type: sample.type,
      city: sample.city,
      state: sample.state,
      website: sample.website,
      instagram: sample.instagram,
      youtube: sample.youtube,
      other_links: json(sample.otherLinks),
      created_at: at(sample.createdAt),
    })),
  );
  await insert(
    'institution_status',
    SAMPLE_INSTITUTIONS.map((sample) => ({
      institution_id: institutionId(sample.slug),
      claimed: sample.claimedAt !== null,
      claimed_at: sample.claimedAt ? at(sample.claimedAt) : null,
      is_prospect: sample.isProspect,
      // Review first is on to start; Brightpath's Audits go out automatically (spec section 25).
      review_first: sample.reviewFirst ?? true,
      created_by: userId(sample.createdBy),
    })),
  );
  await insert(
    'programs',
    SAMPLE_INSTITUTIONS.flatMap((sample) =>
      sample.programs.map((program) => ({
        id: programId(sample.slug, program.programKey),
        institution_id: institutionId(sample.slug),
        name: program.name,
        program_key: program.programKey,
        created_at: at(sample.createdAt),
      })),
    ),
  );
  // What some institutions added about themselves in Settings ("Added by you"). Never scored.
  await insert(
    'institution_details',
    Object.entries(SAMPLE_INSTITUTION_DETAILS).map(([slug, details]) => ({
      institution_id: institutionId(slug),
      ...institutionDetailsToRow(details),
      updated_by: userId(sampleInstitution(slug).owner),
    })),
  );
  await insert(
    'program_details',
    SAMPLE_PROGRAM_DETAILS.map(({ slug, programKey, details }) => ({
      program_id: programId(slug, programKey),
      institution_id: institutionId(slug),
      ...programDetailsToRow(details),
      updated_by: userId(sampleInstitution(slug).owner),
    })),
  );
  await insert(
    'memberships',
    SAMPLE_USERS.flatMap((user) => {
      if (!user.institutionSlug || !user.membershipRole) return [];
      // Owners joined when they signed up; members a week later, when the owner invited them.
      const signedUp = istDate(sampleInstitution(user.institutionSlug).claimedAt ?? SAMPLE_TODAY, 10);
      const joined = user.membershipRole === 'owner' ? signedUp : new Date(signedUp.getTime() + 7 * DAY_MS);
      // People who have used Drishti for months closed Start here a day after they joined.
      const guideClosed = SAMPLE_GUIDE_CLOSED.includes(user.email) ? new Date(joined.getTime() + DAY_MS).toISOString() : null;
      return [
        {
          user_id: requireUser(user.email),
          institution_id: institutionId(user.institutionSlug),
          role: user.membershipRole,
          created_at: joined.toISOString(),
          guide_closed_at: guideClosed,
        },
      ];
    }),
  );
  // The team was there before the first institution was added.
  const teamSince = at(SAMPLE_INSTITUTIONS.map((sample) => sample.createdAt).sort()[0] ?? SAMPLE_TODAY, 9);
  await insert(
    'team_users',
    SAMPLE_USERS.flatMap((user) => (user.teamRole ? [{ user_id: requireUser(user.email), role: user.teamRole, created_at: teamSince }] : [])),
  );
  await insert(
    'plans',
    SAMPLE_INSTITUTIONS.flatMap((sample) => {
      if (!sample.plan) return [];
      const startsAt = istDate(sample.plan.startsAt, 10);
      const endsAt = sample.plan.tier === 'paid' ? paidPlanEndsAt(startsAt) : sample.plan.endsAt ? istDate(sample.plan.endsAt, 10) : null;
      return [
        {
          institution_id: institutionId(sample.slug),
          tier: sample.plan.tier,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt?.toISOString() ?? null,
          set_by: userId(sample.plan.setBy),
          free_program_id: sample.plan.freeProgramKey ? programId(sample.slug, sample.plan.freeProgramKey) : null,
        },
      ];
    }),
  );
  await insert(
    'rivals',
    SAMPLE_RIVALS.map(([tracker, rival, suggested, addedAt]) => ({
      institution_id: institutionId(tracker),
      rival_institution_id: institutionId(rival),
      suggested,
      added_at: at(addedAt),
    })),
  );
  // Each institution picked its rivals once, at signup. That first setup is not a change, so
  // Paid can still change its rivals this month.
  const trackers = new Map<string, { rivals: string[]; addedAt: string }>();
  for (const [tracker, rival, , addedAt] of SAMPLE_RIVALS) {
    const entry = trackers.get(tracker) ?? { rivals: [], addedAt };
    entry.rivals.push(institutionId(rival));
    trackers.set(tracker, entry);
  }
  await insert(
    'rival_changes',
    [...trackers.entries()].map(([tracker, entry]) => ({
      institution_id: institutionId(tracker),
      changed_at: at(entry.addedAt),
      changed_by: userId(sampleInstitution(tracker).owner),
      first_setup: true,
      rival_ids: entry.rivals,
    })),
  );

  // Fixes the owners marked done, on checks and on findings. Added before the Audits, so the first
  // approved own Audit after each mark checks it, as it would live.
  await insert(
    'done_marks',
    SAMPLE_MARKS.map((mark) => {
      const owner = sampleInstitution(mark.slug).owner;
      return { institution_id: institutionId(mark.slug), check_key: mark.check ?? null, finding_key: mark.finding ?? null, marked_by: userId(owner), marked_at: at(mark.markedOn, 17) };
    }),
  );

  // Audits: every sample run, own, rival and team, through the live path (collect, score, save).
  // With Review first on, the team approved each own Audit three hours after it ran, except the
  // runs still waiting in To review; Brightpath's went out automatically.
  const auditCounts = { own: 0, rival: 0, team: 0, waiting: 0 };
  let signalCount = 0;
  for (const sample of SAMPLE_INSTITUTIONS) {
    for (const run of SAMPLE_RUNS[sample.slug] ?? []) {
      const result = await runAudit(db, {
        institutionId: institutionId(sample.slug),
        asOf: istDate(run.day, 10),
        trigger: run.trigger,
        kind: run.kind === 'own' ? undefined : run.kind,
        createdBy: run.kind === 'team' ? requireUser(TEAM_EMAIL) : null,
        review: run.waiting ? 'waiting' : 'approved',
        ...(run.kind === 'own' && !run.waiting && (sample.reviewFirst ?? true) ? { approvedBy: requireUser(TEAM_EMAIL), approvedAt: istDate(run.day, 13) } : {}),
      });
      auditCounts[run.kind] += 1;
      if (run.waiting) auditCounts.waiting += 1;
      signalCount += result.signals;
    }
  }

  // Ads the team saw rivals run, each with a "Started ads" alert for Paid and Client trackers.
  for (const [index, ad] of SAMPLE_ADS.entries()) {
    await recordRivalAd(
      db,
      { rivalId: institutionId(ad.slug), promise: ad.promise, sourceUrl: `https://ads.example/library/${ad.slug}/${index + 1}`, enteredBy: requireUser(TEAM_EMAIL), enteredAt: istDate(ad.enteredAt, 16) },
      { notify: true },
    );
  }

  // The weekly rival check, every Monday from August to today, through the live path: new moves
  // (with alerts for Paid and Client trackers) and each month's best content.
  const tracked = [...new Set(SAMPLE_RIVALS.map(([, rival]) => rival))];
  let moveCount = 0;
  for (let day = istDate(SAMPLE_WEEKLY_CHECKS_FROM, 9); day.getTime() <= istDate(SAMPLE_TODAY, 9).getTime(); day = new Date(day.getTime() + 7 * DAY_MS)) {
    for (const slug of tracked) moveCount += (await checkRival(db, institutionId(slug), day, { notify: true })).newMoves;
  }

  // This month's Rivals 3 things to do, for the Paid and Client institutions.
  let actionCount = 0;
  for (const tracker of new Set(SAMPLE_RIVALS.map(([slug]) => slug))) {
    actionCount += await writeRivalActions(db, institutionId(tracker), istDate(SAMPLE_TODAY, 9));
  }

  const { count: contentCount } = await db.from('rival_content').select('id', { count: 'exact', head: true });

  await insert(
    'notes',
    SAMPLE_NOTES.map((note) => ({
      institution_id: institutionId(note.slug),
      author_id: requireUser(note.author === 'admin' ? ADMIN_EMAIL : TEAM_EMAIL),
      body: note.body,
      created_at: at(note.createdAt, 15),
    })),
  );
  // The Client's work log: what the AdmitLabs team did for Brightpath, and does next.
  await insert(
    'team_work',
    SAMPLE_TEAM_WORK.map((entry, index) => ({
      institution_id: institutionId(entry.slug),
      kind: entry.kind,
      body: entry.text,
      work_on: entry.on,
      link: entry.link,
      added_by: requireUser(entry.author === 'admin' ? ADMIN_EMAIL : TEAM_EMAIL),
      // Entries added the same day keep their order.
      created_at: istDate(entry.addedOn, 16, index).toISOString(),
    })),
  );

  // Share links: Cedar's team Audit, shared the day after it ran. The link is printed below.
  const shares: { url: string; name: string; expiresAt: Date }[] = [];
  for (const share of SAMPLE_SHARES) {
    const { data: audit, error: auditError } = await db
      .from('audits')
      .select('id')
      .eq('institution_id', institutionId(share.slug))
      .eq('kind', 'team')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (auditError || !audit) fail(`Could not find the team Audit to share for ${share.slug}.`);
    const createdAt = istDate(share.createdAt, 11);
    const expiresAt = new Date(createdAt.getTime() + TEAM_RULES.shareLinkDays * DAY_MS);
    await insert('share_links', [
      {
        token: sampleToken(share.slug),
        institution_id: institutionId(share.slug),
        audit_id: audit.id,
        created_by: requireUser(TEAM_EMAIL),
        created_at: createdAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
    ]);
    shares.push({ url: `http://localhost:3000/share/${sampleToken(share.slug)}`, name: sampleInstitution(share.slug).name, expiresAt });
  }

  // Let AdmitLabs fix this: one open request, one the team handled.
  await insert(
    'enquiries',
    SAMPLE_FIX_REQUESTS.map((request) => {
      const sample = sampleInstitution(request.slug);
      const owner = sample.owner ?? fail(`${request.slug} has no owner.`);
      return {
        kind: 'fix_request' as const,
        institution_id: institutionId(request.slug),
        asked_by: requireUser(owner),
        institution: sample.name,
        email: owner,
        fix_key: request.fixKey,
        fix_title: request.fixTitle,
        created_at: at(request.askedOn, 11),
        handled_at: request.handledOn ? at(request.handledOn, 15) : null,
        handled_by: request.handledOn ? requireUser(TEAM_EMAIL) : null,
      };
    }),
  );

  // Leads for Brightpath (Client): the team's tracking links, who gets the alert email, and the
  // enquiries students sent. Only Brightpath's own people can read them.
  await insert(
    'lead_links',
    SAMPLE_LEAD_LINKS.map((link) => ({
      institution_id: institutionId(link.slug),
      program_id: programId(link.slug, link.programKey),
      code: link.code,
      name: link.name,
      used_on: link.usedOn,
      created_by: requireUser(TEAM_EMAIL),
      created_at: at(link.createdOn, 12),
    })),
  );
  const { data: links, error: linkError } = await db.from('lead_links').select('id, code');
  if (linkError) fail(`Could not read the tracking links: ${linkError.message}`);
  const linkIds = new Map((links ?? []).map((link) => [link.code, link.id]));
  await insert(
    'lead_settings',
    SAMPLE_LEAD_SETTINGS.map((settings) => ({
      institution_id: institutionId(settings.slug),
      alert_emails: [...settings.alertEmails],
      keep_months: settings.keepMonths,
      updated_at: at(settings.updatedOn, 12),
      updated_by: userId(sampleInstitution(settings.slug).owner),
    })),
  );
  await insert(
    'leads',
    SAMPLE_LEADS.map((lead) => ({
      institution_id: institutionId(lead.slug),
      link_id: linkIds.get(lead.linkCode) ?? fail(`No tracking link ${lead.linkCode}.`),
      program_id: programId(lead.slug, lead.programKey),
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      consent: consentLine(sampleInstitution(lead.slug).name),
      created_at: at(lead.sentOn, lead.hour),
    })),
  );

  // Demand: one shared pull per region and program each month, through the live path, on the
  // 28th: each city with an institution that has signed up, and its state to fill in. September's
  // big spikes alert the Paid and Client institutions in Guwahati.
  const needed = await neededNow(db);
  let demandItems = 0;
  let spikeCount = 0;
  for (const month of DEMAND_MONTHS) {
    for (const pull of needed) {
      const result = await pullDemand(db, pull, month, pullDayOf(month), { notify: month === DEMAND_MONTHS[DEMAND_MONTHS.length - 1] });
      demandItems += result.items;
      spikeCount += result.spikes.length;
    }
  }

  // Each month from April to August: its Rivals 3 things to do (on the month's last day), then
  // its monthly report for the Paid and Client institutions, made on the 1st of the next month
  // through the live path (September's is made on 1 October).
  const reportPages: Array<{ month: string; pages: number }> = [];
  for (const month of REPORT_MONTHS) {
    const lastDay = new Date(monthEnd(month).getTime() - 15 * 3_600_000);
    for (const tracker of new Set(SAMPLE_RIVALS.map(([slug]) => slug))) {
      actionCount += await writeRivalActions(db, institutionId(tracker), lastDay);
    }
    const reportDay = reportDayOf(month);
    const { due: reportsToMake } = await reportsDue(db, reportDay);
    for (const institution of reportsToMake) {
      try {
        reportPages.push({ month, pages: (await makeReport(db, institution.id, month, reportDay, { notify: true })).pages });
      } catch (error) {
        fail(`Could not make the ${month} report for ${institution.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Older notifications have been read. New: the latest "Audit ready", and the last 10 days of
  // rival moves and demand spikes.
  const { data: notices, error: noticeError } = await db.from('notifications').select('id, institution_id, kind, created_at').order('created_at', { ascending: false });
  if (noticeError) fail(`Could not read notifications: ${noticeError.message}`);
  const newestAudit = new Set<string>();
  const recent = istDate(SAMPLE_TODAY, 0).getTime() - 10 * DAY_MS;
  const older: string[] = [];
  for (const notice of notices ?? []) {
    if (notice.kind === 'audit_ready' && !newestAudit.has(notice.institution_id)) newestAudit.add(notice.institution_id);
    else if ((notice.kind === 'rival_move' || notice.kind === 'demand_spike') && new Date(notice.created_at).getTime() >= recent) continue;
    else older.push(notice.id);
  }
  if (older.length) {
    const { error } = await db.from('notifications').update({ read: true }).in('id', older);
    if (error) fail(`Could not mark older notifications read: ${error.message}`);
  }
  // Summary.
  const programCount = SAMPLE_INSTITUTIONS.reduce((sum, sample) => sum + sample.programs.length, 0);
  const prospects = SAMPLE_INSTITUTIONS.filter((sample) => sample.isProspect).length;
  console.log('\nSample data ready.');
  console.log(`  Institutions ${SAMPLE_INSTITUTIONS.length} (${prospects} prospects, team only), programs ${programCount}, users ${SAMPLE_USERS.length}`);
  console.log(`  Audits ${auditCounts.own} own (${auditCounts.waiting} waiting in To review), ${auditCounts.rival} rival, ${auditCounts.team} team, from ${signalCount} signals`);
  console.log(`  Let AdmitLabs fix this ${SAMPLE_FIX_REQUESTS.length}, Leads ${SAMPLE_LEADS.length} from ${SAMPLE_LEAD_LINKS.length} tracking links`);
  console.log(`  Rival moves ${moveCount}, best posts ${contentCount ?? 0}, ads ${SAMPLE_ADS.length}, Rivals 3 things to do ${actionCount} (April to September)`);
  console.log(`  Demand pulls ${needed.length * DEMAND_MONTHS.length} with ${demandItems} grouped items, ${spikeCount} spike alerts sent`);
  console.log(`  Monthly reports ${reportPages.length}, ${REPORT_MONTHS[0]} to ${REPORT_MONTHS[REPORT_MONTHS.length - 1]} (${reportPages.map((report) => `${report.month} ${report.pages} pages`).join(', ')})`);
  console.log('\nSign in at http://localhost:3000/login with any of these:');
  for (const user of SAMPLE_USERS) {
    const sample = user.institutionSlug ? sampleInstitution(user.institutionSlug) : null;
    const label = sample
      ? `${user.membershipRole === 'owner' ? 'Owner' : 'Member'}, ${sample.name} (${sample.plan ? TIER_LABELS[sample.plan.tier] : 'Free'})`
      : user.teamRole === 'admin'
        ? 'AdmitLabs admin'
        : 'AdmitLabs team';
    console.log(`  ${user.email.padEnd(38)} ${label}`);
  }
  console.log('\nShared Audits open without signing in:');
  for (const share of shares) console.log(`  ${share.url}  ${share.name}, works until ${formatDate(share.expiresAt)}`);
  console.log(`\nSign-in codes arrive in Mailpit: ${process.env.DRISHTI_MAILPIT_URL ?? 'http://127.0.0.1:55324'}\n`);
}

await main();
