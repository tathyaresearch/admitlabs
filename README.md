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

Then open http://localhost:3000 for the dashboard, or http://admitlabs.localhost:3000 for the website.

- `db:start` creates Drishti's own local signing key if it is missing, then starts Drishti's Supabase (project `drishti`, ports 55320 to 55329, so it runs next to other local stacks).
- `db:reset` rebuilds the database from `supabase/migrations`, writes `.env.local` from `supabase status`, and loads the sample data.

## Sign up and log in

Two doors, one email code underneath (`src/lib/auth/email-code.ts`): http://localhost:3000/signup and http://localhost:3000/login. The 6-digit code arrives in Mailpit at http://127.0.0.1:55324, never a real inbox.

- **Sign up** (`/signup`, where every "Get your free Audit" leads): "Create your Drishti account". A new email gets an account and goes to onboarding; an email that already has one is simply signed in. Its left side is Drishti's Home for the sample university in the dark, under a soft light that follows the cursor; where the light falls, the score counts up and the bars grow (`SpotlightStage.tsx`).
- **Log in** (`/login`, where Sign in leads and where signed-out visitors are sent): "Welcome back". It never says whether an email has an account: for any email it shows the same code step, "If this email has a Drishti account, we’ve sent a code. New here? Sign up.", and answers in about the same time (at least 1.2 seconds). It sends a code only to an account, or to someone with a pending invite (an owner's Member or the AdmitLabs team), who comes in like any account (`src/lib/auth/invites.ts`); it never creates an account for anyone else. Its Sign up link carries the email to sign up in the same tab, never in the address. Its left side is the Drishti eye, big, among four cards of the sample's dashboard: the eye follows the cursor, the cards lean with it and change in turn, the eye watches each as it changes, and it reads along the field while someone types (`WatchStage.tsx`).
- **Both.** The form first in reading order; on a phone the left side is a small band above it and plays on its own, as on any touch screen; with reduced motion it is still. The left side alone may use the Spotlight style, black with soft light and grain (`stage.module.css`, the one dashboard stylesheet the gradient test allows); the form keeps the dashboard's tokens. Everything is in `src/components/auth`, the words in `content.ts`.

Log in with any sample email:

| Email | Who |
|---|---|
| owner@northbank-college.example | Owner, Northbank College, Free |
| owner@eastgate-university.example | Owner, Eastgate University, Paid (ends 15 Oct 2026) |
| member@eastgate-university.example | Member, Eastgate University, Paid |
| owner@brightpath-skills.example | Owner, Brightpath Skills Academy, Client |
| owner@silverline-college.example | Owner, Silverline College, Free |
| team@admitlabs.example | AdmitLabs team |
| admin@admitlabs.example | AdmitLabs admin |

Any other email signs up at `/signup` and goes to onboarding: the institution's details, then the one program a free Audit covers with what happens next, then the first Audit runs and Home opens with Start here. Onboarding shows the Drishti logo, with its eye, at the top.

## Home

Home answers "How are we doing this month?" with what to do first (`src/app/(dashboard)/page.tsx`, `src/components/home`):

- The one-line answer, then **Start here** on a first visit: your score, your first fix and your rivals, each ticked when done, until the person closes it ("Got it, hide this", saved per person in `memberships.guide_closed_at`). Northbank's and Silverline's owners still see it in the sample.
- **Do these 3 things this month** (Paid and Client: one from the Audit, one from rivals, one from what students ask) or **Fix these first** (Free: the top 3 fixes), ordered by the points each could add. Each says where it comes from, the check (a small label), the programs, the points (or how often students asked, for a content idea, with its format: post, reel, video, FAQ or web page) and the effort: Quick, Medium or Big.
- **Mark as done** (owner only, `mark_done` and `undo_done`): a fix waits for the next own Audit, which checks it (`record_audit` links the mark to that Audit; `src/audit/marks.ts` reads what it found). Any other thing is kept with its month. In the sample, Northbank marked two fixes done in August: its September Audit confirmed one (Easy enquiry, Weak to Okay, 2 points added) and did not find the other yet (its BBA fees). Eastgate's placement results are marked done and waiting.
- **What changed** since the last Audit (`/#changed`, where "See what changed" lands): the score, each check that moved with its result before and after, the fixes marked done that the Audit checked, and for Paid and Client the rivals' moves and the big jumps in searches.
- Then the score (the gauge, the band, "Up 14 since April", how far the next band is, and the three parts as split bars with what to fix first), the rival snapshot and the demand highlight. The score month by month and every check by name are on the Audit.

On the Audit, each check is either to fix or working (Strong everywhere), so the two tab counts add up to all checks. A score from 0 to 39 is labelled Getting started.

## The Audit's checks

- Every fix has one name everywhere: what to do (`checkAction` in `src/domain/checks.ts`), with the check as a small label and the effort in plain words: Quick, Medium or Big.
- A check opens in its panel (`src/components/audit/CheckPanel.tsx`): the fix it is about, with the points it could add, the effort and the programs; then 1. what we found, program by program, with the source and the date; 2. why it matters to a student; 3. how to fix it, in numbered steps; what was added in Settings; and Mark as done for the owner.
- How to fix is written as short steps by the analysis provider (`src/providers/mock/fix-advice.ts`) and stored in `audit_check_details.fix_steps`; `how_to_fix` keeps the same steps as one paragraph for the PDFs, a shared Audit and Home.
- Plain words: "What do these mean?" under the parts explains the parts, the results and the bands; a result reads "18 of 30 points"; a check whose programs differ shows its weakest program; Demand says when it was updated and names its sources; a rival's page says when their admissions open.
- Progress (Paid and Client): a table of each month's score and its three parts, the change since the month before, the place among your rivals that month, and the checks that moved (`src/audit/progress.ts`). Each month is compared with the month before directly, so an extra refresh in between never hides a move. Every Audit stays folded below.

## Settings, asking for Paid, alerts

- Settings is in plain groups, each at its own address: Institution (with the optional Google Maps listing, which the Audit's Google checks then read), Programs, Rivals, Team, Plan and Notifications.
- "Ask for Paid" (Free) and "Ask to continue Paid" (from the first renewal reminder) replace every Paid link: one click sends the request to the team's Enquiries (`ask_for_paid`, owner only, one open request per kind). Price and terms are unchanged and nothing is paid online.
- Notifications has filters by what each alert is about, and each link says where it goes.
- The team's list opens with who needs attention, most urgent first, each row saying why (`src/team/attention.ts` and the `team_institutions` view).
- The sample has Eastgate's and Brightpath's monthly reports from April to August.

## Your AdmitLabs team (Clients)

- A Client's Home has "Your AdmitLabs team": what the team did this month (or its latest work), what it does next, when the Audit last checked, and how to write to the team. "See all work" opens `/work`, the whole log by month.
- The team keeps the log on the institution's page, in the Work log tab: Done or Next, one plain sentence, the day, and a link when there is one. Next can be marked as done.
- The `team_work` table: the team writes, the Client's own people read while the service is active, and no other plan sees it (`supabase/tests/team_work.test.sql`). The rules for what can be saved are in `src/team/work.ts`.
- The sample Client, Brightpath, has a log from August with two things next.

## Empty states

Anything that can be empty says why, what to do, and when it fills: no rival suggestions yet (where suggestions come from, and how to add rivals), no alerts yet (what arrives in Notifications and when, `src/domain/alerts.ts`), Demand before its first update, a new prospect on the team side (run a team Audit, see what to fix, share it), no enquiries yet, no notes or share links. Tabs open on the first one with something in it.

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
- **Free** sees ahead or behind for each rival, in words, with no scores (`rival_standings`), and one "Paid shows the full comparison" card with counts. **Paid and Client** see their rank and one table of overall and pillar scores with the change; part by part (each part of the score ranked: real names, scores and thin bars, their row highlighted, and one line about the gap) and month by month (the overall score of each over the last 6 months, as a table of numbers); what to learn from their rivals; and moves, best content and ads in tabs. Check by check puts you and every rival side by side on all 17 checks, with who leads (`src/rivals/across.ts`, from each rival's own comparison, so it always agrees with that rival's page); each check opens what was found for every side, with the source and date, and what to learn from the one ahead, never to copy. Each rival's own page shows both scores, their Google rating, the two side by side part by part and month by month, what to learn from that rival, and the checks side by side: where they lead (only when they do), where you lead, and all 17.
- **Rival scores** come only from Drishti's own monthly rival Audit, never from a rival's own account, even when the rival is on Drishti too.
- **Rivals never know**: nothing tells an institution who tracks it, and it never sees rival Audits of itself. The database tests check this.
- The sample has rival Audits from April to September 2026, from the day each record was first tracked.

Rival work runs on a schedule, with mock providers, through one script:

```
npm run rivals -- --due
npm run rivals -- --due --date 2026-10-05 --dry-run
npm run rivals -- --check --institution silverline-college
npm run rivals -- --actions --institution eastgate-university
```

- `--due` runs everything due that day: a rival Audit for every tracked rival without one since the 1st of the month; the weekly check (moves and best content) for every rival not checked this week, with an alert to each Paid and Client institution tracking it for every new move; and what to learn from rivals for every Paid and Client institution without this month's list.
- `--check` runs one weekly check now. `--actions` rebuilds one institution's list of what to learn from its rivals (it also follows each Paid or Client Audit).
- Rival ads are entered by the team under Rival ads, at `/team/ads`.

## Demand

What students search, ask and worry about (spec section 9), grouped: a topic, a count and a source, never a person. Demand is pulled once per region (city, state, All India) and program, and shared by every institution that needs it.

- **Paid and Client** see their city, state or All India (the switch at the top), for all their programs or one: the fastest rising course or career with its searches month by month, what students worry about most, the season clock, 5 content ideas (each with what to make, the effort, the program, the real question it answers with where and how often it was asked, and the rising search behind it when there is one, all stored with the idea), the top questions, the worries (the usual five plus anything new), what is rising and falling (one list, each change a bar from the middle), and what students say about them and the rivals they track (from each one's state, with a bar of praise against criticism).
- **Free** sees one rising trend, for its Free program in its city (`demand_highlight`), and one "Paid shows everything students are asking" card with counts (`demand_teaser`). Home shows the same highlight on every plan; Paid and Client also see its searches by month (`loadHighlightHistory`).
- **Plan rules, enforced by the database:** Paid and Client read only their own regions and programs. Mentions come only through `demand_mentions`, only about the institution and its tracked rivals.
- Hindi and Assamese items show in English with a language tag; the original wording stays in the data.
- Programs added under Other have no shared key, so Demand does not cover them yet.
- The sample has Demand pulls from April to September 2026.

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
- **3 things to do this month:** the biggest Audit fix, the top Rivals lesson on another check, and the top content idea from Demand (`src/report/things.ts`). The same three show on Home for Paid and Client, there ordered by the points each could add, with Mark as done.
- **The page cap:** every list has a limit and every long sentence a line limit. A report that would still pass 8 pages is made again in its compact form (3 fixes in detail instead of 5, and no pillar chart on the rivals page).
- **Charts and icons, as on the dashboard:** the overall score on its gauge, each result as a thin bar of the points it earns with the word, check and pillar icons, a bar for what each fix could add, each pillar against every rival, bars for how fast trends rise and how often questions are asked, and each source's platform mark.
- A new report adds "Your September report is ready." to Notifications.

```
npm run report -- --due
npm run report -- --due --date 2026-10-01 --dry-run
npm run report -- --institution eastgate-university --month 2026-09
npm run report -- --institution eastgate-university --month 2026-08 --preview --out report.pdf
```

- `--due` makes every report due that day. `--institution` makes (or makes again) one month's report; `--out` also saves a copy, and `--preview` only renders it (nothing stored or recorded).
- The sample data includes the August 2026 report for Eastgate University (Paid) and Brightpath Skills Academy (Client), made on 1 September.

## Details added by you

Settings has an About tab, and each program has its details under Programs. Every plan has them. All optional and short: approvals and recognition, campus and contact, and what makes the institution different; and for each program its duration, fees, seats, eligibility, specialisations, placements, application dates and page.

- **The owner edits them.** Members and the AdmitLabs team read them; rivals never see them (row level security on `institution_details` and `program_details`, with database tests).
- **Labelled "Added by you"** wherever they show: beside the check they relate to on the Audit, in the advice on how to fix it, and in the monthly report.
- **Never part of the score.** The scoring engine, the Audit and the providers never read them, and a test checks that no file there mentions them.

## Icons and logos

- **Line icons** are drawn for Drishti on a 24px grid (`src/graphics/icons.ts`): one for each of the 17 checks, the 3 pillars and the main sections. The PDFs draw the same paths.
- **Logos:** only Instagram, X and YouTube show their real one-colour logo, from Simple Icons 16.33.0 (CC0), unchanged, in the colours each brand allows. The files, their source and licence are in `src/graphics/brands` (see `SOURCES.md`). Every other platform shows a neutral line icon and its name. No brand's terms have been accepted.
- **Results without colour** (`src/components/ui/Results.tsx`, `CheckSummary.tsx`): a thin bar of the points a check earns against the points it could, then the word; Missing is an empty dashed bar. A part's checks are always named (rule 11): every check as a row, weakest first, where there's room; where it's tight, one bar split by result in four shades (Weak with a thin outline, Missing dashed) with each count written under its piece, then the check to fix first. The shades are tokens (`--result-*`), set for black and for ivory.
- **The score gauge** draws its number in the same picture as the arc: centred on the arc's baseline, never touching it, "/100" smaller on the same line, "0" and "100" under the two ends. Its geometry and the number's placement (`src/graphics/gauge.ts`, with tests) are shared by the screens and the PDFs.
- **The Drishti eye** sits before the word in "Drishti by AdmitLabs" (`ProductLockup` in `src/components/ui/Brand.tsx`), drawn once in `src/graphics/eye.ts` for the screens, the PDFs, the link previews and the favicon (`src/app/icon.svg`, checked by a test; the website's own pages keep "AL" in `src/app/(site)/site/icon.svg`). Three lashes from 20 px up, the eye alone below that. Its motion is CSS (`src/components/ui/Eye.module.css`): A in the dashboard, login and a shared Audit, C on `/drishti` and the website, the Rise reveal once in the `/drishti` hero and the website's Drishti section, still in pictures, menus, PDFs and previews, and still everywhere with reduced motion. `EyeMotion.tsx` adds the pointer follow and plays a reveal only once it is in view. The Rise reveal hides the eye behind the D using the D's measures at each size (`--eye-d`, `--eye-d-mid`), because Bricolage changes them with optical sizing.

## Team tools

The AdmitLabs team area at `/team` (spec section 13), for `team@admitlabs.example` and `admin@admitlabs.example`. To everyone else it does not exist.

- **Institutions** (`/team`): everyone in Drishti, 50 a page. Search by name or website; filter by status (signed up, prospect, rival record), plan and score, with type, state and city under More filters; sort by name, score or last check. The four counts at the top filter the list; the one that is on turns it off again.
- **Bulk Audit** (`/team/bulk`): paste a list or choose a CSV file, up to 100 rows a run. One institution per line: `name, website, city, type, programs, instagram`, with programs separated by semicolons and Instagram optional. A header row can put the columns in any order and add a `state` column. Every row is checked first: Ready, Needs fixing, or skipped because the institution has signed up. A website already on record reuses that record. Each ready row becomes a prospect with a private team Audit, with a progress bar and the results. Past runs stay under Earlier runs. "Try a sample list" loads 5 fictional institutions.
- **Institution page** (`/team/institutions/<id>`): the latest score and pillars; the plan, with an Admin's plan controls (or, before they sign up, sharing the Audit); what to fix first for a prospect; then Audits, Programs, People, Notes (team only) and Share links in tabs. **Run a team Audit** runs a private team Audit; for a Client, **Refresh their Audit** runs their own Audit, which they see. **Open their dashboard** shows a signed-up institution's dashboard exactly as they see it, read only, under a bar that says so.
- **Plans** (Admin only, on the institution page): start Paid from the day of payment (today, or up to 6 months back; always 6 months), make them a Client, or end the plan now. The first Audit of a new plan runs straight away. The database refuses these for anyone but an Admin (`set_plan`, `end_plan`).
- **Sharing** (prospects and rival records only): **Create a link** makes a private link to the latest team Audit. It works for 90 days unless the team stops it sooner. It opens without signing in, at `/share/<token>`, and is never indexed: the score and pillars, the top 3 fixes with how to fix them, then "Want AdmitLabs to fix this for you? hello@admitlabs.in" and "Get your free Audit". Below, folded: what's working, the rest of the fixes under one line saying "AdmitLabs can fix any of these.", and every check with its result, what was found, the source and the date. How to fix is sent for the top 3 fixes only. **Download PDF** gives the same content as a PDF, on the team page and on the shared page. An expired or stopped link says so and offers the free Audit. A link keeps working after the prospect signs up; their team Audits and notes stay invisible to them.
- **Rival ads** (`/team/ads`): what rivals promise in their ads, entered by hand until Drishti can collect it.
- **Enquiries** (`/team/enquiries`): everyone who wrote in through the website's Work with us form, newest first, with their role, institution, email, phone, program and message. New shows the ones nobody has handled yet; All shows every one. **Mark as handled** moves one out of New (and **Mark as new** brings it back). Every team user sees them. No emails are sent.
- **Team users** (`/team/users`): an Admin adds someone by email as Team or Admin (someone who has signed in before joins at once, anyone else at first sign in), changes roles and removes people. There is always at least one Admin.
- **On a phone**, the five team pages sit in the bottom bar.

The limits (90 days, top 3 fixes, 100 rows a run, 50 a page, Paid ending within 30 days) are `TEAM_RULES` in `src/config/team.ts`. The sample data includes a live shared Audit for Cedar Skill Institute; `npm run db:reset` prints its link.

## Live: the website first

The website (admitlabs.in) and the product page (admitlabs.in/drishti) go live on Vercel from the GitHub repo tathyaresearch/admitlabs: a push to `main` deploys. The dashboard is not open yet.

- **One switch.** `NEXT_PUBLIC_APP_OPEN` (`APP_OPEN` in `src/lib/urls.ts`). It is `false` in `.env.production`, which `next build` reads for production, and open everywhere else (`npm run dev`, tests). Set it to `true` when Drishti opens.
- **While it is closed,** every address shows the website (admitlabs.in, and Vercel’s preview addresses); www.admitlabs.in and app.admitlabs.in move to admitlabs.in. `/signup` and `/login` keep their left side and say "Drishti opens soon." with a "Talk to us" button (an email to hello@admitlabs.in). Every "Get your free Audit", plan button and Sign in on the website and `/drishti` says "Talk to us" and opens `/signup` (`src/site/way-in.ts`). Work with us shows an "Email us" button instead of the form. On the home page, the FAQ’s "How do we start?" and the final band’s line say to talk to us (`CLOSED` in `src/site/content.ts`). Every other dashboard page (the dashboard, `/team`, `/share`, onboarding, the design system) is not found, and its pages and files check the switch too.
- **Vercel.** `vercel.json` says the app is Next.js and where its build lands (`.next`), so the project’s own settings from the old site (Framework Preset, an Output Directory of `.`) do not matter. Vercel deploys only commits by an author linked to its account: commit as ofcareersofficial@gmail.com.
- **No database in production.** Vercel has no Supabase settings and needs none: nothing on the live site reads a database. `.env.production` holds only the live addresses and the switch, no keys.
- **Try it locally** the way Vercel runs it: `npm run build`, then `npx next start` and open http://localhost:3000 (any address that is not app.admitlabs.in shows the website).

## Website

The AdmitLabs website (spec section 22), later served at admitlabs.in, is part of this app. Open http://admitlabs.localhost:3000; no sign in, and it works with the database stopped (only sending the form needs it).

- **Two addresses, one app.** The address a request comes to decides what answers (`src/lib/hosts.ts`, applied by `src/proxy.ts`): on the website's address, the website and `/drishti`; on the dashboard's address (http://localhost:3000), the dashboard. Dashboard paths on the website's address move to the dashboard's, and `/drishti` on the dashboard's address moves to the website's. The addresses are `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_PRODUCT_URL` in `.env`. The website's pages live at `/site` inside the app.
- **Pages.** The home page and Work with us (`/work-with-us`), with the product page beside them. The words are in `src/site/content.ts`; a test checks them (no dashes, no prices, the FAQ as approved, and only who we work with).
- **Spotlight style** (redesign of 2026-10-02): black with soft light from above, ivory surfaces for the moments that matter, fine frames with small crosses (`Frame.tsx`), and no small labels above headings. Fixed black and ivory, whatever the device setting. Each section has its own stylesheet in `src/components/site`.
- **Pictures drawn for the website**, in HTML and CSS: a search, a review, an enquiry, a program's page, posts, a reel and a film, an admission season, Drishti's Home. They show a made-up institution, Larkmoor University, in Bangalore, and made-up neighbours (`src/site/scenes.ts`), never Drishti's own sample data, with no caption. Instagram and YouTube appear only as their official one-colour logos.
- **Gradients and grain.** The website and the product page (`/drishti`) may use subtle monochrome gradients, and so may the left side of sign up and log in; a test (`src/site/scenes.test.ts`) checks that the dashboard has none. The grain is one 3 KB picture tile (`public/textures/grain-on-dark.png`) layered into a background, and only where light falls (the hero, the dark stages, the final call): a noise filter or grain over whole long sections made browsers slow to draw the page.
- **Header.** Services, Products (a small menu: Drishti, and Tathya, which opens https://mytathya.in in a new tab), How we work and FAQ, then "Work with us" and "Get your free Audit". On a phone, a menu with both products. Every "Get your free Audit" goes to `/signup`; the footer's Sign in goes to `/login`. The logo and the buttons keep clear of the frame's lines and crosses.
- **Motion** is CSS only, with no script and no animation library: on load the light comes up and the frame draws; sections fade and rise in as they scroll into view; the system's moments arrive in order (the search types its query, the enquiry is received), the phones rise, the posts appear and the season fills; a dot travels the monthly loop; buttons, cards and links answer the pointer calmly. With reduced motion nothing moves and everything shows settled.
- **Work with us** saves each enquiry to the `enquiries` table through `submit_enquiry`, the only way in. The form and the database check the same limits. A hidden field catches bots (they are told it went, and nothing is kept), and one email can send at most 3 a day. A service tile's "Work with us" link names that service in the message. The team sees them under Enquiries.
- **Settings** (`SITE_SETTINGS` in `src/config/site.ts`): `showWork` turns on Our work once there are samples in `src/site/work.ts` (images in `public/work/`); `tathyaUrl` is where "Explore Tathya" and the Products menu's Tathya link go (https://mytathya.in, in a new tab); `email` is the contact address.
- **Search and sharing.** Each page has its own title, description and link preview image (`opengraph-image.tsx`, 1200 by 630: the headline in the hero's light and frame). `robots.txt` lets search engines in only on the website's address and points them to `sitemap.xml`; on any other address it asks them to stay out.
- **Fonts.** Bricolage Grotesque and Inter come through `next/font`, for the website, the product page and the dashboard. Only their basic Latin files are preloaded. The other files (latin-ext, which has the rupee sign, and the rest) load when a page uses one of their characters.

## Product page

`/drishti` (spec section 15) is the landing page, later served at admitlabs.in/drishti. Open http://admitlabs.localhost:3000/drishti; no sign in, and it works with the database stopped.

- **Part of the website.** The website's header and footer, and its Spotlight style (rebuilt on 2026-10-02): black with light from above, ivory for the problem, the sample report, Paid and the clients block. Fixed black and ivory, whatever the device setting. The sections are in `src/components/product`; the website's shared pieces in `src/components/site`.
- **Calm headings** (2026-10-03): the hero headline 52 px (30 on a phone), section headings 36 px (28), lines under them 16 to 17 px. The sizes belong to the page (`.page .heading` and `.page .lede` in `product.module.css`, two classes so they win over the website's title styles in any order); the website keeps its own. No small labels above headings, but a feature's own name.
- **The problem.** One tight band: "Most teams guess. Drishti checks." with its line beside it, then one wide, dense Drishti card. A top bar (the sample university, last checked), then three panels side by side (two, then the questions across, below 1200 px; stacked on a phone): the score from the Audit's checks, the ranking from each one's own Audit (one grid, so the bars start together after the longest name), and the questions asked most with their site and count on the right, with the search rising fastest at the foot. Every value comes from the sample; the card's words carry no numbers of their own (a test checks).
- **The features.** Each opens with a bar (its name, its question, "1 of 3") that stays under the header while its pictures pass, then one short line (`FEATURES[].line`; the website's Drishti section keeps `lede`) and the product across the full width.
- **The score, as a table.** Inside the Audit: the total beside the words, then the three parts side by side (stacked on a phone), each with its question and score, and every check's result (the weakest program's, as the Audit's grid shows). Rows sit in slots of one height, so they line up across the parts; Trusted's empty last slot is ruled like the rest (`slots` in `Sections.tsx`). Bars are one width (`--bar-w`) and the words one column (`--result-col`), shorter on a small phone. Only the total and the three part scores are numbers, and a test checks they add up. Then what each result earns.
- **Real previews, fictional data.** Each preview is the dashboard's own component, filled with the sample world's August 2026, worked out in memory with the real scoring engine (`src/sample/world.ts`), then shown under the website's names (`src/product/larkmoor.ts`): Larkmoor University, Bangalore, with Calderwood College, Brackenfield University and Thornbury College as its rivals. Only the words change; a test checks that every number matches and that no sample world name or place is left. The previews carry no caption. The dashboard's sample keeps Eastgate. The page is prerendered at build and never reads the database.
- **Motion.** Sections fade and rise in; each feature's bar holds its place while its pictures pass; the Audit's score counts up as its gauge draws (`CountUp.tsx`; the eye's `EyeMotion.tsx` is the page's only other script); its bars fill; the rivals slide from the order of their names into rank order; Demand's months grow in turn; the report's pages fan out from one pile; buttons, stages and plans answer the pointer. All of it is off with reduced motion, where the page shows settled.
- **Buttons.** "Get your free Audit" and "Start with a free Audit" go to `/signup`, then onboarding. For now the AdmitLabs team switches Paid on.
- **Sample report.** `/drishti/sample-report.pdf` is the report the monthly job would make for the same institution and month, under the same names as the page (Larkmoor University), marked "Sample report. Fictional data." on the cover and every page. Made once at build.
- **Words and numbers.** The copy is in `src/product/content.ts`. Every number in it (prices, plan length, reminders, schedules, the 17 checks, 3 to 5 rivals) comes from config, and a test checks it.
- **Sharing.** `opengraph-image.tsx` draws the link preview (1200 by 630) with the report's Bricolage font files.

## Local addresses

| What | Address |
|---|---|
| App | http://localhost:3000 |
| Sign up, log in | http://localhost:3000/signup, http://localhost:3000/login |
| Website | http://admitlabs.localhost:3000 |
| Product page | http://admitlabs.localhost:3000/drishti |
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
| `npm run motion:record` | Records the Drishti reveals into `brand/motion` (with `npm run dev` running; needs ffmpeg and Edge or Chrome). See `brand/motion/README.md` |

## Layout

```
supabase/        config, migrations (schema, row level security, owner actions), database tests, email template
scripts/         env, seed, audit, tier, rivals, demand, report, dash check, reveal recording (TypeScript run directly by Node)
brand/motion/    the Drishti reveals as MP4 and GIF, made by npm run motion:record
src/app/         routes: (site)/site (the website), (product)/drishti, signup, login, (dashboard), onboarding, team, share, design-system
src/components/  ui, charts, audit, rivals, demand, report, team and share screens, sign up and log in, the website, institution inputs and the app shell
src/domain/      pure logic: the scoring engine (domain/scoring), checks, schedules, onboarding checks, dates, tiers
src/config/      every adjustable value: scoring, plans, entitlements, schedules, providers, cities, programs
src/providers/   the provider interface, mock providers, and real provider slots
src/audit/       one Audit end to end (collect, score, save) and what the Audit screens show
src/rivals/      comparisons, verdicts, change rules, what to learn from rivals, and the rival jobs
src/demand/      regions, the pull schedule, ranking and spikes, the season clock, the page view, and the pulls
src/report/      the monthly report (its schedule, the 3 things to do, the snapshot, the PDF, the job) and the shared Audit PDF
src/team/        team tools: the bulk list reader, list filters, plan rules and the shared Audit
src/graphics/    the gauges, line icons, the Drishti eye, brand logos (with their sources) and platform marks, shared by the screens and the PDFs
src/product/     the product page: its words (numbers from config) and its preview data
src/site/        the website: its words, what its pictures show, the Work with us form's rules and the Our work samples
src/sample/      the fictional sample world, and that world worked out in memory (world.ts, report.ts)
```

`src/domain`, `src/config`, `src/providers`, `src/audit`, `src/rivals`, `src/demand`, `src/report`, `src/team`, `src/graphics`, `src/product`, `src/site` and `src/sample` never import Next.js, so Node runs their tests directly. The PDF library only ever loads on the server: in the report job, for shared Audit PDFs and for the sample report (`serverExternalPackages` in `next.config.ts`). Never in the browser.

## How scores work

The scoring engine is in `src/domain/scoring`: pure functions, no database. Facts from the providers become Strong, Okay, Weak or Missing (spec 7.5), then pillar, program and overall scores (spec 7.4), rounded to whole numbers with halves rounding up. Every number comes from the active row in `scoring_config` (version 1 is `src/config/scoring.v1.ts`), and each Audit records the version it used.

## Before launch

Must do before any real institution uses Drishti:

1. **Proof of ownership when claiming an institution.** Signing up with a website already on record (a tracked rival or a team prospect) claims that record. Nothing private leaks today, but anyone who enters the website takes over the record. Options to weigh: a code sent to an email on the institution's own domain, or team approval of each claim.
2. **Privacy policy and terms pages, reviewed by a lawyer.** The product page explains privacy in plain words in its FAQ, but there are no policy or terms pages yet.
