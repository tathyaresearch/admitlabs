# Drishti by AdmitLabs: Product Spec

Version 1.0 | 30 September 2026 | Owner: Manprit, AdmitLabs

This is the single source of truth for building Drishti. If something is not in this spec, ask before deciding. Values marked **[ADJUSTABLE]** are starting values and must live in config, not be hard-coded.

---

## 1. The product

**One line:** See where you stand, who's ahead, and what students want. Every month.

**Who it's for:** Private colleges, private universities and skilling institutes. Users are directors and founders, marketing heads, and admission heads.

**Three features:**

1. **Audit**: "How do we look?" Checks the institution's public presence and gives a score.
2. **Rivals**: "Who's ahead of us?" Tracks 3 to 5 competing institutions.
3. **Demand**: "What do students want?" Listens to what students search and say online.

**Two surfaces:**

| Surface | Final address | What it is |
|---|---|---|
| Product page | admitlabs.in/drishti | Premium product landing page |
| Dashboard | app.admitlabs.in | Premium SaaS dashboard, Drishti inside. Future AdmitLabs institution tools will live here too |

**Role in the AdmitLabs business:**

```
FREE       "Here's where you stand."
PAID       "Here's what's changing every month."
SERVICES   "We'll fix it for you."
```

The AdmitLabs team also uses Drishti internally to find, pitch and serve clients.

---

## 2. Build approach

- **Build the whole product on sample data first.** Every screen, score, report and plan rule must work end to end on sample data.
- **External connections come later.** Every data source gets a clear slot (a "provider") with a mock version now. Real versions plug in later without rebuilding anything else.
- **Build order:** Foundation, then Audit, then Rivals, then Demand, then Report, then Team tools, then Product page.
- **Not in this build:** real data collection, Claude API calls, payments, WhatsApp, email sending, deployment and domains. See section 17.

---

## 3. Tech stack

Same base as Tathya, so the team already knows it.

| Job | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Database, auth, storage | Supabase (Postgres, Auth with email OTP, Storage, Row Level Security). Local development with the Supabase CLI |
| Data access | Direct Supabase client. No ORM |
| Styling | CSS Modules + CSS custom properties (design tokens). No Tailwind, no component library, no shadcn |
| Charts | Hand-built SVG components, monochrome |
| PDF report | @react-pdf/renderer with Bricolage Grotesque and Inter embedded |
| Scoring | Pure functions: data in, score out. No database calls inside the engine |
| Tests | Node's built-in test runner |
| Hosting (later) | Vercel |

**Development machine is Windows.** Project lives at `D:\Drishti`. All scripts must work on Windows.

---

## 4. Routing

One Next.js app, two addresses. Which pages answer depends on the address a request comes to (`src/lib/hosts.ts`, applied by `src/proxy.ts`).

| Address | What it serves |
|---|---|
| admitlabs.in | The AdmitLabs website (section 22) and the product page at `/drishti`. Dashboard paths move to the dashboard's address |
| app.admitlabs.in | The dashboard (the routes below). `/drishti` moves to the website's address |
| www.admitlabs.in | Moves to admitlabs.in for good |

| Route | Surface |
|---|---|
| `/` (website) | AdmitLabs home page |
| `/work-with-us` (website) | Work with us: the enquiry form |
| `/drishti` (website) | Product page |
| `/signup` | Sign up: email, then a 6-digit code. A new email gets an account; one that has an account is simply signed in |
| `/login` | Log in: the same email code, for an account that exists or someone invited. It never says whether an email has an account, and never creates one for anyone else |
| `/onboarding` | Institution setup |
| `/` (dashboard, logged in) | Dashboard home |
| `/audit`, `/audit/[programId]` | Audit |
| `/rivals`, `/rivals/[rivalId]` | Rivals |
| `/demand` | Demand |
| `/reports` | Monthly PDF reports |
| `/plan` | Plan and access |
| `/settings` | Institution details, users |
| `/team/...` | AdmitLabs team area (team roles only), including Enquiries |
| `/share/[token]` | Shared Audit link for prospects (read only, no login) |

**Website first.** Until Drishti opens, production runs with the dashboard closed (`NEXT_PUBLIC_APP_OPEN=false` in `.env.production`): every address shows the website, app.admitlabs.in moves to admitlabs.in, `/signup` and `/login` keep their left side and say "Drishti opens soon." with a "Talk to us" email button, every "Get your free Audit" and plan button on the website and `/drishti` says "Talk to us" and opens `/signup`, "Sign in" (header, phone menu, footer) opens `/login`, the two pages link to each other and their logo goes to the home page, Work with us offers an email instead of the form, and every other dashboard route is not found. Nothing in production reads a database.

The addresses are settings in `.env` (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PRODUCT_URL`), with the live ones in `.env.production`, so moving them is a config change only. Locally the website is http://admitlabs.localhost:3000 and the dashboard http://localhost:3000. The website's pages live at `/site` inside the app. Search engines may crawl only the website's address (`robots.txt`), which lists its pages in `sitemap.xml`.

---

## 5. Users, roles and plans

**Roles**

| Role | Who | Can do |
|---|---|---|
| Owner | Institution user who signed up | Everything for their institution, invite members |
| Member | Invited institution user | View everything their plan allows |
| Team | AdmitLabs staff | Everything in the team area, all institutions |
| Admin | AdmitLabs leads | Team + manage plans and team users |

**Plans (tiers)**

| Tier | Who | Cost | Length |
|---|---|---|---|
| Free | Any institution | ₹0 | Ongoing |
| Paid | Non-clients | ₹9,999 | 6 months from signup date |
| Client | AdmitLabs service clients | Included | While the service is active (set by Admin) |

Paid rules:
- Only one paid plan: 6 months. No yearly plan. No discounts.
- Starts on the day of payment.
- **No auto-renew.** Reminder 30 days before end and 7 days before end (in-app now; email later).
- When a paid plan ends, the institution drops to Free. They keep seeing their last Audit score.

In this build, Admin sets an institution's tier manually. Payment comes later.

---

## 6. Onboarding (input)

The institution enters:

1. Institution name (required)
2. Institution type: College, University, Skilling institute (required)
3. City (required). State is derived from city
4. Programs (required, at least one; add as many as needed)
5. Website (required)
6. Instagram (required, handle or URL)
7. YouTube (optional)
8. Other social links: Facebook, LinkedIn (optional)

In Settings, the owner can also add the institution's **Google Maps listing** (optional): the link from the listing's Share button, or the listing page. The Audit's Google profile and review checks then read that listing, so the rating and reviews are always the institution's own.

After onboarding, Free users pick the **one program** their Free Audit covers. The last step says what happens next: Drishti checks what a student would see (about a minute), shows a score out of 100 and the first things to fix, and the next free Audit comes in 3 months. Then Home opens, with Start here (section 13).

**Details added by you (Settings, every plan).** All optional and short.

- About the institution: year founded, NAAC grade, NIRF rank and its year, AICTE approval, UGC recognition (or skilling recognition), other approvals, campus address, admissions phone and email, hostel, scholarships, and what makes it different.
- For each program: duration, fees, seats, eligibility, specialisations, placements (year, share placed, average and highest package, top recruiters), application dates and the program page.
- Labelled "Added by you" wherever they show. Used for context, better how to fix advice and the monthly report. **Never part of the score.**
- The owner edits them. Members and the AdmitLabs team can read them. Rivals never see them.

---

## 7. Feature 1: Audit

### 7.1 Purpose

Answers: **"How do we look to a student searching for us?"** Public information only. The same things a student or parent would see.

### 7.2 What it checks

17 checks, grouped into three pillars.

| Pillar | Check key | Check | Level |
|---|---|---|---|
| Discovered | `google_search` | Shows up on Google for "[program] in [city]" | Program |
| Discovered | `instagram_activity` | Instagram posting and reels | Institution |
| Discovered | `google_profile` | Google profile exists, number of reviews | Institution |
| Discovered | `youtube` | YouTube activity | Institution |
| Discovered | `ai_answers` | Named when a student asks ChatGPT, Gemini and Perplexity "best [program] in [city]" | Program |
| Discovered | `other_socials` | Facebook, LinkedIn activity | Institution |
| Trusted | `placement_proof` | Placement or results proof | Program |
| Trusted | `review_rating` | Google review rating and replies | Institution |
| Trusted | `approvals` | Approvals and official data shown | Institution |
| Trusted | `faculty_leaders` | Faculty and leaders visible | Institution |
| Trusted | `students_in_content` | Real students and alumni in content | Institution |
| Chosen | `fees_shown` | Fees shown clearly | Program |
| Chosen | `program_page` | Program has its own page | Program |
| Chosen | `easy_enquiry` | Enquiry form and WhatsApp | Institution |
| Chosen | `admission_steps` | Admission steps clear | Program |
| Chosen | `mobile_friendly` | Website works on phone | Institution |
| Chosen | `page_speed` | Website loads fast | Institution |

**Program-level** checks are scored separately for each program. **Institution-level** checks are scored once and shared by all programs.

### 7.3 Rules by institution type

- **College and University:** `approvals` means official data and approvals such as NIRF, NAAC, AICTE, UGC.
- **Skilling institute:** `approvals` means skilling recognition instead. Google profile and reviews count more. YouTube and AI answers count less. See weights below.

### 7.4 Score model

Each check gets a result: **Strong, Okay, Weak or Missing**.

| Result | Share of the check's points **[ADJUSTABLE]** |
|---|---|
| Strong | 100% |
| Okay | 60% |
| Weak | 30% |
| Missing | 0% |

Each pillar is out of 100. Weights **[ADJUSTABLE]**:

**Discovered**

| Check | College / University | Skilling |
|---|---|---|
| google_search | 30 | 30 |
| instagram_activity | 25 | 25 |
| google_profile | 20 | 30 |
| youtube | 10 | 5 |
| ai_answers | 10 | 5 |
| other_socials | 5 | 5 |
| **Total** | **100** | **100** |

**Trusted**

| Check | College / University | Skilling |
|---|---|---|
| placement_proof | 30 | 30 |
| review_rating | 25 | 30 |
| approvals | 20 | 20 |
| faculty_leaders | 15 | 10 |
| students_in_content | 10 | 10 |
| **Total** | **100** | **100** |

**Chosen** (same for all types)

| Check | Points |
|---|---|
| fees_shown | 25 |
| program_page | 20 |
| easy_enquiry | 20 |
| admission_steps | 15 |
| mobile_friendly | 10 |
| page_speed | 10 |
| **Total** | **100** |

**Calculations**

- Pillar score = sum of (check weight × result share). Rounded to a whole number.
- Program score = average of its three pillar scores.
- Institution overall score = average of all its audited program scores. Institution pillar scores = average of program pillar scores.
- Score label **[ADJUSTABLE]**:

| Score | Label |
|---|---|
| 70 to 100 | Strong |
| 40 to 69 | Needs work |
| 0 to 39 | Getting started |

The engine must be one pure function (plus helpers) that takes check results and config and returns all scores. Fully covered by tests.

### 7.5 What counts as Strong, Okay, Weak, Missing

Fixed rules for now **[ADJUSTABLE]**. Later these move to comparison with peers (same type, same region), once enough institutions are audited. Build the threshold logic so this switch is possible.

**Discovered**

| Check | Strong | Okay | Weak | Missing |
|---|---|---|---|---|
| google_search | Top 3 results | Rest of page 1 | Page 2 | Not in top 20 |
| instagram_activity | 3+ posts a week, mostly reels | 1 to 2 a week | Less than once a week | No account |
| google_profile (College / University) | 100+ reviews | 30 to 99 | 1 to 29 | No profile |
| google_profile (Skilling) | 50+ reviews | 15 to 49 | 1 to 14 | No profile |
| youtube | New videos every month | Posted in last 3 months | Older | No channel |
| ai_answers | Named by 2+ AI assistants | Named by 1 | Only when asked by name | Not known |
| other_socials | Active monthly | Occasional | Inactive | None |

**Trusted**

| Check | Strong | Okay | Weak | Missing |
|---|---|---|---|---|
| placement_proof | Numbers, companies, year, updated in last year | Numbers only, or older | Vague claims | Nothing |
| review_rating | 4.3+ and replies to most | 4.0 to 4.2, or few replies | Below 4.0 | No reviews |
| approvals | All shown, with proof or link | Mentioned, no proof | Some missing | None |
| faculty_leaders | Faculty page with names, photos, qualifications, and leaders in content | Faculty page only | Names only | None |
| students_in_content | Every month | Sometimes | Rarely, or stock photos | Never |

**Chosen**

| Check | Strong | Okay | Weak | Missing |
|---|---|---|---|---|
| fees_shown | Full fees for the program | Range or partial | "Contact us for fees" | Nothing |
| program_page | Program has its own detailed page | Short or thin page | Only on a combined page | Not on site |
| easy_enquiry | Form and WhatsApp on every page | One of them | Hidden on contact page | Not working |
| admission_steps | Step by step with dates | Steps, no dates | Vague | None |
| mobile_friendly | Works fully | Small issues | Hard to use | Broken |
| page_speed | Google speed score 90+ | 50 to 89 | Below 50 | Doesn't load |

### 7.6 Audit output

What the user sees after an Audit:

1. **The score**: overall and Discovered, Trusted, Chosen, with change since last Audit.
2. **Every check**: its result (Strong, Okay, Weak, Missing) as "18 of 30 points" with the word, what Drishti found, where it found it (source link) and the date checked. A check whose programs differ shows its weakest program by name.
3. **What's working**: the checks that are Strong everywhere they apply, ranked by the points they earn (Free: the top 3). Shown first.
4. **What to fix**: every check below Strong anywhere, ranked by impact (points that could be gained). Each is named by what to do ("Publish your BBA placement results", the same name on Home, the Audit and a shared Audit), with the check as a small label, what's wrong, why it matters to a student, how to fix it in short numbered steps, and the effort in plain words: Quick, Medium or Big (stored as easy, medium, hard). A title fits what was found: with no reviews yet, "Get your first Google reviews".

Each check is in exactly one of the two, so their counts add up to the checks the Audit ran (13 to fix and 4 working make 17). A short what's working (the top 3 in the monthly report and on a shared Audit) fills in with the best checks that are at least Okay everywhere when fewer than 3 are Strong.

**Mark as done.** The owner marks one of Home's things done (section 13). A fix, or a rival lesson about a check, waits for the next own Audit, which checks it: it moved up ("Confirmed, 2 points added") or it did not yet (with what the Audit still found). Any other thing (a rival's post to learn from, a content idea) is kept with its month. People at the institution and the AdmitLabs team see what was marked; only the owner marks or takes a mark back.
5. **By program**: the same view for each program.

### 7.7 Tone

A low score is an opportunity, not a failure. Copy must say "here's what to fix," never "you are failing." No shaming language anywhere.

---

## 8. Feature 2: Rivals

### 8.1 Purpose

Answers: **"Who's ahead of us, and what are they doing?"** Public information only.

### 8.2 Input

- Drishti **suggests** rivals: same type, overlapping programs, same city first, then same state.
- The institution picks **3 to 5** rivals, or adds its own (name, city, website, Instagram).
- Rival institutions are stored as regular institution records that nobody has claimed. If a rival later signs up, they claim that record.

### 8.3 What it tracks

| Area | Tracked |
|---|---|
| Score | Each rival's Audit score, same checks and rules |
| Best content | Rival's top 5 posts of the month (Instagram, YouTube), with a short "why it worked" |
| Moves | New programs, fee changes, new website pages, admission dates announced |
| Ads | What rivals promise in their ads. **Manual entry by the team for now** |
| Timing | When each rival's admission push starts |
| Reviews | Review trend: better or worse |

### 8.4 Output

1. **Head to head**: your score vs each rival, pillar by pillar.
2. **Where you lead, where they lead.**
3. **Their best content** and what to learn from it.
4. **Moves this month.**
5. **What to learn from your rivals.**

### 8.5 Rules

- **Learn, never copy.** Drishti never suggests copying a rival's content.
- **Rivals never know.** No one can see who is tracking them.

---

## 9. Feature 3: Demand

### 9.1 Purpose

Answers: **"What are students asking, wanting and worrying about right now?"** Public sources only. **Not connected to Tathya.**

### 9.2 Input

Nothing new. Uses institution type, city and programs. The user chooses how wide to look: **City, State, All India**.

### 9.3 Sources

Google, YouTube, Instagram, Reddit, X, Quora. Languages to start: English, Hindi, Assamese.

### 9.4 Output

1. **Rising and falling**: courses and careers in the chosen region.
2. **Top 5 student questions** this month.
3. **Top worries**: fees, placements, hostel, safety, recognition (and any new ones found).
4. **What students say about you and your rivals**: public mentions, positive and negative.
5. **Season clock**: where we are in the admission year (exams, results, counselling).
6. **5 content ideas**: each built on a real student question, with its source. Each says what to make (a post, a reel, a video, an FAQ or a web page), how big a job it is (Quick, Medium or Big) and the program, all stored with the idea, and the rising search behind it when there is one (also stored, never guessed from the words).

### 9.5 Rules

- **Grouped only.** Never show or store individual students' names or profiles. Store the topic, the count and the source link, not the person.
- **Source shown** for every insight.
- **Shared pulls.** Demand data is collected once per region + program and shared by every institution that needs it. This keeps running costs low.

---

## 10. What each plan sees

| | Free | Paid | Client |
|---|---|---|---|
| **Audit** | | | |
| Overall score and its 3 parts | Yes | Yes | Yes |
| Every check | The result of each | What was found, with sources | What was found, with sources |
| What's working | Top 3 | Full | Full |
| What to fix | Top 3 | Full ranked list | Full ranked list |
| Programs | 1 | All | All |
| Progress month by month | No | Yes | Yes |
| **Rivals** | | | |
| Suggested rivals | Yes | Yes | Yes |
| Ahead or behind (overall only) | Yes | Yes | Yes |
| Full comparison, best content, moves, ads | A preview | Yes | Yes |
| Change rivals | No | Once a month | Anytime |
| **Demand** | | | |
| 1 rising trend | Yes | Yes | Yes |
| Everything else | A preview | Yes | Yes |
| Mentions of you and rivals | No | Yes | Yes |
| **Other** | | | |
| Alerts (rival moves, demand spikes) | No | Yes | Yes |
| Monthly PDF report | No | Yes | Yes |
| AdmitLabs team acts on it | No | No | Yes |
| Your AdmitLabs team: what the team did, and does next | No | No | Yes |

**Blur style:** show enough to prove the data is real (layout, counts, one example), blur the rest, with one clear "Unlock with Paid" action. Blurred content must be fake placeholder content in the page, never the real data hidden with CSS.

---

## 11. Schedules

| | Free | Paid | Client |
|---|---|---|---|
| Audit | Once every 3 months | Every month | Every month |
| Extra manual refresh | No | Once a month | Anytime, by the team |
| Rival moves | No | Checked weekly, alert when found | Checked weekly, alert when found |
| Demand | Monthly | Monthly, alert on big spikes | Monthly, alert on big spikes |

- Monthly run date = same day of the month as the signup (or plan start) date.
- Free users get a nudge when a new free Audit is available: "Your new Audit is ready. See what changed." It opens What changed on Home (section 13), for every plan.
- In this build, schedules run against mock providers. Build a way to trigger any scheduled run by hand for testing.

---

## 12. Monthly report (PDF)

- One PDF per institution per month. Downloadable from `/reports`. Paid and Client only.
- Stored in Supabase Storage.
- Same brand as the dashboard (section 14): the overall score on its gauge, each result as a thin bar of the points it earns with the word, check and pillar icons, and bars for what each fix could add, how fast a trend rises and how often a question is asked.

**Contents, in order:**

1. Cover: institution name, month, overall score and label
2. Score summary: overall, three pillars, change since last month
3. What's working (top 3: Strong first, the best Okay filling in)
4. What to fix (ranked)
5. By program (one short block each)
6. Rivals: head to head, each part ranked against every rival, key moves
7. Demand: rising trends, top questions, content ideas
8. **3 things to do this month**
9. Sources and dates checked

Details added by you show next to the fix and the program they relate to, labelled, never scored.

Keep it short enough to read in 5 minutes.

---

## 13. Dashboard screens

**Premium SaaS design.** Calm, spacious, confident. Think the best analytics products, in strict monochrome.

**Institution screens**

| Screen | Contents |
|---|---|
| Sign up (`/signup`) | Email, then a 6-digit code. "Create your Drishti account", "Free to start. Enter your email and we'll send you a code." An email that already has an account is simply signed in. "Already have an account? Log in". Left side: Home for the sample university in the dark, under a soft light that follows the cursor; where it falls, the score counts up and the bars grow |
| Log in (`/login`) | The same email and code. "Welcome back", "Enter your email. We'll send you a code." Log in never says whether an email has an account, so nobody can check who uses Drishti: for any email it shows the same code step, "If this email has a Drishti account, we've sent a code. New here? Sign up." (Sign up carries the email over), and answers in about the same time. It sends a code only to an account that exists, or to someone invited by an owner or the AdmitLabs team, who comes in like any account and joins on first sign in. It never creates an account for anyone else. "New to Drishti? Sign up". Left side: the Drishti eye, big, in the middle, following the cursor, among four cards of the sample's dashboard that lean with the cursor and change in turn (the score counts up, the rivals change places, the questions come in, the searches grow); the eye watches each card as it changes and reads along the field while someone types |
| Sign up and log in, both | The form first in reading order. On a wide screen the left side sits beside it; on a phone it is a small band above the form and plays on its own, as on any touch screen. With reduced motion the left side is still. The left side carries the logo and one line, "See where you stand. Every month." |
| Onboarding | The input form from section 6, then program pick for Free with what happens next. No left side; the Drishti logo, with its eye, at the top. After the first Audit, Home |
| Home | What to do first. The one-line answer; Start here on a first visit (three steps: your score, your first fix, your rivals; ticks as each is done; closed for good with "Got it, hide this", per person); for a Client, "Your AdmitLabs team" (what the team did this month, or its latest work, and what it does next, each with the day and a link to see it; when the Audit last checked and the next one; how to write to the team; "See all work"); "Do these 3 things this month" (Paid and Client: one from the Audit, one from rivals, one from what students ask, ordered by the points each could add) or "Fix these first" (Free: the top 3 fixes), each with where it comes from, the check as a small label, its programs, the points it could add (or how often students asked, for a content idea, with its format), the effort in Home's words (Quick, Medium, Big) and Mark as done; What changed since the last Audit (the score, each check that moved with its result before and after, the fixes marked done that this Audit checked, and for Paid and Client the rivals' moves and big jumps in searches; Free sees what Paid adds); then the score: the gauge, its band and change, "Up 14 since April", how far the next band is, and the 3 parts (each with the question it answers, its checks as one bar split by result with the counts, and what to fix first); rival snapshot with the latest move; 1 demand highlight with its searches by month. The score month by month and every check by name stay on the Audit |
| Audit | The three parts with "What do these mean?" (the parts and their questions, the four results and what each earns, the score's bands), every fix named as on Home with its check as a small label and its effort, all checks with results and points earned against possible (each part with its question; a check whose programs differ shows its weakest program), what to fix and what's working (each check in one of them, so the counts add up to all checks; Free's To fix points up to its 3 fixes instead of repeating them), progress month by month (Paid and Client: a table of each month's score and its 3 parts, the change since the month before, your place among your rivals, and the checks that moved, with every Audit folded below), program switcher |
| Program detail | Same as Audit, for one program |
| Check detail | Side panel, in one order: the fix it is about (its name as on Home, the points it could add, the effort, the programs); 1. what we found, program by program, with the source link and the date checked; 2. why it matters to a student; 3. how to fix it, in numbered steps, with the effort for each program; details added by you; Mark as done in the footer (the owner; others see that it was marked) |
| Rivals | Rival list, head to head table, part by part (each part ranked against every rival), check by check (every check, you and each rival with the result and who leads; tabs for where a rival leads, where you lead and all checks, opening on the first with something in it; each check opens what was found for each side, with the source and date, and what to learn from the one ahead, never to copy), overall score month by month as a table, moves, best content |
| Rival detail | One rival's full view, part by part and month by month, when their admissions open, their Google rating and its trend, and every check side by side (a side whose programs differ shows its weakest program). Every set of tabs opens on one with something in it: "Where they lead" shows only when they lead |
| Demand | Region switch (City, State, All India), when it was updated and the next update, where it was found by name ("From Reddit, Quora and Search trends, in English, Hindi and Assamese"), 6 output sections from 9.4, the fastest rise by month, rising and falling as bars |
| Your AdmitLabs team (`/work`, Client only) | Opened from the card on Home. "What has our AdmitLabs team done?": what the team does next, soonest first, then everything it did, by month, newest first, each with the day and a link to see the work. Write to your team at hello@admitlabs.in |
| Reports | List of monthly PDFs, download, the score by month with every point's value |
| Plan | Current tier, dates, what Paid unlocks, renewal reminder state, a table comparing the plans. "Ask for Paid" on Free and "Ask to continue Paid" from the first renewal reminder (see Asking for Paid below) |
| Settings | Plain groups, each at its own address (a list on the left, a row on a phone): Institution (details, public links, the Google Maps listing, and details added by you, section 6), Programs (with the Free Audit program and details for each program), Rivals (who, and when they can change), Team, Plan (with asking for Paid) and Notifications (what arrives, and when). Only the owner changes them |
| Notifications | Alerts list, with filters by what each is about (Audit, Rivals, Students, Reports, Plan, each with its count, only the ones that have alerts). Each link says where it goes ("See what changed", "See the move"). Empty, or still short: what arrives here and when, for the plan |

**Asking for Paid.** Wherever Paid is offered (the cards that say what Paid adds, a locked preview, the check panel, What changed on Free, the Plan page, Settings, a Paid plan that ended), the owner asks with one click: "Ask for Paid" on Free, "Ask to continue Paid" from the first renewal reminder. The request lands in the team's Enquiries with the institution and the owner's email; asking again while one is open sends nothing new, and the page says when it was sent. The price and terms never change, nothing is paid online and no email is sent: the team writes back and an Admin switches the plan on. Members see who can ask; Client has nothing to ask.

**Team screens (`/team`)**

| Screen | Contents |
|---|---|
| Team home | All institutions, sorted by the reason each needs attention, most urgent first, each row saying why: a Paid plan ending within 30 days, a Client with no team Audit this month, a score down 3 or more, signed up with no rivals, a prospect not signed up a week after their Audit was shared. Search, filter by type, city, state, score, tier, prospect or client; sort by name, score or last checked too |
| Bulk Audit | Add many institutions at once (paste list or CSV), run Audits, see results in a table |
| Institution detail | Everything the institution sees, plus private notes, tier control (Admin), manual refresh. For a Client, the Work log tab first: add what the team did or does next (Done or Next, one plain sentence, the day, a link when there is one), mark Next as done, remove an entry. It is what the Client sees |
| Share | Create a share link or PDF of a prospect's Audit |
| Rival ads | Enter what rivals promise in their ads, by hand until Drishti can collect it |
| Enquiries | Everyone who wrote in through the website's Work with us form (name, role, institution, email, phone, program and message), and owners who asked for Paid, or to continue it, from their dashboard (the institution, linked, and the owner's email), newest first. New or All. Mark as handled, or back to new. Every team user sees them. No emails are sent |

**Team rules**

- Prospect Audits run by the team stay private until the team shares them.
- A prospect's shared Audit does **not** use up their Free Audit.
- Private notes are never visible to institution users.
- A Client's work log is written for the Client: what was done, in plain words, with the day and a link to see it. Never notes, and never anything about rivals that the rival could learn from.

---

## 14. Design system

Drishti uses the AdmitLabs brand. **No exceptions.**

**Colour: strictly monochrome**

| Token | Hex | Use |
|---|---|---|
| Black | #0A0A0C | Main dark surface |
| Graphite | #1E1F23 | Cards on dark |
| Ivory | #F2E8D6 | Text on dark, main light surface |
| Slate | #8A8D94 | Captions, metadata |

Confirm these hex values against the AdmitLabs brand identity PDF before Phase 1 ends. Greys between black and ivory are allowed. **No accent colour. No green, amber or red. No gradients, no glow.** One exception: the AdmitLabs website (section 22), the `/drishti` product page included (section 15), may use subtle monochrome gradients (black to graphite, soft ivory tones) for light, depth and section transitions; so may the left side of sign up and log in (section 13), in the same Spotlight style. Never colour, neon or glow. The dashboard keeps no gradients, and so does the dashboard drawn on those left sides.

**Type**

- **Bricolage Grotesque** for all headings, text and buttons.
- **Inter** only for numbers that stand on their own: scores, points, prices, counts, percentages and numbers in tables. Always with tabular figures, so numbers line up. Numbers and dates inside a sentence stay in Bricolage, so a sentence reads in one font.
- No other font. Both load from Google Fonts for web. The PDF embeds both font files, committed with their open font licences.
- Hierarchy through size, weight and width.
- Wordmark: "Admit" at weight 800, "Labs" at weight 400. Product name shown as "Drishti by AdmitLabs".

**The Drishti logo**

- "Drishti by AdmitLabs" with the Drishti eye before the word: two lids drawn as an almond within an almond, a round iris, and three short lashes on the upper lid. Drawn once (`src/graphics/eye.ts`) for the screens, the PDFs, the link previews and the favicon, in the text colour, so it works on black and on ivory.
- Three lashes from 20 px up. Smaller (the dashboard sidebar, menus) and in the favicon, the eye stands alone.
- How it moves, monochrome and calm, never a constant loop:
  - **A**, in the dashboard, sign up, log in, onboarding and a shared Audit: the eye opens as it appears, then blinks once every 23 seconds, and once on hover. The lashes follow the lid.
  - **C**, on `/drishti` and the website: the same, and the iris turns gently towards the pointer (on a phone it looks ahead, and a tap blinks).
  - **The Rise reveal**, once, as the intro of the `/drishti` hero and the website's Drishti section (when it comes into view, not on every scroll): the eye, half open, rises from behind the word and peeks over the top of the D, looks left and right, glides down into its place, opens fully and blinks once; then it is C.
  - **Still**: pictures of the product, the Products menu, the PDFs and link previews.
  - With reduced motion turned on, every eye is still and open.
- Favicon: the eye on a black rounded square for the dashboard, sign up, log in and `/drishti`. The website's own pages keep the "AL" mark.
- Motion files: `brand/motion` holds the Rise reveal and the Side reveal (the eye comes out from behind the D) as MP4 and GIF, square and wide, on black and ivory, with and without "by AdmitLabs". `npm run motion:record` makes them again from the development-only stage at `/drishti/motion`.

**Contrast**

Comes from scale, weight, black and ivory surface flips, and inverted highlight blocks. Never from colour.

**Showing Strong, Okay, Weak, Missing without colour**

- In rows and lists: a thin bar of the points earned against the points possible (for example 18/30), then the word. Missing is an empty dashed bar. One style for every result, on screen and in the PDF, so a list reads evenly.
- A part's checks (Discovered, Trusted, Chosen), every one named (rule 11 in section 18; chosen in the product review of October 2026, replacing the squares with a key):
  - Where there's room (the Audit, a program, the team's institution pages, a shared Audit): every check as a row, weakest first (the worst result, then the most to gain): its icon, its name, a thin bar and the word. A program check shows its weakest program. A row opens the check where the page has its panel.
  - Where it's tight (Home, and the part cards in the `/drishti` hero and `/signup` pictures, and "Every check" in the `/drishti` Audit picture): one bar for the part, split by result in four shades (Strong solid, Okay mid grey, Weak dark grey with a thin outline so it stands out at least 3 to 1, Missing a dashed outline), with each count written under its own piece ("2 Strong"), then "Fix first" and the weakest check with its bar and word.
- Readable on black and on ivory. The word is always available: beside the bar, on hover, and for screen readers. Never rely on the shape alone.
- The overall score sits on a large gauge: filled to the score out of 100, with a tick where Needs work (40) and Strong (70) begin, and over each tick what it means, on two lines: "Needs work" over "from 40", "Strong" over "from 70". The number, in Inter, sits centred inside the arc on its baseline, never touching it, with "/100" smaller on the same baseline; "0" and "100" line up under the arc's two ends. A small gauge leaves out the ends, the ticks and their words: the number says it all. The line under it says how far the next band is ("24 points to Strong", "3 points above where Strong starts"). The same drawing on screen and in the PDF.
- Each part card names the question it answers ("Can students find you?", "Do they believe you?", "Is it easy to pick you?") and, with history, how it moved in words ("Up 17 since April"), not a small line.

**Icons and logos**

- Line icons drawn for Drishti (thin strokes, square ends, no icon library): one for each of the 17 checks, the 3 pillars and the main sections. The same icons in the PDF.
- Real one-colour logos only for Instagram, X and YouTube (from Simple Icons, CC0), unchanged and in the colours each brand allows. Source and licence are kept next to the files.
- Every other platform (Google, Google Maps, Facebook, LinkedIn, Reddit, Quora, ChatGPT, Gemini, Perplexity, websites) gets a neutral line icon and its name, until AdmitLabs has permission to use its logo.
- Icons are decoration. The name always sits beside them.

**Charts**

- Hand-built, monochrome: you in the text colour, rivals in grey, each named on the chart. No legend to decode (rule 11).
- Every mark has its number or name beside it: every month's score on the score by month, every month's count on its bar, every point of the Reports card's small line with its value and month. A chart with one point is words instead ("First Audit. The next one shows how the score moves").
- You and your rivals part by part: each part as a ranked list with real names, the score and a thin bar, your row highlighted, and one plain line about the gap ("You lead Silverline College by 6", "3 behind Silverline College"). Three side by side when there is room, one under another on a phone. On screen, in the PDF and in the `/drishti` Rivals picture.
- Month by month, you and your rivals: a table of numbers, your row first and marked, and one line about your place ("2nd of 4 in every month since April"). A phone keeps the last three months.
- The admission year: its stages ahead as one strip, each piece named on its own months with when it runs, the one now in the text colour; one stage a line on a phone.
- Numbers in Inter. Every chart can be read as text or a table too.

**Copy rules**

- Plain language, short sentences.
- **No em dashes or en dashes anywhere** in UI, product page or PDF.
- Numbers always with their source available.

**Quality bar**

- Works on phone. Directors will open it on their phone.
- Dark and light modes both supported (black surface and ivory surface).
- Accessible: readable contrast, keyboard navigation, meaningful labels.

---

## 15. Product page (`/drishti`)

**Premium product landing page, part of the AdmitLabs website** (section 22), rebuilt in its **Spotlight** style on 2026-10-02: the website's header and footer, its light, frames and buttons, and the product itself for pictures. Same design system, with the website's subtle monochrome gradients (section 14).

**Headings are calm and confident** (redesigned 2026-10-03): the hero headline 52 px (30 on a phone), section headings 36 px (28 on a phone), a line under a heading 16 to 17 px. These sizes are the page's own; the website keeps its sizes. No small labels above headings, but a feature's own name: each feature opens with its bar, and the score names the feature it belongs to. Each visual shows something real from the product, never decoration.

**The pictures** are the dashboard's own components, filled from the sample world by the real scoring engine and shown under the website's made-up names: Larkmoor University, Bangalore, with Calderwood College, Brackenfield University and Thornbury College as its rivals (Karnataka, Kannada). Only the names change, never a number, so the website, this page and the sample report agree. They carry no caption. The dashboard's own sample keeps its names.

**Sections, in order:**

1. **Hero**: the product's name with the Drishti eye (its Rise reveal plays once as the intro, section 14), then "See where you stand, who's ahead, and what students want." (two lines on a wide screen) with the last words in an ivory block. "Get your free Audit" and "See the sample report", the trust line and the proof line, then the dashboard's Home in an app window that settles flat as the page moves
2. **The problem** (ivory), one tight band with less space around it than the other sections: "Most teams guess. Drishti checks." with its line beside it (on a wide screen the headline left and the line right, their last lines level), then one wide Drishti card, dense like the dashboard. A top bar with the sample university and when it was last checked, then its answers to the three questions in three panels side by side (two, then the questions across, on a tablet or small laptop; stacked on a phone), each with where it came from: its score (number, thin bar and word) from the Audit's 17 checks of public pages; its place among its rivals, by name in thin rows, from each one's own Audit; the questions students ask most in its city, each on one line with its site and count small on the right ("Quora · 96"); and at the foot of that panel one short line with the search rising fastest and its numbers (Search trends)
3. **The three features**, each in the same frame: a bar with its name (heavy and narrow, with the dashboard's icon), its question and its place ("1 of 3"), which stays under the header while its pictures pass, on a phone too; one short line; then the product across the full width on a dark stage. The Audit with its score gauge, what to fix first and every check; Rivals with the ladder and the latest move, and under them each part ranked across the full width; Demand with the fastest rise by month, what else is rising and the question asked most
4. **The score**, inside the Audit (its label says so): "One score, from 17 checks." Beside the words, the sample's overall score; then a table of the three parts side by side (Discovered, Trusted, Chosen; stacked on a phone), each with its question and its score on a thin bar, and its checks, one to a row, each with its result. A table: every row one height, every bar one width in one place, the result words in one column; the rows line up across the parts, and Trusted, with one check fewer, ends in an empty slot ruled like the rest. A check made for each program shows its weakest program, as the Audit's rows do. The only numbers are the total and the three part scores, which average to it: no points per check. Then, compact, what each result earns
5. **Public data only**: the rules every result follows, in one framed band
6. **How it works**: four steps on a line that fills as the page moves: enter details, Drishti checks everything, see results, get a monthly report
7. **Sample report** (ivory): three of its pages fanned out, and the download of the full sample PDF, marked "Sample report. Fictional data." on every page
8. **Plans**: Free and Paid (₹9,999 for 6 months, no auto-renew), Paid on ivory, then every feature compared
9. **For AdmitLabs clients**: included free, with the team acting on it
10. **FAQ**: data sources, privacy, what "public data only" means, renewal
11. **Final call to action**: "Get your free Audit", under the same light as the top of the page

**Motion**, calm and almost all CSS: sections and headings fade and rise in; each feature's bar holds its place while its pictures pass; the score counts up while its gauge draws; points bars fill; the rivals slide into rank order; Demand's bars grow; the report's pages fan out; buttons, cards and plans answer the pointer. With reduced motion, or no script, everything shows settled.

"Get your free Audit" (and the Paid plan's "Start with a free Audit") leads to `/signup`, then `/onboarding`.

---

## 16. Data model (Postgres)

Starting shape. Claude Code may refine names and types, but must keep the ideas.

| Table | Key fields |
|---|---|
| `institutions` | id, name, type (college, university, skilling), city, state, website, instagram, youtube, other_links (jsonb), claimed (bool), is_prospect (bool), created_at |
| `programs` | id, institution_id, name |
| `memberships` | user_id, institution_id, role (owner, member), guide_closed_at (Start here closed) |
| `team_users` | user_id, role (team, admin) |
| `plans` | institution_id, tier (free, paid, client), starts_at, ends_at, set_by, free_program_id |
| `signals` | id, institution_id, program_id (nullable), provider, check_key, value (jsonb), source_url, fetched_at |
| `audits` | id, institution_id, run_at, kind (free, paid, client, team), overall, discovered, trusted, chosen, config_version |
| `audit_program_scores` | audit_id, program_id, overall, discovered, trusted, chosen |
| `audit_checks` | audit_id, program_id (nullable), pillar, check_key, result, points_awarded, points_max, finding, how_to_fix (and the same as fix_steps, one thing each), difficulty, source_url, checked_at |
| `rivals` | institution_id, rival_institution_id, suggested (bool), added_at |
| `rival_moves` | id, rival_institution_id, kind, description, source_url, detected_at |
| `rival_content` | id, rival_institution_id, platform, url, metrics (jsonb), why_it_worked, month |
| `rival_ads` | id, rival_institution_id, promise, source_url, entered_by, entered_at |
| `demand_pulls` | id, scope (city, state, india), region, program_key, month |
| `demand_items` | id, pull_id, kind (rising, falling, question, worry, mention, season, idea), text, language, count, source_url, found_at |
| `actions` | institution_id, month, rank, text, feature (audit, rivals, demand), effort |
| `done_marks` | institution_id, check_key or thing and month, marked_by, marked_at, checked_by_audit (the first own Audit after a check was marked) |
| `reports` | institution_id, month, storage_path, created_at |
| `notifications` | id, institution_id, kind, text, read, created_at |
| `notes` | id, institution_id, author_id, body, created_at (team only) |
| `team_work` | id, institution_id, kind (done, next), body, work_on (the day it was done, or Next is due), link, added_by, created_at (a Client's work log) |
| `share_links` | token, institution_id, audit_id, created_by, created_at |
| `institution_details` | institution_id, the details added by the institution (section 6), updated_at, updated_by. Never read by scoring |
| `program_details` | program_id, institution_id, the details added for each program (section 6), updated_at, updated_by. Never read by scoring |
| `scoring_config` | version, weights (jsonb), result_shares (jsonb), thresholds (jsonb), labels (jsonb), active (bool) |
| `enquiries` | id, created_at, name, institution, role (founder_director, principal_dean, admissions, marketing, other), email, phone, program, message, handled_at, handled_by (website, section 22) |

**Row Level Security:**
- Institution users only see their own institution's data, filtered by plan.
- Team and Admin see everything.
- Notes are team only.
- A Client's work log: the team reads every log, adds to a Client's in its own name, marks Next as done and removes entries; the Client's own people read theirs while the service is active. No other plan sees one.
- Marks done: people at the institution and the team read them; only the owner adds or takes one back, through `mark_done` and `undo_done`, and only for a check the latest own Audit finds below Strong. Each person closes their own Start here.
- Enquiries: anyone can send one, only through `submit_enquiry` (at most 3 a day from one email). An owner asks for Paid only through `ask_for_paid`, which checks the owner and the plan and keeps one open request per kind; the institution reads its own open request through `open_paid_ask`. Only the team reads Enquiries and marks them handled.
- Rival data is only reachable through the `rivals` link of the viewing institution.
- Plan gating must be enforced on the server, not only hidden in the UI.

**Every signal keeps its source and the date it was checked.** This is how any score point can be explained.

---

## 17. Data providers (slots for later)

Each data source is a **provider** with one shared interface: it takes an institution (and program where needed) and returns signals, each with a value, a `source_url` and a `fetched_at` date.

**In this build, every provider has a mock version** that returns realistic sample data. A single setting switches each provider between mock and real.

| Provider | Feeds | Real source (later) |
|---|---|---|
| `search` | google_search | Search data provider (DataForSEO or SerpApi) |
| `places` | google_profile, review_rating | Google Places API |
| `pagespeed` | mobile_friendly, page_speed | Google PageSpeed Insights API |
| `site_crawler` | fees_shown, program_page, easy_enquiry, admission_steps, placement_proof, faculty_leaders, approvals, rival moves | Website crawl, then Claude reads the pages |
| `instagram` | instagram_activity, students_in_content, rival best content, demand | Instagram Graph API (official access only) |
| `youtube` | youtube, rival best content, demand | YouTube Data API |
| `socials` | other_socials | Facebook, LinkedIn official access |
| `ai_answers` | ai_answers | Asking ChatGPT, Gemini and Perplexity the student's question, each result kept |
| `official_data` | approvals | Official documents (NIRF and others), using Tathya's PDF extraction approach |
| `reddit`, `x`, `quora`, `trends` | demand | Official APIs, checked for terms of use |
| `analysis` | "why it worked", how to fix, demand grouping, content ideas, 3 things to do | Claude API |
| `manual` | rival ads, anything else | Team entry screen |

**Rule: official access only.** No scraping tools that break a platform's terms.

**Not in this build:** real providers, Claude API, Razorpay payments, WhatsApp, email sending, Vercel deployment, domains.

---

## 18. Non-negotiable rules

1. **Public data only.** Drishti checks only what a student or parent could see.
2. **Every point explained.** Every result shows what was found, the source and the date.
3. **Learn, never copy** rival content.
4. **Rivals never know** who tracks them.
5. **Grouped only** for Demand. No individual students.
6. **Official access only** for every platform.
7. **Plan limits enforced on the server.**
8. **Monochrome. Bricolage Grotesque for words, Inter for numbers that stand on their own.** No em dashes or en dashes.
9. **Opportunity, not shame** in every piece of copy.
10. **No discounts** on any plan.
11. **Readable at a glance**, everywhere: the dashboard, the PDFs, a shared Audit and the pictures of the product on `/drishti` and the website.
    - No shape, dot, square or colour without a name or number right next to it.
    - No chart that needs a key to understand.
    - If a person can't understand it in 3 seconds, simplify it.
12. **Empty states that help.** Anything that can be empty says why it is empty, what to do about it, and when it fills: no rival suggestions yet says where suggestions come from and how to add rivals; no alerts yet says what arrives and when; a new prospect on the team side says what to do first. A set of tabs opens on one with something in it.

---

## 19. Build phases

Stop at the end of each phase for review. Do not start the next phase without approval.

| Phase | What gets built | Done when |
|---|---|---|
| 1. Foundation | Project setup, design system (tokens, type, core components), Supabase schema and RLS, email OTP login, roles and tiers, provider interface with mocks, sample data | App runs locally, can log in, sample institutions visible, design system page shows all components |
| 2. Audit | Onboarding, scoring engine with tests, Audit screens, program view, check detail, what's working, what to fix, plan gating, history | A sample institution can onboard, run an Audit on mock data, and see correct scores on Free, Paid and Client |
| 3. Rivals | Rival suggestions, pick and change rules, head to head, moves, best content, manual ad entry, alerts | Rivals works end to end on mock data with correct plan gating |
| 4. Demand | Shared pulls by region and program, region switch, all 6 outputs, spike alerts | Demand works end to end on mock data with correct plan gating |
| 5. Report | Monthly PDF, storage, reports list, manual trigger | A Paid sample institution can download a correct, on-brand PDF |
| 6. Team tools | Team area, bulk Audit, notes, share links, tier control, manual refresh | Team can take a prospect from bulk Audit to shared link |
| 7. Product page | `/drishti` landing page | Page complete, on brand, works on phone |

**After phase 7:** the AdmitLabs website (section 22), in the same app, so the website, the product page and the dashboard share one design system, one set of fonts and one deploy.

**Later (not now):** connect real providers one by one, Claude API for analysis, Razorpay, reminders by email, WhatsApp, deployment to Vercel with admitlabs.in (the website and /drishti) and app.admitlabs.in.

---

## 20. Sample data

Fictional only. No real institution names.

- 8 institutions in Assam: 3 colleges, 2 universities, 3 skilling institutes. Mostly Guwahati, some in other Assam cities.
- Programs such as BBA, MBA, BCA, B.Com, Nursing, Hotel Management, Digital Marketing, Data Analytics.
- Use `.example` domains for websites (for example `northbank-college.example`).
- A spread of scores: some Strong, some Needs work, some Getting started.
- Fixes marked done: one the next Audit confirmed, one it did not find yet, one still waiting.
- 6 months of Audit history for at least 2 institutions.
- Rival scores and Demand pulls from April to September 2026, so the month by month charts have 6 months too.
- Details added by some institutions, for themselves and their programs.
- Rivals set up between them, with moves, best content and ads.
- Demand pulls for Guwahati, Assam and All India across the sample programs, in English, Hindi and Assamese.
- One institution on each tier: Free, Paid, Client. Plus 2 prospects visible only to the team.
- Sample users: one owner per institution, one team user, one admin.

---

## 21. Open items (not decided yet)

- WhatsApp summary of the monthly report (later)
- Email reminders for plan end (later)
- Whether AdmitLabs serves two direct rivals for the same program in the same city (services decision)
- Moving thresholds from fixed rules to peer comparison (after enough Audits)
- Final hex values, confirmed against the brand identity PDF

---

## 22. AdmitLabs website (admitlabs.in)

The main AdmitLabs website, built in this app (section 4), in the **Spotlight** style chosen on 2026-10-02: premium and calm (think Linear, Vercel, Resend, Attio, Raycast). Black with soft light from above, ivory surfaces for the moments that matter, fine frames with small cross marks, a light grain where light falls, and crafted pictures of what students actually see. It turns a visitor into a free Audit or an enquiry.

**What AdmitLabs is:** an education only content partner. Three services (content only, never ads) and two products: Drishti for institutions and Tathya for students.

**Pages:** the home page (`/`), Work with us (`/work-with-us`) and the product page (`/drishti`, section 15, in the same style). One header on every page: Services, Products (a small menu: Drishti, with its eye, still, before the name, and Tathya, which opens mytathya.in in a new tab), How we work, FAQ, "Work with us" and "Get your free Audit" (a menu on a phone, with both products); clear over the light at the top, glass once the page moves. The logo and the buttons keep clear of the frame's lines and crosses, on a desktop and on a phone. One footer: "© 2026 AdmitLabs" (the current year), the email, Drishti and Sign in. Every "Get your free Audit" leads to sign up (`/signup`); Sign in leads to log in (`/login`).

**Home page sections, in order:**

1. **Hero**: "Get discovered, trusted, and chosen." in two lines (80px on a desktop), falling from ivory to warm grey, centred on black under a soft cone of light, inside a fine frame with small crosses. One short paragraph, two buttons ("Get your free Audit" and "Work with us"), and the quiet proof line "120+ education companies worked with." No picture, no labels
2. **The system** (ivory): one dark stage where the three moments happen in the order a student lives them: a search where the institution is the answer (an AI answer and the top result), a review and its proof, and an enquiry that someone receives. Under each, its words set like a caption: Discovered, Trusted or Chosen, its line, and what Drishti checks. Then "Measure. Fix. Repeat." as one sentence on one track, with a dot that travels it. On a phone each moment gets its own small stage
3. **Services**: three chapters, each laid out its own way around what that service makes: Program Growth beside a program's own page (a browser, and the phone in front; on a phone, the phone alone); Institution Branding on a stage of phones (the official page's posts, a reel, a YouTube film); Admit Campaign beside its season, planned week by week, with this week's posts. Instagram and YouTube appear only as their official one colour logos. Each links to the form with the service named. "We create content. We don't run ads." No prices
4. **Drishti**: under one small label, "Product", the only one on the page, its name with the Drishti eye (its Rise reveal plays once when the title comes into view, section 14); its three numbers (17 checks, 5 rivals, 1 report), its three questions as a short list beside the product itself, a made up institution's Home in an app window, then "Free to start." with "Get your free Audit" and "Explore Drishti"
5. **Who we work with** (ivory): private colleges, private universities, and skilling and training institutes, set large as a staircase, for professional and career programs
6. **Our work**: content samples. Hidden until there are samples (`src/site/work.ts`) and `SITE_SETTINGS.showWork` is on
7. **How we work**: the promise held on the left; Audit, Blueprint, Run and Report on a line that fills as the page moves. No numbers
8. **Tathya**: its name with "For students" under it, one line, and "Explore Tathya", which opens mytathya.in in a new tab, in a framed band
9. **FAQ**: ads, who we work with, who owns the content, whether Drishti is free, how to start
10. **Final call**: "See where you stand this month." under the same light as the top of the page, with both buttons

**Rules:**

- Say only who we work with, never who we don't.
- No service prices on the website. No discounts.
- No small labels above headings (the one exception: "Product" above Drishti by AdmitLabs), no numbered steps, no icons in boxes, and no two sections built the same way.
- The pictures show a made up institution, Larkmoor University, in Bangalore, with made up neighbours (Calderwood College, Brackenfield University, Thornbury College): none is a real institution, and none of it is Drishti's own sample data (`src/site/scenes.ts`). They carry no caption.
- Gradients: subtle and monochrome only (black to graphite, soft ivory tones), for light, depth and transitions. Never colour, neon or glow. The website and `/drishti` only (section 14).
- Motion is CSS only, with no animation library: the light and frame come in on load, sections fade and rise in, the moments and pictures play their details as they scroll into view, a dot travels the loop, and buttons, cards and links answer the pointer calmly. With reduced motion nothing moves and everything shows settled. Lighthouse near 90 on a phone.
- Works on a phone, with no stretched cards.

**Work with us:** the same style (light from above, the frame), the words on the left and the form on an ivory card. Name, institution, role (Founder or director, Principal or dean, Admissions, Marketing, Other), email and phone are required; the program to grow and a message are optional. Then "Thanks. We'll reply within one working day." Each enquiry is saved to `enquiries` (section 16) and shows in the team's Enquiries list (section 13). No emails are sent. A hidden field turns bots away, and one email can send at most 3 a day.

**Search and sharing:** every page has its own title, description and link preview image (1200 by 630: the headline in the hero's light and frame, with the proof line).

**Settings** (`src/config/site.ts`): `showWork`, `tathyaUrl` and the contact email.
