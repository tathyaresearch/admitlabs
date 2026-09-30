# Drishti by AdmitLabs

See where you stand, who's ahead, and what students want. Every month.

The product rules live in `DRISHTI_SPEC.md` and `CLAUDE.md`. This file is how to run it.

Everything runs on this machine: a local Supabase in Docker and a local Next.js app. No GitHub, Vercel or Supabase account is used. All data is fictional sample data from mock providers.

## Needs

- Windows, with Docker Desktop running
- Node.js 24 or newer
- Supabase CLI 2.105 or newer (`supabase --version`)

## First run

```
npm install
npm run db:start
npm run db:reset
npm run dev
```

Then open http://localhost:3000.

- `db:start` creates Drishti's own local signing key if it is missing, then starts Drishti's Supabase (project `drishti`, ports 55320 to 55329, so it runs next to other local stacks).
- `db:reset` rebuilds the database from `supabase/migrations`, writes `.env.local` from `supabase status`, and loads the sample data.

## Sign in

Sign in with any sample email. The 6-digit code arrives in Mailpit at http://127.0.0.1:55324, never a real inbox.

| Email | Who |
|---|---|
| owner@northbank-college.example | Owner, Northbank College, Free |
| owner@eastgate-university.example | Owner, Eastgate University, Paid (ends 15 Oct 2026) |
| member@eastgate-university.example | Member, Eastgate University, Paid |
| owner@brightpath-skills.example | Owner, Brightpath Skills Academy, Client |
| owner@silverline-college.example | Owner, Silverline College, Free |
| team@admitlabs.example | AdmitLabs team |
| admin@admitlabs.example | AdmitLabs admin |

Any other email creates a new account and goes to onboarding: the institution's details, then the one program a free Audit covers, then the first Audit runs.

## Try the Audit on each tier

The sample covers Free (Northbank, Silverline), Paid (Eastgate) and Client (Brightpath). To see one institution on every tier, sign up with a new email, then switch its tier here (in the product only an Admin does this):

```
npm run tier -- --institution <slug> --tier paid
npm run tier -- --institution <slug> --tier client
npm run tier -- --institution <slug> --tier free
npm run tier -- --institution <slug> --tier paid --from 2026-03-01
```

A Paid or Client plan that starts today runs its first Audit straight away, covering every program. The last line makes a Paid plan that has already ended, so Free rules apply again. The slug of a new institution comes from its name, for example `new-horizon-college`.

## Audits by hand

Schedules (spec section 11) run through one script, with mock providers:

```
npm run audit -- --due
npm run audit -- --due --date 2026-10-15 --dry-run
npm run audit -- --institution northbank-college
npm run audit -- --institution riverbend-college --kind team
```

- `--due` runs every scheduled Audit due that day: Free every 3 months from signup, Paid and Client monthly on the plan start day. A run missed on its day still happens the next time this runs.
- `--institution` runs one Audit now. An institution's own Audit follows its plan. `--kind team` or `--kind rival` runs a private team or rival Audit instead.
- Paid gets one extra refresh each calendar month (the Refresh button on the Audit page). A second one is refused by the server and by the database.

## Rivals

Each institution tracks 3 to 5 rivals (spec section 8). Owners pick them at `/rivals/choose`: suggestions (same type, shared programs, same city first, then same state; never a team prospect), their current rivals, or one they add by hand (name, type, city, website, Instagram, and which of their own programs the rival also offers). A rival added by hand becomes an unclaimed institution record; if its website is already on record, that record is used as it is.

- **Plan rules, enforced by the database** (`save_rivals`): Free picks once and keeps them. Paid changes once each calendar month, India time. Client changes any time. The first setup never counts as a change, and saving the same list again is not a change.
- **Free** sees ahead or behind for each rival, in words, with no scores (`rival_standings`), and one "Paid shows the full comparison" card with counts. **Paid and Client** see where they stand, the 3 things to do, head to head by pillar (each rival opens to show where each side leads), moves, best content and ads, and each rival's own page with all 17 checks side by side.
- **Rival scores** come only from Drishti's own monthly rival Audit, never from a rival's own account, even when the rival is on Drishti too.
- **Rivals never know**: nothing tells an institution who tracks it, and it never sees rival Audits of itself. The database tests check this.

Rival work runs on a schedule, with mock providers, through one script:

```
npm run rivals -- --due
npm run rivals -- --due --date 2026-10-05 --dry-run
npm run rivals -- --check --institution silverline-college
npm run rivals -- --actions --institution eastgate-university
```

- `--due` runs everything due that day: a rival Audit for every tracked rival without one since the 1st of the month; the weekly check (moves and best content) for every rival not checked this week, with an alert to each Paid and Client institution tracking it for every new move; and the Rivals 3 things to do for every Paid and Client institution without this month's list.
- `--check` runs one weekly check now. `--actions` rebuilds one institution's 3 things to do (they also follow each Paid or Client Audit).
- Rival ads are entered by the team at `/team/ads`.

## Local addresses

| What | Address |
|---|---|
| App | http://localhost:3000 |
| Design system | http://localhost:3000/design-system |
| Supabase Studio | http://127.0.0.1:55323 |
| Mailpit | http://127.0.0.1:55324 |
| Supabase API | http://127.0.0.1:55321 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:55322/postgres |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Runs the app |
| `npm test` | Unit tests (Node's test runner) and the em dash and en dash check |
| `npm run db:test` | Row level security tests (pgTAP) |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Starts or stops Drishti's local Supabase |
| `npm run db:reset` | Rebuilds the database and reloads the sample data |
| `npm run db:types` | Regenerates `src/lib/supabase/database.types.ts` |
| `npm run audit -- ...` | Runs Audits by hand (see above) |
| `npm run tier -- ...` | Switches a local institution's tier (see above) |
| `npm run rivals -- ...` | Runs rival Audits, weekly checks and 3 things to do by hand (see above) |

## Layout

```
supabase/        config, migrations (schema, row level security, owner actions), database tests, email template
scripts/         env, seed, audit, tier, rivals, dash check (TypeScript run directly by Node)
src/app/         routes: (product)/drishti, login, (dashboard), onboarding, team, share, design-system
src/components/  ui, charts, audit and rivals screens, institution inputs and the app shell
src/domain/      pure logic: the scoring engine (domain/scoring), checks, schedules, onboarding checks, dates, tiers
src/config/      every adjustable value: scoring, plans, entitlements, schedules, providers, cities, programs
src/providers/   the provider interface, mock providers, and real provider slots
src/audit/       one Audit end to end (collect, score, save) and what the Audit screens show
src/rivals/      comparisons, verdicts, change rules, the 3 things to do, and the rival jobs
src/sample/      the fictional sample world
```

`src/domain`, `src/config`, `src/providers`, `src/audit`, `src/rivals` and `src/sample` never import Next.js, so Node runs their tests directly.

## How scores work

The scoring engine is in `src/domain/scoring`: pure functions, no database. Facts from the providers become Strong, Okay, Weak or Missing (spec 7.5), then pillar, program and overall scores (spec 7.4), rounded to whole numbers with halves rounding up. Every number comes from the active row in `scoring_config` (version 1 is `src/config/scoring.v1.ts`), and each Audit records the version it used.
