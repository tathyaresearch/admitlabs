// Seeds Drishti's local database with the fictional sample world (spec section 20).
// Runs as part of `npm run db:reset`, which rebuilds the database first. Signals, rival moves,
// rival content and Demand items come from the mock providers through the same pipeline a
// real run would use. Audit scores are written by the scoring engine in Phase 2.

import { createClient } from '@supabase/supabase-js';
import { SCORING_V1 } from '../src/config/scoring.v1.ts';
import { istDate, monthKey, monthStart } from '../src/domain/dates.ts';
import { paidPlanEndsAt } from '../src/domain/tiers.ts';
import { CHECK_KEYS, TIER_LABELS, type CheckKey } from '../src/domain/types.ts';
import type { Database, Json } from '../src/lib/supabase/database.types.ts';
import { collect } from '../src/providers/collect.ts';
import { getAnalysisProvider, getProvider } from '../src/providers/registry.ts';
import type { AnySignal, Signal } from '../src/providers/types.ts';
import {
  ADMIN_EMAIL,
  DEMAND_MONTHS,
  DEMAND_REGIONS,
  SAMPLE_ADS,
  SAMPLE_CITIES,
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
  toInstitutionRef,
  toProgramRefs,
} from '../src/sample/index.ts';
import { assertDrishtiLocal, fail } from './lib/local.ts';

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Insert'];

const DAY_MS = 86_400_000;

const url = assertDrishtiLocal(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail('SUPABASE_SERVICE_ROLE_KEY is not set. Run `npm run env:local`.');
const db = createClient<Database>(url.origin, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
const at = (ymd: string, hour = 10) => istDate(ymd, hour).toISOString();
const CHECK_KEY_SET: ReadonlySet<string> = new Set(CHECK_KEYS);
type CheckSignal = Extract<AnySignal, { key: CheckKey }>;
const isCheckSignal = (signal: AnySignal): signal is CheckSignal => CHECK_KEY_SET.has(signal.key);

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

  await insert('cities', SAMPLE_CITIES.map((city) => ({ name: city.name, state: city.state })));
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

  // Audit signals on each institution's run dates (own Audits, rival runs and team Audits).
  const signalRows: Row<'signals'>[] = [];
  let runs = 0;
  for (const sample of SAMPLE_INSTITUTIONS) {
    const institution = toInstitutionRef(sample);
    for (const day of SAMPLE_RUNS[sample.slug] ?? []) {
      const asOf = istDate(day, 10);
      runs += 1;
      const found = [
        ...(await collect({ kind: 'institution', institution }, asOf)),
        ...(await Promise.all(toProgramRefs(sample).map((program) => collect({ kind: 'program', institution, program }, asOf)))).flat(),
      ];
      for (const signal of found) {
        if (!isCheckSignal(signal) || !signal.institutionId) continue;
        signalRows.push({
          institution_id: signal.institutionId,
          program_id: signal.programId,
          provider: signal.provider,
          check_key: signal.key,
          value: json(signal.value),
          source_url: signal.sourceUrl,
          fetched_at: signal.fetchedAt,
        });
      }
    }
  }
  await insert('signals', signalRows);

  // Rival moves, found by weekly site checks from 1 August to today.
  const tracked = [...new Set(SAMPLE_RIVALS.map(([, rival]) => rival))];
  const crawler = getProvider('site_crawler');
  const moves = new Map<string, Row<'rival_moves'>>();
  for (const slug of tracked) {
    const institution = toInstitutionRef(sampleInstitution(slug));
    for (let day = istDate('2026-08-01', 9); day.getTime() <= istDate(SAMPLE_TODAY, 9).getTime(); day = new Date(day.getTime() + 7 * DAY_MS)) {
      for (const signal of await crawler.collect({ kind: 'institution', institution }, day)) {
        if (signal.key !== 'rival_move') continue;
        moves.set(`${slug}|${signal.value.description}`, {
          rival_institution_id: institution.id,
          kind: signal.value.kind,
          description: signal.value.description,
          source_url: signal.sourceUrl,
          detected_at: signal.value.detectedAt,
        });
      }
    }
  }
  await insert('rival_moves', [...moves.values()]);

  // Each tracked rival's best content this month, with why it worked.
  const analysis = getAnalysisProvider();
  const contentRows: Row<'rival_content'>[] = [];
  for (const slug of tracked) {
    const institution = toInstitutionRef(sampleInstitution(slug));
    for (const key of ['instagram', 'youtube'] as const) {
      for (const signal of await getProvider(key).collect({ kind: 'institution', institution }, istDate(SAMPLE_TODAY, 20))) {
        if (signal.key !== 'rival_content') continue;
        const { platform, url: postUrl, title, metrics, postedAt } = signal.value;
        contentRows.push({
          rival_institution_id: institution.id,
          platform,
          url: postUrl,
          title,
          metrics: json(metrics),
          why_it_worked: await analysis.whyItWorked({ institutionSlug: slug, platform, title, metrics }),
          month: monthStart(monthKey(new Date(postedAt))),
          posted_at: postedAt,
        });
      }
    }
  }
  await insert('rival_content', contentRows);

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
  console.log(`  Signals ${signalRows.length} from ${runs} runs. Rival moves ${moves.size}, best content ${contentRows.length}, ads ${SAMPLE_ADS.length}`);
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
