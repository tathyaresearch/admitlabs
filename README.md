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

The sample covers Free (Northbank, Silverline), Paid (Eastgate) and Client (Brightpath). To see one institution on every tier, sign up with a new email, then switch its tier here (in the product an Admin does this on the institution's page in the team area):

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
- **Free** sees ahead or behind for each rival, in words, with no scores (`rival_standings`), and one "Paid shows the full comparison" card with counts. **Paid and Client** see their rank and one table of overall and pillar scores with the change, what to learn from their rivals, and moves, best content and ads in tabs. Each rival's own page shows both scores, what to learn from that rival, and the checks side by side: where they lead, where you lead, and all 17.
- **Rival scores** come only from Drishti's own monthly rival Audit, never from a rival's own account, even when the rival is on Drishti too.
- **Rivals never know**: nothing tells an institution who tracks it, and it never sees rival Audits of itself. The database tests check this.

Rival work runs on a schedule, with mock providers, through one script:

```
npm run rivals -- --due
npm run rivals -- --due --date 2026-10-05 --dry-run
npm run rivals -- --check --institution silverline-college
npm run rivals -- --actions --institution eastgate-university
```

- `--due` runs everything due that day: a rival Audit for every tracked rival without one since the 1st of the month; the weekly check (moves and best content) for every rival not checked this week, with an alert to each Paid and Client institution tracking it for every new move; and what to learn from rivals for every Paid and Client institution without this month's list.
- `--check` runs one weekly check now. `--actions` rebuilds one institution's list of what to learn from its rivals (it also follows each Paid or Client Audit).
- Rival ads are entered by the team under Manual entry, at `/team/ads`.

## Demand

What students search, ask and worry about (spec section 9), grouped: a topic, a count and a source, never a person. Demand is pulled once per region (city, state, All India) and program, and shared by every institution that needs it.

- **Paid and Client** see their city, state or All India (the switch at the top), for all their programs or one: the fastest rising course or career, what students worry about most, the season clock, 5 content ideas built on real questions, the top questions, the worries (the usual five plus anything new), what is rising and falling, and what students say about them and the rivals they track (from each one's state).
- **Free** sees one rising trend, for its Free program in its city (`demand_highlight`), and one "Paid shows everything students are asking" card with counts (`demand_teaser`). Home shows the same highlight on every plan.
- **Plan rules, enforced by the database:** Paid and Client read only their own regions and programs. Mentions come only through `demand_mentions`, only about the institution and its tracked rivals.
- Hindi and Assamese items show in English with a language tag; the original wording stays in the data.
- Programs added under Other have no shared key, so Demand does not cover them yet.

Pulls run monthly on the 28th, with mock providers, through one script:

```
npm run demand -- --due
npm run demand -- --due --date 2026-10-28 --dry-run
npm run demand -- --first --institution <slug>
```

- `--due` runs every pull due that day: each region and program an institution that has signed up needs, for the month (this month from the 28th, last month before it). A course or career rising 40% or more in a city (`DEMAND_RULES` in `src/config/demand.ts`) alerts every Paid and Client institution there that offers the program.
- A new signup, or a program added in Settings, gets any region and program nobody needed before straight away, without alerts. `--first` does the same by hand.

## Monthly report

One PDF a month (spec section 12), readable in 5 minutes: 7 pages, never more than 8. A black cover, then ivory pages in the dashboard's style, set in Bricolage Grotesque with numbers in Inter (both embedded from `src/report/fonts`, with their licences): your score and what's working, what to fix (the top 5 in detail, the rest ranked), program by program, you and your rivals with the month's key moves, what students in your city want, the 3 things to do this month, and the sources and dates checked. On Paid only, the last page ends with one quiet line: "Want AdmitLabs to do this for you? hello@admitlabs.in".

- **Who gets one:** Paid and Client, made on the 1st for the month just ended, from what was known at the end of that month. Making a month again replaces it. After a Paid plan ends, past reports stay downloadable; no new ones are made.
- **Where it lives:** a private storage bucket (`reports`). `/reports` lists them; a download asks for a link that works for one minute, as the signed-in person, so the database checks membership every time. Free sees one "Paid gets a monthly report" card, with a link to the sample report.
- **3 things to do this month:** the biggest Audit fix, the top Rivals lesson on another check, and the top content idea from Demand (`src/report/things.ts`). The same list shows on Home for Paid and Client.
- **The page cap:** every list has a limit and every long sentence a line limit. A report that would still pass 8 pages is made again in its compact form (3 fixes in detail instead of 5).
- A new report adds "Your September report is ready." to Notifications.

```
npm run report -- --due
npm run report -- --due --date 2026-10-01 --dry-run
npm run report -- --institution eastgate-university --month 2026-09
npm run report -- --institution eastgate-university --month 2026-08 --preview --out report.pdf
```

- `--due` makes every report due that day. `--institution` makes (or makes again) one month's report; `--out` also saves a copy, and `--preview` only renders it (nothing stored or recorded).
- The sample data includes the August 2026 report for Eastgate University (Paid) and Brightpath Skills Academy (Client), made on 1 September.

## Team tools

The AdmitLabs team area at `/team` (spec section 13), for `team@admitlabs.example` and `admin@admitlabs.example`. To everyone else it does not exist.

- **Institutions** (`/team`): everyone in Drishti, 50 a page. Search by name or website; filter by status (signed up, prospect, rival record), plan and score, with type, state and city under More filters; sort by name, score or last check. The four counts at the top filter the list; the one that is on turns it off again.
- **Bulk Audit** (`/team/bulk`): paste a list or choose a CSV file, up to 100 rows a run. One institution per line: `name, website, city, type, programs, instagram`, with programs separated by semicolons and Instagram optional. A header row can put the columns in any order and add a `state` column. Every row is checked first: Ready, Needs fixing, or skipped because the institution has signed up. A website already on record reuses that record. Each ready row becomes a prospect with a private team Audit, with a progress bar and the results. Past runs stay under Earlier runs. "Try a sample list" loads 5 fictional institutions.
- **Institution page** (`/team/institutions/<id>`): the latest score and pillars; the plan, with an Admin's plan controls (or, before they sign up, sharing the Audit); what to fix first for a prospect; then Audits, Programs, People, Notes (team only) and Share links in tabs. **Run a team Audit** runs a private team Audit; for a Client, **Refresh their Audit** runs their own Audit, which they see. **Open their dashboard** shows a signed-up institution's dashboard exactly as they see it, read only, under a bar that says so.
- **Plans** (Admin only, on the institution page): start Paid from the day of payment (today, or up to 6 months back; always 6 months), make them a Client, or end the plan now. The first Audit of a new plan runs straight away. The database refuses these for anyone but an Admin (`set_plan`, `end_plan`).
- **Sharing** (prospects and rival records only): **Create a link** makes a private link to the latest team Audit. It works for 90 days unless the team stops it sooner. It opens without signing in, at `/share/<token>`, and is never indexed: the score and pillars, the top 3 fixes with how to fix them, then "Want AdmitLabs to fix this for you? hello@admitlabs.in" and "Get your free Audit". Below, folded: what's working, the rest of the fixes under one line saying "AdmitLabs can fix any of these.", and every check with its result, what was found, the source and the date. How to fix is sent for the top 3 fixes only. **Download PDF** gives the same content as a PDF, on the team page and on the shared page. An expired or stopped link says so and offers the free Audit. A link keeps working after the prospect signs up; their team Audits and notes stay invisible to them.
- **Manual entry** (`/team/ads`): rival ads, entered by hand until a provider can collect them.
- **Team users** (`/team/users`): an Admin adds someone by email as Team or Admin (someone who has signed in before joins at once, anyone else at first sign in), changes roles and removes people. There is always at least one Admin.
- **On a phone**, the four team pages sit in the bottom bar.

The limits (90 days, top 3 fixes, 100 rows a run, 50 a page, Paid ending within 30 days) are `TEAM_RULES` in `src/config/team.ts`. The sample data includes a live shared Audit for Cedar Skill Institute; `npm run db:reset` prints its link.

## Product page

`/drishti` (spec section 15) is the landing page, later served at admitlabs.in/drishti. Open http://localhost:3000/drishti; no sign in, and it works with the database stopped.

- **Fixed black and ivory.** The page sets its own sections, so it looks the same whatever the device setting: black, with ivory for the problem, the score and the final call.
- **Real previews, fictional data.** Each preview is the dashboard's own component, filled with Eastgate University in August 2026, worked out in memory from the sample world with the real scoring engine (`src/sample/world.ts`). Every preview says "Sample institution. Fictional data." The page is prerendered at build and never reads the database.
- **Buttons.** "Get your free Audit" and "Start with a free Audit" go to `/login`, then onboarding. For now the AdmitLabs team switches Paid on.
- **Sample report.** `/drishti/sample-report.pdf` is the report the monthly job would make for the same institution and month, marked "Sample report. Fictional data." on the cover and every page. Made once at build.
- **Words and numbers.** The copy is in `src/product/content.ts`. Every number in it (prices, plan length, reminders, schedules, the 17 checks, 3 to 5 rivals) comes from config, and a test checks it.
- **Sharing.** `opengraph-image.tsx` draws the link preview (1200 by 630) with the report's Bricolage font files.

## Local addresses

| What | Address |
|---|---|
| App | http://localhost:3000 |
| Product page | http://localhost:3000/drishti |
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
| `npm run rivals -- ...` | Runs rival Audits, weekly checks and what to learn from rivals by hand (see above) |
| `npm run demand -- ...` | Runs the monthly Demand pulls by hand (see above) |
| `npm run report -- ...` | Makes monthly reports by hand (see above) |

## Layout

```
supabase/        config, migrations (schema, row level security, owner actions), database tests, email template
scripts/         env, seed, audit, tier, rivals, demand, report, dash check (TypeScript run directly by Node)
src/app/         routes: (product)/drishti, login, (dashboard), onboarding, team, share, design-system
src/components/  ui, charts, audit, rivals, demand, report, team and share screens, institution inputs and the app shell
src/domain/      pure logic: the scoring engine (domain/scoring), checks, schedules, onboarding checks, dates, tiers
src/config/      every adjustable value: scoring, plans, entitlements, schedules, providers, cities, programs
src/providers/   the provider interface, mock providers, and real provider slots
src/audit/       one Audit end to end (collect, score, save) and what the Audit screens show
src/rivals/      comparisons, verdicts, change rules, what to learn from rivals, and the rival jobs
src/demand/      regions, the pull schedule, ranking and spikes, the season clock, the page view, and the pulls
src/report/      the monthly report (its schedule, the 3 things to do, the snapshot, the PDF, the job) and the shared Audit PDF
src/team/        team tools: the bulk list reader, list filters, plan rules and the shared Audit
src/product/     the product page: its words (numbers from config) and its preview data
src/sample/      the fictional sample world, and that world worked out in memory (world.ts, report.ts)
```

`src/domain`, `src/config`, `src/providers`, `src/audit`, `src/rivals`, `src/demand`, `src/report`, `src/team`, `src/product` and `src/sample` never import Next.js, so Node runs their tests directly. The PDF library only ever loads on the server: in the report job, for shared Audit PDFs and for the sample report (`serverExternalPackages` in `next.config.ts`). Never in the browser.

## How scores work

The scoring engine is in `src/domain/scoring`: pure functions, no database. Facts from the providers become Strong, Okay, Weak or Missing (spec 7.5), then pillar, program and overall scores (spec 7.4), rounded to whole numbers with halves rounding up. Every number comes from the active row in `scoring_config` (version 1 is `src/config/scoring.v1.ts`), and each Audit records the version it used.

## Before launch

Must do before any real institution uses Drishti:

1. **Proof of ownership when claiming an institution.** Signing up with a website already on record (a tracked rival or a team prospect) claims that record. Nothing private leaks today, but anyone who enters the website takes over the record. Options to weigh: a code sent to an email on the institution's own domain, or team approval of each claim.
2. **Privacy policy and terms pages, reviewed by a lawyer.** The product page explains privacy in plain words in its FAQ, but there are no policy or terms pages yet.
