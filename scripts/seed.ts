// Seeds Drishti's local database with the fictional sample world (spec section 20).
// Runs as part of `npm run db:reset`, which rebuilds the database first. Every sample Audit
// runs through the same path as a live one (mock providers, then the scoring engine, then
// record_audit). Rival moves, rival content and Demand items come from the mock providers too.

import { INDIA_CITIES } from '../src/config/cities.ts';
import { SCORING_V1 } from '../src/config/scoring.v1.ts';
import { runAudit } from '../src/audit/run.ts';
import { istDate, monthStart } from '../src/domain/dates.ts';
import { paidPlanEndsAt } from '../src/domain/tiers.ts';
import { TIER_LABELS } from '../src/domain/types.ts';
import type { Database, Json } from '../src/lib/supabase/database.types.ts';
import { collect } from '../src/providers/collect.ts';
import { getAnalysisProvider } from '../src/providers/registry.ts';
import type { Signal } from '../src/providers/types.ts';
import { checkRival, writeRivalActions } from '../src/rivals/jobs.ts';
import {
  ADMIN_EMAIL,
  DEMAND_MONTHS,
  DEMAND_REGIONS,
  SAMPLE_ADS,
  SAMPLE_INSTITUTIONS,
  SAMPLE_NOTES,
  SAMPLE_PROGRAM_KEYS,
  SAMPLE_RIVALS,
  SAMPLE_RUNS,
  SAMPLE_TODAY,
  SAMPLE_USERS,
  TEAM_EMAIL,
  institutionId,
  programId,
  sampleId,
  sampleInstitution,
} from '../src/sample/index.ts';
import { serviceClient } from './lib/db.ts';
import { fail } from './lib/local.ts';

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Insert'];

const DAY_MS = 86_400_000;

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

/** Rank grouped Demand items within their kind: biggest rise, biggest fall, most asked. */
function rankDemand(signals: Signal<'demand_item'>[]): Map<Signal<'demand_item'>, number | null> {
  const ranks = new Map<Signal<'demand_item'>, number | null>();
  const order: Record<string, (a: Signal<'demand_item'>, b: Signal<'demand_item'>) => number> = {
    rising: (a, b) => (b.value.changePct ?? 0) - (a.value.changePct ?? 0),
    falling: (a, b) => (a.value.changePct ?? 0) - (b.value.changePct ?? 0),
    question: (a, b) => b.value.count - a.value.count,
    worry: (a, b) => b.value.count - a.value.count,
  };
  for (const signal of signals) ranks.set(signal, null);
  for (const [kind, compare] of Object.entries(order)) {
    signals
      .filter((signal) => signal.value.kind === kind)
      .sort(compare)
      .forEach((signal, index) => ranks.set(signal, index + 1));
  }
  return ranks;
}

async function main(): Promise<void> {
  const { count, error } = await db.from('institutions').select('id', { count: 'exact', head: true });
  if (error) fail(`Could not reach Drishti's local database: ${error.message}`);
  if (count) fail('The database already has data. Run `npm run db:reset` to rebuild it with sample data.');

  const users = await createUsers();
  const userId = (email: string | null) => (email ? (users.get(email) ?? null) : null);
  const requireUser = (email: string) => users.get(email) ?? fail(`Sample user ${email} was not created.`);

  await insert('cities', INDIA_CITIES.map((city) => ({ name: city.name, state: city.state })));
  await insert('scoring_config', [
    {
      version: SCORING_V1.version,
      weights: json(SCORING_V1.weights),
      result_shares: json(SCORING_V1.resultShares),
      thresholds: json(SCORING_V1.thresholds),
      labels: json(SCORING_V1.labels),
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
  await insert(
    'memberships',
    SAMPLE_USERS.flatMap((user) =>
      user.institutionSlug && user.membershipRole
        ? [{ user_id: requireUser(user.email), institution_id: institutionId(user.institutionSlug), role: user.membershipRole }]
        : [],
    ),
  );
  await insert(
    'team_users',
    SAMPLE_USERS.flatMap((user) => (user.teamRole ? [{ user_id: requireUser(user.email), role: user.teamRole }] : [])),
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

  // Audits: every sample run, own, rival and team, through the live path (collect, score, save).
  const auditCounts = { own: 0, rival: 0, team: 0 };
  let signalCount = 0;
  for (const sample of SAMPLE_INSTITUTIONS) {
    for (const run of SAMPLE_RUNS[sample.slug] ?? []) {
      const result = await runAudit(db, {
        institutionId: institutionId(sample.slug),
        asOf: istDate(run.day, 10),
        trigger: run.trigger,
        kind: run.kind === 'own' ? undefined : run.kind,
        createdBy: run.kind === 'team' ? requireUser(TEAM_EMAIL) : null,
      });
      auditCounts[run.kind] += 1;
      signalCount += result.signals;
    }
  }

  // The weekly rival check, every Monday from August to today, through the live path: new moves
  // (with alerts for Paid and Client trackers) and each month's best content.
  const tracked = [...new Set(SAMPLE_RIVALS.map(([, rival]) => rival))];
  let moveCount = 0;
  for (let day = istDate('2026-08-03', 9); day.getTime() <= istDate(SAMPLE_TODAY, 9).getTime(); day = new Date(day.getTime() + 7 * DAY_MS)) {
    for (const slug of tracked) moveCount += (await checkRival(db, institutionId(slug), day, { notify: true })).newMoves;
  }

  // This month's Rivals 3 things to do, for the Paid and Client institutions.
  let actionCount = 0;
  for (const tracker of new Set(SAMPLE_RIVALS.map(([slug]) => slug))) {
    actionCount += await writeRivalActions(db, institutionId(tracker), istDate(SAMPLE_TODAY, 9));
  }

  // Older notifications have been read. New: the latest "Audit ready" and the last 10 days of rival moves.
  const { data: notices, error: noticeError } = await db.from('notifications').select('id, institution_id, kind, created_at').order('created_at', { ascending: false });
  if (noticeError) fail(`Could not read notifications: ${noticeError.message}`);
  const newestAudit = new Set<string>();
  const recent = istDate(SAMPLE_TODAY, 0).getTime() - 10 * DAY_MS;
  const older: string[] = [];
  for (const notice of notices ?? []) {
    if (notice.kind === 'audit_ready' && !newestAudit.has(notice.institution_id)) newestAudit.add(notice.institution_id);
    else if (notice.kind === 'rival_move' && new Date(notice.created_at).getTime() >= recent) continue;
    else older.push(notice.id);
  }
  if (older.length) {
    const { error } = await db.from('notifications').update({ read: true }).in('id', older);
    if (error) fail(`Could not mark older notifications read: ${error.message}`);
  }

  const analysis = getAnalysisProvider();
  const { count: contentCount } = await db.from('rival_content').select('id', { count: 'exact', head: true });

  await insert(
    'rival_ads',
    SAMPLE_ADS.map((ad, index) => ({
      rival_institution_id: institutionId(ad.slug),
      promise: ad.promise,
      source_url: `https://ads.example/library/${ad.slug}/${index + 1}`,
      entered_by: requireUser(TEAM_EMAIL),
      entered_at: at(ad.enteredAt, 16),
    })),
  );

  await insert(
    'notes',
    SAMPLE_NOTES.map((note) => ({
      institution_id: institutionId(note.slug),
      author_id: requireUser(note.author === 'admin' ? ADMIN_EMAIL : TEAM_EMAIL),
      body: note.body,
      created_at: at(note.createdAt, 15),
    })),
  );

  // Demand: one shared pull per region, program and month.
  const pullRows: Row<'demand_pulls'>[] = [];
  const itemRows: Row<'demand_items'>[] = [];
  for (const month of DEMAND_MONTHS) {
    const asOf = istDate(`${month}-28`, 6);
    for (const { scope, region } of DEMAND_REGIONS) {
      for (const programKey of SAMPLE_PROGRAM_KEYS) {
        const pullId = sampleId('demand-pull', scope, region, programKey, month);
        pullRows.push({ id: pullId, scope, region, program_key: programKey, month: monthStart(month), pulled_at: asOf.toISOString() });

        const found = (await collect({ kind: 'region', scope, region, programKey }, asOf)).filter(
          (signal): signal is Signal<'demand_item'> => signal.key === 'demand_item',
        );
        const ranks = rankDemand(found);
        for (const signal of found) {
          const value = signal.value;
          itemRows.push({
            pull_id: pullId,
            kind: value.kind,
            text: value.text,
            original_text: value.originalText,
            language: value.language,
            count: value.count,
            change_pct: value.changePct,
            rank: ranks.get(signal) ?? null,
            institution_id: value.about ? institutionId(value.about.slug) : null,
            sentiment: value.sentiment,
            source_url: signal.sourceUrl,
            found_at: signal.fetchedAt,
            meta: json(value.meta),
          });
        }

        const questions = found
          .filter((signal) => signal.value.kind === 'question')
          .map((signal) => ({
            text: signal.value.text,
            sourceUrl: signal.sourceUrl,
            questionIndex: typeof signal.value.meta.questionIndex === 'number' ? signal.value.meta.questionIndex : null,
          }));
        const ideas = await analysis.contentIdeas({ programKey, questions });
        ideas.forEach((idea, index) => {
          itemRows.push({
            pull_id: pullId,
            kind: 'idea',
            text: idea.text,
            language: 'en',
            count: 0,
            rank: index + 1,
            source_url: idea.sourceUrl,
            found_at: asOf.toISOString(),
            meta: json({ basedOn: idea.basedOn }),
          });
        });
      }
    }
  }
  await insert('demand_pulls', pullRows);
  await insert('demand_items', itemRows);

  // Summary.
  const programCount = SAMPLE_INSTITUTIONS.reduce((sum, sample) => sum + sample.programs.length, 0);
  const prospects = SAMPLE_INSTITUTIONS.filter((sample) => sample.isProspect).length;
  console.log('\nSample data ready.');
  console.log(`  Institutions ${SAMPLE_INSTITUTIONS.length} (${prospects} prospects, team only), programs ${programCount}, users ${SAMPLE_USERS.length}`);
  console.log(`  Audits ${auditCounts.own} own, ${auditCounts.rival} rival, ${auditCounts.team} team, from ${signalCount} signals`);
  console.log(`  Rival moves ${moveCount}, best posts ${contentCount ?? 0}, ads ${SAMPLE_ADS.length}, Rivals 3 things to do ${actionCount}`);
  console.log(`  Demand pulls ${pullRows.length} with ${itemRows.length} grouped items`);
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
  console.log(`\nSign-in codes arrive in Mailpit: ${process.env.DRISHTI_MAILPIT_URL ?? 'http://127.0.0.1:55324'}\n`);
}

await main();
