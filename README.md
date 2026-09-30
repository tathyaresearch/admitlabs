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

Any other email creates a new account and goes to onboarding.

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
| `npm run collect -- --institution <slug or all> --month 2026-09` | Runs the providers by hand and stores signals |

## Layout

```
supabase/        config, migrations (schema and RLS), RLS tests, email template
scripts/         env, seed, collect, dash check (TypeScript run directly by Node)
src/app/         routes: (product)/drishti, login, (dashboard), onboarding, team, share, design-system
src/components/  ui, charts and the app shell
src/domain/      pure logic: types, checks, dates, tiers, formatting
src/config/      every adjustable value: scoring, plans, entitlements, schedules, providers
src/providers/   the provider interface, mock providers, and real provider slots
src/sample/      the fictional sample world
```

`src/domain`, `src/config`, `src/providers` and `src/sample` never import Next.js, so Node runs their tests directly.
