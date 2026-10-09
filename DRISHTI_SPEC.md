# Drishti by AdmitLabs: Product Spec

Version 2.0 | 4 October 2026 | Owner: Manprit, AdmitLabs

This is the single source of truth for building Drishti. If something is not in this spec, ask before deciding. Values marked **[ADJUSTABLE]** are starting values and must live in config, not be hard-coded.

**Version 2 (October 2026)** builds the product around one line: what the internet says about you. The Audit is organised by place, three scores out of 100 with their words replace the big score, rivals come from your city, Demand picks 3 things to make each month, AdmitLabs clients get Leads, a short email arrives with each new Audit or month, the AdmitLabs team can review an Audit before the college sees it, and Paid is ₹9,999 + GST per month, or ₹24,999 + GST for 3 months (from 5 October 2026; it was ₹24,999 + GST for 6 months). Version 1 (30 September 2026) is in the git history. **The Client Brain** (8 October 2026, section 26) gives each AdmitLabs Client one living knowledge base, built at onboarding and kept with the team. **The Blueprint** (8 October 2026) puts the plan AdmitLabs makes for each Client first in its Brain, as PDF versions the college approves.

---

## 1. The product

**One line:** Drishti shows a college what the internet says about them, who's ahead in their city, and what students want. AdmitLabs clients also see their enquiries.

**Who it's for:** Private colleges, private universities and skilling institutes. Users are directors and founders, marketing heads, and admission heads.

**Four features:**

1. **Audit** (section 7): "What does the internet say about us?" Checks the institution's public presence place by place: its website, Google, social media, what people say and other places. Each place shows what was found, what's good and what to fix.
2. **Rivals** (section 8): "Who's ahead in our city?" Tracks 3 to 5 institutions in the same city, compared place by place.
3. **Demand** (section 9): "What do students want?" Which programs students in the city want, what they ask, what content gets their attention, and 3 things to make this month.
4. **Leads** (section 23, AdmitLabs clients only): "What did our content bring in?" The enquiries their content brings, link by link.

Every month Paid and Client also get a short **monthly summary** by email (section 24) and a PDF report (section 12); Free gets a short email when its free Audit is ready. The AdmitLabs team can check each new Audit and summary before it goes out (section 25). Each AdmitLabs Client also has a **Brain** (section 26): everything the team needs to work for it, in one place the college and the team keep together.

**Two surfaces:**

| Surface | Final address | What it is |
|---|---|---|
| Product page | admitlabs.in/drishti | Premium product landing page |
| Dashboard | app.admitlabs.in | Premium SaaS dashboard, Drishti inside. Future AdmitLabs institution tools will live here too |

**Role in the AdmitLabs business:**

```
FREE       "Here's what the internet says about you."
PAID       "Here's what's changing every month."
SERVICES   "We'll fix it for you."
```

The AdmitLabs team also uses Drishti internally to find, pitch and serve clients.

---

## 2. Build approach

- **Build the whole product on sample data first.** Every screen, result, report and plan rule must work end to end on sample data.
- **External connections come later.** Every data source gets a clear slot (a "provider") with a mock version now. Real versions plug in later, one by one, without rebuilding anything else (section 17).
- **Build order:** version 1 went Foundation, Audit, Rivals, Demand, Report, Team tools, Product page. Version 2 goes data and mock providers, Audit, Rivals, Demand, Leads, Home with the summary, the PDFs and pricing, then the product page, the website and the pictures on sign up and log in (section 19).
- **Not in this build:** real data collection, Claude API calls, payments, WhatsApp, real email sending (email goes only to the local test inbox), deployment of the dashboard. See section 17.

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
| Email (this build) | Sent only to the local test inbox that local Supabase runs (Mailpit). No email library |
| Scoring | Pure functions: data in, score out. No database calls inside the engine |
| Tests | Node's built-in test runner |
| Hosting (later) | Vercel |

**Development machine is Windows.** Project lives at `D:\Drishti`. All scripts must work on Windows.

---

## 4. Routing

One Next.js app, two addresses. Which pages answer depends on the address a request comes to (`src/lib/hosts.ts`, applied by `src/proxy.ts`).

| Address | What it serves |
|---|---|
| admitlabs.in | The AdmitLabs website (section 22), the product page at `/drishti` and the Leads enquiry forms at `/enquire/...`. Dashboard paths move to the dashboard's address |
| app.admitlabs.in | The dashboard (the routes below). `/drishti` moves to the website's address |
| www.admitlabs.in | Moves to admitlabs.in for good |

| Route | Surface |
|---|---|
| `/` (website) | AdmitLabs home page |
| `/work-with-us` (website) | Work with us: the enquiry form |
| `/drishti` (website) | Product page |
| `/enquire/[code]` (website) | The enquiry form a Client's tracking link opens (section 23). Not indexed |
| `/talk/[code]` (website) | The Talk to us form (Work with us) a team tracking link opens; what it sends is tagged with the link's source (section 27). Not indexed |
| `/signup` | Sign up: email, then a 6-digit code. A new email gets an account; one that has an account is simply signed in |
| `/login` | Log in: the same email code, for an account that exists or someone invited. It never says whether an email has an account, and never creates one for anyone else |
| `/onboarding` | Institution setup |
| `/` (dashboard, logged in) | Dashboard home |
| `/audit`, `/audit/[programId]` | Audit |
| `/rivals`, `/rivals/[rivalId]` | Rivals |
| `/demand` | Demand |
| `/leads` | Leads (Client only), with its CSV download |
| `/brain`, `/brain/help` | The Brain (Client only, section 26) and Help us know you |
| `/reports` | Monthly summaries and PDF reports |
| `/plan` | Plan and access |
| `/settings` | Institution details, users |
| `/team/...` | AdmitLabs team area (team roles only), including Enquiries |
| `/share/[token]` | Shared Audit link for prospects (read only, no login) |

**Website first.** Until Drishti opens, production runs with the dashboard closed (`NEXT_PUBLIC_APP_OPEN=false` in `.env.production`): every address shows the website, app.admitlabs.in moves to admitlabs.in, `/signup` and `/login` keep their left side and say "Drishti opens soon." with a "Talk to us" email button, every "Get your free Audit" and plan button on the website and `/drishti` says "Talk to us" and opens `/signup`, the header’s (and phone menu’s) "Sign in" opens `/signup` and its "Talk to us" writes to hello@admitlabs.in, the footer’s "Sign in" opens `/login`, the two pages link to each other and their logo goes to the home page, Work with us offers an email instead of the form, and every other dashboard route is not found, `/enquire/...` included. Nothing in production reads a database.

The addresses are settings in `.env` (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PRODUCT_URL`), with the live ones in `.env.production`, so moving them is a config change only. Locally the website is http://admitlabs.localhost:3000 and the dashboard http://localhost:3000. The website's pages live at `/site` inside the app. Search engines may crawl only the website's address (`robots.txt`), which lists its pages in `sitemap.xml`.

---

## 5. Users, roles and plans

**Roles**

| Role | Who | Can do |
|---|---|---|
| Owner | Institution user who signed up | Everything for their institution, invite members |
| Member | Invited institution user | View everything their plan allows |
| Admin | AdmitLabs leads | Everything in the team area, plans, and the Team page (adds and removes people, sets levels) |
| Team member | AdmitLabs staff | Everything in the team area except plans and the Team page |
| Client manager | AdmitLabs staff who look after some Clients | Only the Clients assigned to them, and the Enquiries they own (section 27) |

**Plans (tiers)**

| Tier | Who | Cost | Length |
|---|---|---|---|
| Free | Any institution | ₹0 | Ongoing |
| Paid | Non-clients | ₹9,999 + GST per month, or ₹24,999 + GST for 3 months | 1 month or 3 months from the day Paid starts |
| Client | AdmitLabs service clients | Included, with Leads | While the service is active (set by Admin) |

Paid rules:
- One paid plan, Paid, billed for one of two periods (decided 5 October 2026; until then one period of 6 months at ₹24,999 + GST). No yearly plan.
  - **Monthly:** ₹9,999 plus GST, written "₹9,999 + GST per month".
  - **3 months:** ₹24,999 plus GST, written "₹24,999 + GST for 3 months", with "Save 17%" beside it (worked out from the two prices: 3 monthly payments would be ₹29,997).
- **No discount codes or offers.** The 3-month price is a fixed plan price.
- Both prices live in one place in config (`PLAN_RULES.paid.periods` in `src/config/plans.ts`); everything else reads them from there.
- A toggle "Monthly | 3 months" shows one price at a time on `/drishti` and the Plan page. 3 months shows first. It is a radio group (Tab, then the arrow keys) and each option is at least 44 px tall on a phone.
- Starts on the day the institution signs up for Paid. In this build an Admin switches it on that day, for the period they paid for; payment comes later. The plan ends 1 month or 3 months after its start, by the period.
- **No auto-renew.** Reminders (in-app now; email later): on Monthly, 7 days before the end; on 3 months, 30 days before the end, then 7 days before. "Renew now" shows from the first reminder, and the team's "Paid ending soon" follows the same days.
- When a paid plan ends, the institution drops to Free. They keep seeing their last Audit.

In this build, Admin sets an institution's tier manually. Payment comes later.

**Names.** Each person adds their name once: a college's people in Settings, Team, and AdmitLabs staff on the Team page. The Brain's History shows it, or the email when there is none.

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
8. Facebook (optional). LinkedIn is not asked: it has no official public access, so Drishti cannot check it

In Settings, the owner can also add the institution's **Google Maps listing** (optional): the link from the listing's Share button, or the listing page. The Audit's Google profile and review checks then read that listing, so the rating and reviews are always the institution's own.

After onboarding, Free users pick the **one program** their Free Audit covers. The last step says what happens next: Drishti checks what a student would see (about a minute) and the AdmitLabs team looks it over (section 25); then it shows Discovered, Trusted and Chosen, what it found in each place and the first things to fix, with an email when it is ready; and the next free Audit comes in 3 months. Then Home opens, with Start here (section 13).

**Details added by you (Settings, every plan).** All optional and short.

- About the institution: year founded, NAAC grade, NIRF rank and its year, AICTE approval, UGC recognition (or skilling recognition), other approvals, campus address, admissions phone and email, hostel, scholarships, and what makes it different.
- For each program: its level (certificate, diploma, undergraduate, postgraduate or doctorate), duration, fees, seats, eligibility, specialisations, placements (year, share placed, average and highest package, top recruiters), application dates, the program page and its highlights in a line. For a Client, the Brain also marks the programs to push most.
- Labelled "Added by you" wherever they show. Used for context, better how to fix advice, the ready fixes (section 7.7) and the monthly report. **Never part of the score.**
- The owner edits them. Members and the AdmitLabs team can read them; for a Client they edit them too, from the Brain (section 26), where they are the same facts, marked "Also in Settings". Rivals never see them.

---

## 7. Feature 1: Audit

### 7.1 Purpose

Answers: **"What does the internet say about us?"** Public information only: the same things a student or parent would see. Organised by **place**, not by score.

### 7.2 Places and checks

Five places, in this order. Every check sits in one place and feeds one of the three words (7.4). What people say and Other places hold findings instead of scored checks.

| Place | What it covers | Checks: key, name on screen (word it feeds, level) |
|---|---|---|
| Website | Program pages, fees, placements, admission steps, enquiry, mobile, speed, approvals, faculty | `program_page` Program pages (Chosen, program); `fees_shown` Fees (Chosen, program); `placement_proof` Placements (Trusted, program); `admission_steps` Admission steps (Chosen, program); `easy_enquiry` Enquiry (Chosen); `mobile_friendly` Mobile (Chosen); `page_speed` Speed (Chosen); `approvals` Approvals (Trusted); `faculty_leaders` Faculty and leaders (Trusted) |
| Google | Search results as seen from the institution's city, the Google profile, reviews and rating, AI answers | `google_search` Search from [city] (Discovered, program); `google_profile` Google profile (Discovered); `review_rating` Reviews and rating (Trusted); `ai_answers` AI answers (Discovered, program) |
| Social media | Instagram, YouTube and Facebook: how active, and what's working | `instagram_activity` Instagram (Discovered); `youtube` YouTube (Discovered); `other_socials` Facebook (Discovered); `students_in_content` Students in your posts (Trusted) |
| What people say | Reddit, Quora and forums: what's good, what's bad, and questions nobody answered | Findings, not scored |
| Other places | News, college listing sites and directories | Findings, not scored |

These are the same 17 checks as version 1. Their keys stay; their names on screen change. `other_socials` now checks Facebook only.

**Program-level** checks are scored separately for each program. The rest are **institution-level**: scored once and shared by all programs.

**Findings** (What people say, Other places) are things Drishti found about the institution, each with its proof: a question on Quora nobody answered, a good thread on Reddit, a listing with old fees, a news story. Never a person: one short line in Drishti's words, the link and the date, never the author's name or profile.

### 7.3 Rules by institution type

- **College and University:** `approvals` means official data and approvals such as NIRF, NAAC, AICTE, UGC.
- **Skilling institute:** `approvals` means skilling recognition instead. Google profile and reviews count more. YouTube and AI answers count less. See weights below.

### 7.4 The three words, and the score behind them

The top of the Audit, Home, the summary and the report show the three, each as its score out of 100 ("79/100", in Inter) with a thin bar and its word (Strong, Okay or Weak) small beside it, so the number means something at a glance (decided 5 October 2026; until then the words stood alone):

| Word | Question |
|---|---|
| Discovered | Can students find you? |
| Trusted | Do they believe you? |
| Chosen | Is it easy to pick you? |

The words read Discovered, Trusted and Chosen, like the website's promise ("Get discovered, trusted, and chosen."). For a while they were called Visibility and Trust; the names came back on 9 October 2026. The database and the code keep their keys (`discovered`, `trusted`, `chosen`).

Each shows **Strong, Okay or Weak**, from its part's score **[ADJUSTABLE]**:

| Part score | Word |
|---|---|
| 70 to 100 | Strong |
| 40 to 69 | Okay |
| 0 to 39 | Weak |

**The overall score stays in the background.** It works as in version 1, so months stay comparable. It shows small, as a number without a word, only in Progress (on the Audit), the Rivals ranking and the monthly report, and on the AdmitLabs team's own screens. There is no big gauge anywhere. Discovered, Trusted and Chosen show as numbers out of 100 everywhere they appear: Home, the top of the Audit, the Rivals ranking, Progress, Reports, the PDFs, the emails, a shared Audit, and the pictures of the product on `/drishti`, the website, sign up and log in.

Each check gets a result: **Strong, Okay, Weak or Missing**.

| Result | Share of the check's points **[ADJUSTABLE]** |
|---|---|
| Strong | 100% |
| Okay | 60% |
| Weak | 30% |
| Missing | 0% |

Each part is out of 100. Weights **[ADJUSTABLE]**:

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

- Part score = sum of (check weight × result share). Rounded to a whole number.
- Program score = average of its three part scores.
- Institution overall score = average of all its audited program scores. Institution part scores = average of program part scores.
- Each part's word comes from the table above.

What people say and Other places are **not scored** in this version: a small college with little said about it is not marked down, and the score stays comparable with past months. They may join the score later (section 21).

The engine must be one pure function (plus helpers) that takes check results and config and returns all scores, words and impacts (7.7). Fully covered by tests. Inside the code and the database the parts keep their version 1 keys (`discovered`, `trusted`, `chosen`); only the words on screen change.

### 7.5 What counts as Strong, Okay, Weak, Missing

Fixed rules for now **[ADJUSTABLE]**. Later these move to comparison with peers (same type, same region), once enough institutions are audited. Build the threshold logic so this switch is possible.

**Discovered**

| Check | Strong | Okay | Weak | Missing |
|---|---|---|---|---|
| google_search | Top 3 results, searched from the institution's city | Rest of page 1 | Page 2 | Not in top 20 |
| instagram_activity | 3+ posts a week, mostly reels | 1 to 2 a week | Less than once a week | No account |
| google_profile (College / University) | 100+ reviews | 30 to 99 | 1 to 29 | No profile |
| google_profile (Skilling) | 50+ reviews | 15 to 49 | 1 to 14 | No profile |
| youtube | New videos every month | Posted in last 3 months | Older | No channel |
| ai_answers | Named by 2+ AI assistants | Named by 1 | Only when asked by name | Not known |
| other_socials (Facebook) | Posts every month | Occasional | Inactive | No page |

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

### 7.6 What each place shows

Each place shows three things, in this order:

1. **What we found.** Every check in the place with its result (a thin bar and the word), and every finding. Each with its proof: the link, the date it was checked and one short line of what Drishti saw ("The BBA page says “Contact us for fees”."). No screenshots. A check whose programs differ shows its weakest program by name.
2. **What's good.** What is Strong everywhere it applies, and the good findings, one line each, best first.
3. **What to fix.** Every check below Strong anywhere, and every finding with something to do, ranked by impact, then the quicker fix first.

A check is in exactly one of What's good and What to fix, so the two counts add up to the checks in the place. A place with nothing to fix says so, and what keeps it there.

**When little is found.** What people say is often thin for small colleges. With fewer than 3 findings in the last 3 months it says "Not much said about you yet.", why that is common, what helps (answer the questions students ask on Quora, ask students to share their experience) and when Drishti looks again. Other places says "No listings found yet." the same way. Neither counts against the institution.

### 7.7 A fix

Every fix has, in this order:

- **Its name**: what to do ("Show your full BBA fees"), the same on Home, the Audit, a shared Audit and the report. A name fits what was found: with no reviews yet, "Get your first Google reviews".
- The place and the check, as a small label.
- **What we found**: the proof (link, date, what we saw), program by program for a program check.
- **Why it matters** to a student, in one or two plain sentences.
- **Simple steps**: 2 to 4 short numbered steps, one thing each.
- **A ready fix to copy**: text (a Google profile description, a reply to a review, an answer to an unanswered question, a caption) or a layout (a fee table, a program page outline, admission steps with dates), with a Copy button. It uses the details added by you (section 6) where there are any, and leaves a blank in [brackets] where Drishti does not know. Never copied from a rival.
- **Effort**: Quick, Medium or Big (stored as easy, medium, hard).
- **Impact**: High, Medium or Low, instead of points.
- **Mark as done**, and **Let AdmitLabs fix this** on Free and Paid (below).

**Impact [ADJUSTABLE].** From the points the fix could add to its part, out of 100: High 12 or more, Medium 6 to 11, Low under 6. A finding's impact comes from simple rules: a question about you that nobody answered is Medium; the same complaint 3 times or more is High; a listing with old details is Medium; a missing listing is Low. The points stay in the background, for the order.

**Mark as done.** The owner marks a fix done, on Home, the Audit or its panel. The next own Audit checks it: it moved up ("Confirmed: Fees is Strong now") or it did not yet (with what the Audit still found). A finding is checked again too: the question now has your answer, the listing shows the right fees. Any other thing (a rival lesson about a post, an idea marked as made) is kept with its month. People at the institution and the AdmitLabs team see what was marked; only the owner marks or takes a mark back.

**Let AdmitLabs fix this.** On every fix, for Free and Paid; not on Client, where the team already works on it. The owner clicks once and a request lands in the team's Enquiries with the institution and the fix, by name and place. Asking again for the same fix while a request is open sends nothing new, and the button says when it was sent ("Sent on 4 Oct. AdmitLabs will write to you."). Members see that it was sent. No price is shown and no email is sent: the team writes back.

### 7.8 Audit output

What the user sees after an Audit, in order:

1. **The three words**: Discovered, Trusted and Chosen, each with its question and what holds it back most ("Fix first: Fees"). With history, how each moved, in words ("Up from Okay in June").
2. **Fix these first**: the top 3 fixes across every place, by impact.
3. **The five places**, each as in 7.6.
4. **Progress** (Paid and Client): a table, month by month, of the score (small), the three words, your place among your rivals and what moved, with every Audit folded below.
5. **By program**: the same view for each program.

A new Audit may first wait for the AdmitLabs team's review (section 25). Until it is approved the college keeps its last approved Audit and sees "Your Audit is being checked by the AdmitLabs team".

### 7.9 Tone

A weak result is an opportunity, not a failure. Copy must say "here's what to fix," never "you are failing." No shaming language anywhere.

---

## 8. Feature 2: Rivals

### 8.1 Purpose

Answers: **"Who's ahead in our city, and what are they doing?"** Public information only.

### 8.2 Who counts as a rival

- **Always your city.** Drishti suggests institutions in the same city that offer at least one of the same programs, of any type, most shared programs first (up to 6).
- **Nearby city.** If the city has fewer than 3 such rivals, Drishti also suggests some from the nearest bigger city (set for each city in the city list), each marked "Nearby city" wherever it shows.
- The institution picks **3 to 5**, or adds its own (name, city, website, Instagram). One from another city is marked "Nearby city" too.
- Rival institutions are stored as regular institution records that nobody has claimed. If a rival later signs up, they claim that record.

### 8.3 What it tracks

| Area | Tracked |
|---|---|
| The same places | Each rival's own monthly Audit: the same places, checks and rules as yours. Rival scores come only from these |
| Alerts | New programs, fee changes, new pages, admission dates, started ads, and a big jump in Google reviews (20% or 15 reviews more in a month **[ADJUSTABLE]**) |
| Ads | What rivals promise in their ads. **Entered by the team for now**; each entry also makes a "started ads" alert |
| Best content | Each rival's top posts of the month (Instagram, YouTube), with a short "why it worked" |
| Reviews | Google rating and its trend |

### 8.4 Output

1. **One line for the month**: "This month, Silverline College is ahead on Instagram and Google reviews." It names the rival ahead of you on the most checks and the two checks where it leads by the most. With nobody ahead anywhere: "This month, no rival in Guwahati is ahead of you on any check."
2. **The ranking**: you and each rival, with the small score and the three words. Nearby city marked.
3. **Place by place**: the five places, you and each rival. Website, Google and Social media say who leads, with each side's results. What people say and Other places show what was found for each side (good, bad, unanswered; listings, news), with no leader. Each place opens check by check: what was found for each side, with the source and date, and what to learn from the one ahead.
4. **What to learn from them**: 3 lessons a month. Take the idea, never copy.
5. **Alerts**: the last 30 days, newest first, each with where it was found.

One rival's page: you and them place by place, their alerts, their best posts and what to learn from them, when their admissions open, and their Google rating and its trend.

### 8.5 Rules

- **Learn, never copy.** Drishti never suggests copying a rival's content.
- **Rivals never know.** No one can see who is tracking them.
- **Your city first.** Rivals from another city only when the city has fewer than 3, and always marked.

---

## 9. Feature 3: Demand

### 9.1 Purpose

Answers: **"What do students in our city want right now?"** Public sources only. **Not connected to Tathya.**

### 9.2 Input

Nothing new. Uses institution type, city and programs. Demand is about the institution's **city**. When the city has too little data for a program, the state's fills in, and the page says so. There is no region switch.

### 9.3 Sources

Google Trends, a keyword tool (search counts), YouTube, Instagram, Reddit, and Quora and forums through the search tool. Languages to start: English, Hindi, Assamese (shown in English, with the language named).

### 9.4 Output

1. **Make these 3 this month**, at the top: 3 ideas picked for the institution. Each says what to make, why (how often students asked, or that it is rising), the program, the format (a post, a reel, a video, an FAQ or a web page), a hook line, 3 to 4 key points, and Mark as made. Picked from what is asked most, that the institution's website and posts do not answer yet, one per program where possible. Picked with each monthly update and kept until the next. After the next update: "You made 2 of 3. These are still rising: ..."
2. **Program signals**:
   - Programs rising and falling in the city.
   - Courses students ask for that the institution does not offer.
   - What students ask about each program: fees, placements, scholarships, hostel and careers (and any new topic found), each with its top questions and their sources.
3. **Content signals**:
   - Topics and formats that get attention in the city, among institutions like this one.
   - The best months to post, for each program.
4. **More ideas**: the month's other ideas, each built on a real student question, with its source.

### 9.5 Honest numbers

A number shows only when a source gives a real count: searches a month (keyword tool), questions counted on Reddit, Quora and forums. Otherwise words **[ADJUSTABLE]**: "Rising fast" (up 40% or more), "Rising" (up 10% to 39%), "Steady", "Falling". Never a made up figure.

### 9.6 Rules

- **Grouped only.** Never show or store individual students' names or profiles. Store the topic, the count and the source link, not the person.
- **Source shown** for every insight.
- **Shared pulls.** Demand data is collected once per city + program (and state, where it fills in) and shared by every institution that needs it. This keeps running costs low.

---

## 10. What each plan sees

| | Free | Paid | Client |
|---|---|---|---|
| **Audit** | | | |
| Discovered, Trusted and Chosen | Yes | Yes | Yes |
| Every place: each check's result | Yes | Yes | Yes |
| What we found, with proof | For its top 3 fixes and strengths | Everything | Everything |
| What's good | Top 3 | Full | Full |
| What to fix: steps, ready fix, effort, impact | Top 3 | Full ranked list | Full ranked list |
| What people say and Other places | A preview | Yes | Yes |
| Programs | 1 | All | All |
| Progress month by month, with the score | No | Yes | Yes |
| Let AdmitLabs fix this | Yes | Yes | No: the team already works on it |
| **Rivals** | | | |
| Suggested rivals, your city first | Yes | Yes | Yes |
| Ahead or behind each rival | Yes | Yes | Yes |
| This month's one line | Yes | Yes | Yes |
| Ranking, place by place, what to learn, alerts | A preview | Yes | Yes |
| Change rivals | No | Once a month | Anytime |
| **Demand** | | | |
| Make these 3 this month | The first one, for its program | All 3 | All 3 |
| Programs rising and falling | 1 | All | All |
| Everything else | A preview | Yes | Yes |
| **Leads** | No | No | Yes |
| **Brain** (section 26) | No | No | Yes |
| **Other** | | | |
| Alerts (rival moves, demand spikes) | No | Yes | Yes |
| Email when a new free Audit is ready | Yes | No: the monthly summary covers it | No: the monthly summary covers it |
| Monthly summary by email | No | Yes | Yes |
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
| Make these 3 | With each monthly update | With each monthly update | With each monthly update |
| Audit ready email | When each free Audit is approved | No | No |
| Monthly summary by email | No | On the 1st | On the 1st |
| Leads | | | An alert email for each new enquiry, straight away |

- Monthly run date = same day of the month as the signup (or plan start) date.
- With Review first on (section 25), a new Audit, the month's summary and report, and the emails that go with them wait for the team's approval. Alerts for new enquiries never wait.
- Free users get a nudge when a new free Audit is available: "Your new Audit is ready. See what changed." It opens What changed on Home (section 13), for every plan.
- Leads past the institution's keeping time are deleted for good, checked every day (section 23).
- In this build, schedules run against mock providers. Build a way to trigger any scheduled run by hand for testing.

---

## 12. Monthly report (PDF)

- One PDF per institution per month, made on the 1st for the month just ended. Downloadable from `/reports`. Paid and Client only. After a Paid plan ends, past reports stay downloadable.
- With Review first on, the report and its summary wait for the team's approval (section 25) before they show on Reports or go by email.
- Stored in Supabase Storage.
- Same brand as the dashboard (section 14): the three words, each result as a thin bar with the word, the place and check icons, impact and effort as words, and bars for how often a question is asked. The score shows small, on the summary page and in the progress table.

**Contents, in order:**

1. Cover: institution name, month, Discovered, Trusted and Chosen
2. This month in short: the monthly summary (section 24)
3. What the internet says: each place, what's good and what to fix, with proof
4. What to fix: the top 5 in detail (steps, the ready fix, effort, impact), the rest as a short ranked list
5. Rivals: the month's one line, the ranking with the small score, place by place, alerts
6. Demand: Make these 3, programs rising and falling, what students ask, the best months
7. Leads (Client): "Your content brought 23 enquiries in September.", by link. Counts only, never a student's details
8. Progress and sources: the score and the three words month by month, the sources and dates checked

Details added by you show next to the fix and the program they relate to, labelled, never scored. Paid (not Client) ends with one quiet line: "Want AdmitLabs to do this for you? hello@admitlabs.in"

Keep it short enough to read in 5 minutes: about 7 pages, never more than 8.

---

## 13. Dashboard screens

**Premium SaaS design.** Calm, spacious, confident. Think the best analytics products, in strict monochrome.

**Institution screens**

| Screen | Contents |
|---|---|
| Sign up (`/signup`) | Email, then a 6-digit code. "Create your Drishti account", "Free to start. Enter your email and we'll send you a code." An email that already has an account is simply signed in. "Already have an account? Log in". Left side: Home for the sample university in the dark, under a soft light that follows the cursor; where it falls, the three words settle and the things to do slide in |
| Log in (`/login`) | The same email and code. "Welcome back", "Enter your email. We'll send you a code." Log in never says whether an email has an account, so nobody can check who uses Drishti: for any email it shows the same code step, "If this email has a Drishti account, we've sent a code. New here? Sign up." (Sign up carries the email over), and answers in about the same time. It sends a code only to an account that exists, or to someone invited by an owner or the AdmitLabs team, who comes in like any account and joins on first sign in. It never creates an account for anyone else. "New to Drishti? Sign up". Left side: the Drishti eye, big, in the middle, following the cursor, among four cards of the sample's dashboard that lean with the cursor and change in turn (the three words settle, the rivals change places, the questions come in, the searches grow); the eye watches each card as it changes and reads along the field while someone types |
| Sign up and log in, both | The form first in reading order. On a wide screen the left side sits beside it; on a phone it is a small band above the form and plays on its own, as on any touch screen. With reduced motion the left side is still. The left side carries the logo and one line, "See where you stand. Every month." |
| Onboarding | The input form from section 6, then program pick for Free with what happens next. No left side; the Drishti logo, with its eye, at the top. After the first Audit, Home |
| Home | What to do first. The one-line answer, from the three words; Start here on a first visit (three steps: see what was found, your first fix, your rivals; ticks as each is done; closed for good with "Got it, hide this", per person); for a Client, "Your AdmitLabs team" (what the team did this month, or its latest work, and what it does next, each with the day and a link to see it; the Brain in one line; when the Audit last checked and the next one; how to write to the team; "See all work"), and while its Brain is set up, Help us know you above it (section 26) and the month's enquiries (how many, the change from last month, the link that brought the most, "See all leads"); the three words, each as its score out of 100 with its word and a thin bar, its question and what to fix first in it; "Do these 3 things this month" (Paid and Client: one fix from the Audit, one lesson from rivals, one of Make these 3, ordered by impact) or "Fix these first" (Free: the top 3 fixes), each with where it comes from, its place and check as a small label, its programs, its impact (or how often students asked, for an idea, with its format), its effort, Mark as done, and Let AdmitLabs fix this on a Free or Paid fix; What changed since the last Audit (each word that moved, each check that moved with its result before and after, the fixes marked done that this Audit checked, and for Paid and Client the rival alerts and fast rises in what students search; Free sees what Paid adds); the rivals' one line with the latest alert; one demand highlight. No overall score and no gauge on Home. While a new Audit waits for review (section 25): "Your Audit is being checked by the AdmitLabs team" above the last approved Audit, or, on a first Audit, in place of the results, with when to expect it and that an email will say when it is ready |
| Audit | The three words with "What do these mean?" (the words and their questions, what makes each Strong, Okay or Weak, the four results of a check), Fix these first (the top 3 by impact), the five places (each with what we found and its proof, what's good and what to fix; What people say and Other places say so kindly when little is found), progress month by month (Paid and Client: a table of each month's small score, the three words, the change since the month before, your place among your rivals, and the checks that moved, with every Audit folded below), program switcher. While a new Audit waits for review, the same line as Home above the last approved Audit |
| Program detail | Same as Audit, for one program |
| Fix panel | Side panel, in one order: the fix (its name as on Home, the place and check, impact, effort, the programs); 1. what we found, program by program, with the link, the date and the short line; 2. why it matters to a student; 3. the steps; 4. the ready fix, with Copy; details added by you; in the footer, Mark as done (the owner; others see that it was marked) and Let AdmitLabs fix this (Free and Paid; once sent, when). A Strong check opens the same panel with what was found and why it matters |
| Rivals | The month's one line; the ranking (you and each rival with the small score and the three words, Nearby city marked); place by place (each place, you and each rival, who leads where it is scored and what was found where it is not; each opens check by check with each side's findings, source and date, and what to learn from the one ahead, never to copy); what to learn from them (3); alerts from the last 30 days; Change rivals. Free: ahead or behind each rival and the one line, then what Paid adds |
| Rival detail | One rival: you and them place by place, every check side by side (a side whose programs differ shows its weakest program), their alerts, their best posts and what to learn from them, when their admissions open, their Google rating and its trend, and the score month by month as a table. Every set of tabs opens on one with something in it |
| Demand | For the city: when it was updated and the next update, where it was found by name ("From Search trends, the keyword tool, Reddit and Quora, in English, Hindi and Assamese"); Make these 3 this month at the top, with last month's "You made 2 of 3" line once there is a last month; programs rising and falling, as bars with words, or counts when a source gives them; courses asked for that you do not offer; what students ask about each program (topics, then questions); what gets attention (topics and formats); the best months to post, for each program; more ideas |
| Leads (`/leads`, Client only) | "What did our content bring in?": enquiries this month and the change from last month, the link that brought the most, every link with its count this month and before, then the list (name, course, link and date, with phone, email and city), newest first, with Download CSV, and deleting one student's data on request. Not a CRM: no calls, stages or follow ups |
| Brain (`/brain`, Client only) | "What does our AdmitLabs team know about us?" Section 26: Ask the brain, the status (Onboarding or Ready, how complete, facts to check), then the eight sections in a list on the left (a row on a phone), one open at a time, the Overview first. Help us know you at `/brain/help` |
| Your AdmitLabs team (`/work`, Client only) | Opened from the card on Home. "What has our AdmitLabs team done?": what the team does next, soonest first, then everything it did, by month, newest first, each with the day and a link to see the work. Write to your team at hello@admitlabs.in |
| Reports | Each month's summary (section 24) with its PDF, download, the score by month with every point's value |
| Plan | Current tier, dates, what Paid unlocks, renewal reminder state, a table comparing the plans (Paid's two prices, one to a line). On Free, Paid's offer with the "Monthly | 3 months" toggle and "Subscribe now" for the period shown; "Renew now" from the first renewal reminder (see Subscribe now and Renew now below) |
| Settings | Plain groups, each at its own address (a list on the left, a row on a phone): Institution (details, public links, the Google Maps listing, and details added by you, section 6), Programs (with the Free Audit program and details for each program), Rivals (who, and when they can change), Leads (Client: who gets each new enquiry by email, how long enquiries are kept, deleting a student's data), Team (each person sets their name once), Plan (with asking for Paid) and Notifications (what arrives, and when, and for each person the monthly summary email, or on Free the Audit ready email). Only the owner changes them |
| Notifications | Alerts list, with filters by what each is about (Audit, Rivals, Students, Reports, Plan, each with its count, only the ones that have alerts). Each link says where it goes ("See what changed", "See the move"). Empty, or still short: what arrives here and when, for the plan |

**Subscribe now and Renew now.** Wherever Paid is offered (the cards that say what Paid adds, a locked preview, the fix panel, What changed on Free, the Plan page, Settings, a Paid plan that ended), the owner clicks "Subscribe now" on Free, "Renew now" from the first renewal reminder, then picks Monthly or 3 months (3 months first; on renewal, the plan's own period) and sends ("Subscribe for 3 months", "Renew monthly"). Where the page shows the toggle already (the Plan page's offer), one click sends the period shown. Online payment is not set up yet (it comes before launch, for example Razorpay, so the button goes straight to payment): after the click the page says "Thanks! The AdmitLabs team will contact you to complete payment.", and the request lands in the team's Enquiries with the institution, the owner's email and the period picked; clicking again while one is open sends nothing new (it keeps the period picked last), and the page says when it was sent and for which period. The prices (₹9,999 + GST per month, or ₹24,999 + GST for 3 months) and terms never change and no email is sent: the team writes back to complete payment and an Admin switches the plan on for that period. Members see who can; Client has nothing to subscribe to. Let AdmitLabs fix this (section 7.7) works the same way.

**Want us to do it for you?** On Free and Paid (never a Client, never the team), the sidebar has an ivory card just above the account, in the More menu on a phone: the three AdmitLabs services, one line each (Program Growth, Institution Branding, Admit Campaign), and "Talk to AdmitLabs". The owner or a member clicks it; the request lands in the team's Enquiries, one open request per institution, and the card says "Thanks! The AdmitLabs team will contact you." Compact, so the sidebar still fits a laptop screen.

**Team screens (`/team`)**

The menu (section 27): Audit (To review, Bulk Audit and Rival ads as tabs), Enquiries, Institutions, Clients, and Team for an Admin. A Client manager has Enquiries and Clients only.

| Screen | Contents |
|---|---|
| Institutions (team home) | Tabs All, Free, Paid and Client (those not signed up show under All). Then All institutions, sorted by the reason each needs attention, most urgent first, each row saying why: a Paid plan ending within 30 days, a Client with no team Audit this month, a score down 3 or more, signed up with no rivals, a prospect not signed up a week after their Audit was shared. Search, filter by type, city, state, score, tier, prospect or client; sort by name, score or last checked too. The team keeps the score as a number |
| To review | Every new Audit and monthly summary waiting for the team's review, oldest first, each with the college, what it is, its plan, how long it has waited and what changed in one line; a count beside it in the team's menu. One opens the review: what changed since the last approved Audit, then the Audit place by place (or the summary line by line) to fix a result or a line, then "Approve and send" (section 25) |
| Bulk Audit | Add many institutions at once (paste list or CSV), run Audits, see results in a table |
| Clients | Every Client with its Client Brain (onboarding and how far, or Ready and the facts to check), its Blueprint (None, Draft, Shared or Approved), who looks after it, when it became a Client, and anything waiting for review. The full team can show one Client manager's Clients, or those with none; a Client manager sees their own. Each opens the institution page, where the Client Brain is a tab |
| Institution detail | Everything the institution sees, plus private notes, who looks after a Client ("Looked after by": Admins and Team members assign or remove a Client manager), tier control (Admin: Start Paid asks for the period paid for, Monthly or 3 months, and the day of payment, and shows the end date), manual refresh, and how its new Audits and summaries go out: "Review first" (on to start) or "Send automatically". For a Client, the Work log tab first, then the Client Brain tab (or Start onboarding, section 26): add what the team did or does next (Done or Next, one plain sentence, the day, a link when there is one), mark Next as done, remove an entry. It is what the Client sees. Then a Leads links tab: make a tracking link (a name such as "Reel: BBA placements", where it will be used, the program), copy it, see how many enquiries each brought this month and before, and archive one. Counts only |
| Share | Create a share link or PDF of a prospect's Audit, place by place with the three words |
| Rival ads | Enter what rivals promise in their ads, by hand until Drishti can collect it. Each entry is also a "started ads" alert for the institutions that track that rival |
| Enquiries | AdmitLabs' own leads (section 27): the open ones first, by the next follow-up, each with who, the institution and city, what they want, status, source, owner and the next follow-up ("Follow-up overdue", "Came back"). Tabs by status (Open, New, Contacted, Call booked, Proposal sent, Won, Lost, All); search, and filters by source, owner and follow-up due; Download CSV; Add a lead by hand. For Admins and Team members, the tracking links (make one, copy it, its counts, archive) and Meta lead ads, Not connected. A lead's page: where it stands (status, Lost with its reason, owner, next follow-up), how to reach them, their college in Drishti (find and link it), Make Client once Won, what came in (each enquiry as it was sent), the details, notes and History |

**Team rules**

- Prospect Audits run by the team stay private until the team shares them.
- A prospect's shared Audit does **not** use up their Free Audit.
- Private notes are never visible to institution users.
- A Client's work log is written for the Client: what was done, in plain words, with the day and a link to see it. Never notes, and never anything about rivals that the rival could learn from.
- The team sees Leads as counts by link. A student's details are for the college only, in "view as" too.
- Nothing waiting for review reaches the college: not the Audit, not its alerts, not its email. Every change the team makes in a review is kept.

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

- In rows and lists: a thin bar of the share of the check's points earned, then the word. No point numbers on screen. Missing is an empty dashed bar. One style for every result, on screen and in the PDF, so a list reads evenly.
- A place's checks, every one named (rule 11 in section 18): every check as a row, weakest first (the worst result, then the most to gain): its icon, its name, a thin bar and the word. A program check shows its weakest program. A row opens its panel where the page has one.
- Readable on black and on ivory. The word is always available: beside the bar, on hover, and for screen readers. Never rely on the shape alone.
- **The three words**: Discovered, Trusted and Chosen side by side (stacked on a phone), each word large in Bricolage with its question under it, what to fix first in it, and, with history, how it moved in words ("Up from Okay in June"). Never a gauge or a big number. Where the overall score shows (Progress, the Rivals ranking, the report and the team's screens) it is a small number in Inter.
- **Impact and effort** sit beside a fix as small words, "Impact High" and "Effort Quick", never a colour or a shape alone.

**Icons and logos**

- Line icons drawn for Drishti (thin strokes, square ends, no icon library): one for each of the 17 checks, the 5 places, the 3 words and the main sections. The same icons in the PDF.
- Real one-colour logos only for Instagram, X and YouTube (from Simple Icons, CC0), unchanged and in the colours each brand allows. Source and licence are kept next to the files.
- Every other platform (Google, Google Maps, Facebook, LinkedIn, Reddit, Quora, ChatGPT, Gemini, Perplexity, websites, listing sites, news) gets a neutral line icon and its name, until AdmitLabs has permission to use its logo.
- Icons are decoration. The name always sits beside them.

**Charts**

- Hand-built, monochrome: you in the text colour, rivals in grey, each named on the chart. No legend to decode (rule 11).
- Every mark has its number or name beside it: every month's count on its bar, every link's count on its row, every point of the Reports card's small line with its value and month. A chart with one point is words instead ("First Audit. The next one shows how things move").
- The rivals ranking: you and each rival in rows with real names, the small score and the three words, your row highlighted, and the month's one line above it. On screen, in the PDF and in the `/drishti` Rivals picture.
- Month by month, you and your rivals: a table of numbers, your row first and marked, and one line about your place ("2nd of 4 in every month since April"). A phone keeps the last three months.
- The best months to post: the twelve months in one strip for each program, the best months in the text colour and named under the strip ("March to June"); one program a line on a phone.
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

**Headings are calm and confident** (redesigned 2026-10-03): the hero headline 52 px (30 on a phone), section headings 36 px (28 on a phone), a line under a heading 16 to 17 px. These sizes are the page's own; the website keeps its sizes. No small labels above headings, but a feature's own name: each feature opens with its bar, and How Drishti reads you names the feature it belongs to. Each visual shows something real from the product, never decoration.

**The pictures** are the dashboard's own components, filled from the sample world by the real scoring engine and shown under the website's made-up names: Larkmoor University, Bangalore, with Calderwood College, Brackenfield University and Thornbury College as its rivals in the same city (Karnataka, Kannada). Only the names change, never a result, so the website, this page and the sample report agree. They carry no caption. The dashboard's own sample keeps its names.

**Sections, in order:**

1. **Hero**: the product's name with the Drishti eye (its Rise reveal plays once as the intro, section 14), then "See where you stand, who’s ahead, and what students want." with the last words in an ivory block. "Get your free Audit" and "See the sample report", the trust line and the proof line, then the dashboard's Home in an app window that settles flat as the page moves
2. **The problem** (ivory), one tight band with less space around it than the other sections: "Most teams guess. Drishti checks." with its line beside it (on a wide screen the headline left and the line right, their last lines level), then one wide Drishti card, dense like the dashboard. A top bar with the sample university and when it was last checked, then its answers to the three questions in three panels side by side (two, then the questions across, on a tablet or small laptop; stacked on a phone), each with where it came from: Discovered, Trusted and Chosen with their words, from the Audit's five places of public pages; its place among the rivals in its city, by name in thin rows, with the month's one line; the questions students ask most in its city, each on one line with its site and count small on the right ("Quora · 96"); and at the foot of that panel one short line with the program rising fastest, in words (Search trends)
3. **The three features**, each in the same frame: a bar with its name (heavy and narrow, with the dashboard's icon), its question and its place ("1 of 3"), which stays under the header while its pictures pass, on a phone too; one short line; then the product across the full width on a dark stage. The Audit with the three words, the places and what to fix first; Rivals with the month's one line, the ranking and place by place; Demand with Make these 3 and the programs rising
4. **How Drishti reads you**, inside the Audit (its label says so): "Five places. Three words." The three words side by side (stacked on a phone), each with its question and the checks behind it, one to a row, each with its place and its result; then, compact, what makes a word Strong, Okay or Weak. No total score
5. **Public data only**: the rules every result follows, in one framed band. Leads is the one exception, and says so: only what students send a client's college themselves
6. **How it works**: four steps on a line that fills as the page moves: enter details, Drishti checks every place, see what the internet says, get a summary and a report every month
7. **Sample report** (ivory): three of its pages fanned out, and the download of the full sample PDF, marked "Sample report. Fictional data." on every page
8. **Plans**: Free and Paid, Paid on ivory with the "Monthly | 3 months" toggle (3 months first: ₹24,999 + GST for 3 months with "Save 17%"; Monthly: ₹9,999 + GST per month; no auto-renew), then every feature compared
9. **For AdmitLabs clients**: included free, with the team acting on it, and Leads: the enquiries their content brings, link by link
10. **FAQ**: data sources, privacy, what "public data only" means, Leads, renewal
11. **Final call to action**: "Get your free Audit", under the same light as the top of the page

**Motion**, calm and almost all CSS: sections and headings fade and rise in; each feature's bar holds its place while its pictures pass; the three words settle in turn; result bars fill; the rivals slide into rank order; Demand's bars grow; the report's pages fan out; buttons, cards and plans answer the pointer. With reduced motion, or no script, everything shows settled.

"Get your free Audit" (and the Paid plan's "Start with a free Audit") leads to `/signup`, then `/onboarding`.

---

## 16. Data model (Postgres)

Starting shape. Claude Code may refine names and types, but must keep the ideas.

| Table | Key fields |
|---|---|
| `cities` | name, state, aliases, near (the nearest bigger city, for Nearby city rivals) |
| `institutions` | id, name, type (college, university, skilling), city, state, website, instagram, youtube, other_links (jsonb), claimed (bool), is_prospect (bool), review_first (bool, on to start; set by the team), created_at |
| `programs` | id, institution_id, name |
| `memberships` | user_id, institution_id, role (owner, member), guide_closed_at (Start here closed), summary_email (on or off) |
| `team_users` | user_id, role (team, admin) |
| `plans` | institution_id, tier (free, paid, client), starts_at, ends_at, set_by, free_program_id |
| `signals` | id, institution_id, program_id (nullable), provider, check_key, value (jsonb), source_url, fetched_at |
| `audits` | id, institution_id, run_at, kind (free, paid, client, team), overall, discovered, trusted, chosen, config_version, review (waiting, approved), approved_at, approved_by |
| `audit_edits` | id, audit_id or report_id, what (a result, a line, a finding taken out, a summary line), target, before, after, reason, edited_by, edited_at (every change made in a review) |
| `audit_program_scores` | audit_id, program_id, overall, discovered, trusted, chosen |
| `audit_checks` | audit_id, program_id (nullable), pillar, check_key, result, points_awarded, points_max, finding (the short line of what was seen), how_to_fix (and the same as fix_steps, one thing each), ready_fix (text or a layout), difficulty, source_url, checked_at |
| `audit_findings` | id, audit_id, institution_id, place (people, other), kind (good, bad, unanswered, listing, news, directory), finding_key (the same finding month after month), line, source_name, source_url, checked_at, fix (name, why, steps, ready fix, effort, impact; null when there is nothing to do), fix_rank |
| `rivals` | institution_id, rival_institution_id, suggested (bool), added_at |
| `rival_moves` | id, rival_institution_id, kind (new_program, fee_change, new_page, admission_dates, started_ads, reviews_jump), description, source_url, detected_at |
| `rival_content` | id, rival_institution_id, platform, url, metrics (jsonb), why_it_worked, month |
| `rival_ads` | id, rival_institution_id, promise, source_url, entered_by, entered_at |
| `demand_pulls` | id, scope (city, state), region, program_key, month |
| `demand_items` | id, pull_id, kind (rising, falling, question, topic, content, best_month, idea; version 1's worry, mention and season stay for old rows), text, language, count (null when no source gives a real count), meta (an idea's format, effort, program, hook, key points and why), source_url, found_at |
| `content_picks` | institution_id, month, rank, idea (as picked), program_id, picked_at (Make these 3; Mark as made is a mark in `done_marks`) |
| `actions` | institution_id, month, rank, text, feature (audit, rivals, demand), effort |
| `done_marks` | institution_id, check_key, finding_key or thing and month, marked_by, marked_at, checked_by_audit (the first own Audit after a check or finding was marked) |
| `reports` | institution_id, month, storage_path, summary (the month's summary, section 24), review (waiting, approved), approved_at, approved_by, created_at |
| `notifications` | id, institution_id, kind, text, read, created_at |
| `notes` | id, institution_id, author_id, body, created_at (team only) |
| `person_names` | user_id, name (each person's own, set once; History shows it, or the email) |
| `brains` | institution_id, status (onboarding, ready), started_at, started_by, ready_at, ready_by (a Client's Brain, section 26) |
| `brain_items` | id, institution_id, kind (contact, talk, goals, target, rivals, regions, logo, colours, fonts, tagline, tone, avoid, dos, guidelines, award, placement_list, alumnus, review, link, date, plan, script, worked, note, skip for "Doesn't apply", found for what Drishti found for the details), fields (jsonb), to_confirm, source (drishti, college, team), via_help, source_url, found_at, checked_at, checked_by, created and updated (when, who) |
| `brain_steps` | institution_id, step (drive_shared, brand_kit, social_access, media_received, approver_confirmed, plan_agreed), done_at, done_by |
| `brain_checks` | institution_id, fact (about, or a program's fees, dates or details), checked_at, checked_by: when each fact of the details added by you was last changed or said to be still right |
| `brain_changes` | id, institution_id, at, by, what (added, found, changed, confirmed, corrected, not right, removed, checked, started, ready, a step, shared, approved, changes asked), target, kind, before, after, team_only: the Brain's History, written by triggers |
| `brain_blueprints` | id, institution_id, version, file_path (in the private bucket brain-blueprints), file_name, size_bytes (up to 20 MB), status (draft, shared, approved), uploaded_at, uploaded_by, shared_at, shared_by, approved_at, approved_by, changes_note, changes_at, changes_by, text (what the reader found in the PDF, for Ask the brain): one row per version of a Client's Blueprint (section 26) |
| `team_work` | id, institution_id, kind (done, next), body, work_on (the day it was done, or Next is due), link, added_by, created_at (a Client's work log) |
| `share_links` | token, institution_id, audit_id, created_by, created_at |
| `institution_details` | institution_id, the details added by the institution (section 6), updated_at, updated_by. Never read by scoring |
| `program_details` | program_id, institution_id, the details added for each program (section 6), updated_at, updated_by. Never read by scoring |
| `scoring_config` | version, weights (jsonb), result_shares (jsonb), thresholds (jsonb), labels (jsonb), impact (jsonb), active (bool) |
| `enquiries` | id, created_at, kind (work_with_us, ask_paid, continue_paid, fix_request, ask_services, free_signup), name, institution, role (founder_director, principal_dean, admissions, marketing, other), email, phone, program, message, institution_id, asked_by, fix_key, fix_title, paid_months, handled_at, handled_by, lead_id, team_link_id (what came in: the website, section 22; dashboard requests, section 13; a new Free college; each joins its lead, section 27) |
| `team_leads` | id, created_at, last_in_at, name, institution, institution_id, city, phone, email, wants, source, source_detail, link_id, status (new, contacted, call_booked, proposal_sent, won, lost), lost_reason (price, timing, chose_someone_else, no_reply, not_a_fit, other), lost_note, owner_id, next_follow_up, made_client_at, created_by, updated_at, updated_by (section 27) |
| `team_lead_activity` | id, lead_id, at, by, kind (created, came_back, note, status, owner, follow_up, edited, made_client), body (a note), data |
| `team_lead_links` | id, code, name, source (a social source), created_by, created_at, archived_at |
| `team_lead_alerts` | id, lead_id, kind (new, returning, reopened), skip_user, was_lost (what a reopened lead had been lost for), created_at, sent_at. Server only |
| `lead_links` | id, institution_id, program_id, code, name, used_on (instagram, youtube, facebook, website, whatsapp, other), created_by, created_at, archived_at |
| `leads` | id, institution_id, link_id, program_id, name, phone, email, city, consent (the exact line shown), created_at |
| `lead_settings` | institution_id, alert_emails, keep_months (6, 12 or 24), updated_at, updated_by |
| `email_log` | id, kind (lead_alert, monthly_summary, audit_ready, team_lead_alert, client_invite, blueprint_reply), institution_id, recipient, sent_at, sender (local test inbox), ok, error. Never the message itself |
| `client_managers` | institution_id, user_id (a team user whose level is Client manager), assigned_by, assigned_at (section 27) |

**Row Level Security:**
- Institution users only see their own institution's data, filtered by plan.
- Admins and Team members see everything, except a student's details in Leads. A Client manager sees only the Clients assigned to them, as the team sees them, and the rivals those Clients track (section 27).
- Notes are team only.
- A Client's work log: the team reads every log, adds to a Client's in its own name, marks Next as done and removes entries; the Client's own people read theirs while the service is active. No other plan sees one.
- Marks done: people at the institution and the team read them; only the owner adds or takes one back, through `mark_done` and `undo_done`, and only for a check or finding the latest own Audit has something to fix in. Each person closes their own Start here.
- Enquiries: anyone can send one, only through `submit_enquiry` (at most 3 a day from one email). An owner asks for Paid only through `ask_for_paid`, which checks the owner, the plan and the period (1 or 3 months) and keeps one open request per kind; the institution reads its own open request through `open_paid_ask`. An owner asks AdmitLabs to fix something only through `ask_admitlabs_fix`: the owner, Free or Paid, a fix in the latest own Audit, one open request per fix. Each one joins its lead (section 27): Admins and Team members read every lead and what came in, a Client manager the leads they own; a lead changes only through the team's functions (status, owner, notes, details, the college it is, Make Client), each checking the same. Moving a lead on from New marks what came in handled.
- Leads: only the institution's own people read them, never the team. Anyone can send one only through `submit_lead`: a live link, an institution that is a Client, and the spam checks of section 23. Only the owner deletes them, one enquiry or every enquiry from one phone or email. The team and the Client's own people (the owner and the members) make and archive links; the team reads counts by link through `lead_link_counts`; the institution's people read their own links. Lead settings: the owner changes them, the institution's people read them.
- Email log: team only.
- Review: a college reads its own Audits, their findings, its reports and summaries only once approved. The team sees what waits, changes results and lines (each change kept in `audit_edits`) and approves through `approve_audit` and `approve_report`; the team sets each college's `review_first`.
- Rival data is only reachable through the `rivals` link of the viewing institution.
- The Brain (section 26): the team and the college's own people read it while the college is a Client (the team after that too); they change it only through the Brain's database functions, which check the plan, the person and that no text holds a password or login. What Drishti found waits for the team; Team only notes and their History are the team's alone.
- The Blueprint (section 26): Admins, Team members and the Client's managers read every version and its file, and change them only through `add_blueprint_version` and `set_blueprint_status`. The college's own people read only the Shared and Approved versions of their own Blueprint, and only those files, while the college is a Client; they answer only through `approve_blueprint` and `ask_blueprint_changes`, on the latest Shared version. Who hears of an answer comes from `blueprint_reply_recipients`, for the server only.
- Plan gating must be enforced on the server, not only hidden in the UI.

**Every signal keeps its source and the date it was checked.** This is how any result can be explained.

---

## 17. Data providers (slots for later)

Each data source is a **provider** with one shared interface: it takes an institution (and program where needed), or a city and program for Demand, and returns signals, each with a value, a `source_url` and a `fetched_at` date. The AI reader and writer and the email sender have small interfaces of their own.

**In this build, every provider has a mock version** that returns realistic sample data. A single setting switches each provider between mock and real. A real version says it is not connected until it is built.

| Provider | Slot for | Feeds | Real source (later) |
|---|---|---|---|
| `website` | Website reader | The Website place: program pages, fees, placements, admission steps, enquiry, approvals, faculty; whether the site answers a student question; rival moves (new programs, fee changes, new pages, admission dates) | Reading the institution's public pages, with the AI reader |
| `pagespeed` | Google PageSpeed | Mobile, Speed | Google PageSpeed Insights API |
| `places` | Google Places | Google profile, Reviews and rating, the big jump in reviews alert | Google Places API |
| `search` | Search tool, city specific | Search from [city], as seen from the city; Quora and forum threads for What people say; news, college listing sites and directories for Other places; official listings that prove approvals | A search data provider with location (DataForSEO or SerpApi) |
| `youtube` | YouTube | YouTube, rivals' best videos, content signals | YouTube Data API |
| `instagram` | Instagram | Instagram, Students in your posts, rivals' best posts, content signals | VidIQ |
| `facebook` | Facebook, light | Facebook: the page, and when it last posted | Facebook official access |
| `reddit` | Reddit | What people say on Reddit, student questions for Demand | Reddit API (commercial use needs Reddit's agreement) |
| `trends` | Google Trends | Programs rising and falling, the best months to post | Google Trends, through a data provider |
| `keywords` | Keyword tool | Searches a month for programs and courses in the city, and the questions people search | A keyword data provider |
| `ai_answers` | AI answers | AI answers | Asking ChatGPT, Gemini and Perplexity the student's question, each result kept |
| `ai` | AI reader and writer | Reads pages for the website reader; writes each finding's short line, why it matters, the steps, the ready fix, effort and a finding's impact, "why it worked", the rivals' one line and lessons, the ideas with their hooks and key points, and the monthly summary; answers Ask the brain from a Client's Brain, reads the words of its Blueprint PDF (`blueprint_text`), and fits Make these 3 to its brand (section 26) | Claude API |
| `email` | Email sender | The alert for each new enquiry, the monthly summary, the alert for each new or returning lead in the team's Enquiries | The local test inbox that local Supabase runs, for now; an email service later. WhatsApp later, as a second channel |
| `lead_import` | Lead ads import | Leads into Enquiries from ads (section 27), tagged Facebook or Instagram, joining a lead with the same email or phone | Meta lead ads (lead forms on Facebook and Instagram ads). Shows "Not connected" in this build |
| `manual` | Team entry | Rival ads | Team entry screen |

**Rule: official access only.** No scraping tools that break a platform's terms.

**Not in this build:** real providers, Claude API, Razorpay payments, WhatsApp, real email sending, deployment of the dashboard.

---

## 18. Non-negotiable rules

1. **Public data only**, with one exception: Leads (rule 13). Drishti checks only what a student or parent could see.
2. **Every finding explained.** Every result shows what was found, the source and the date.
3. **Learn, never copy** rival content.
4. **Rivals never know** who tracks them.
5. **Grouped only** for Demand. No individual students.
6. **Official access only** for every platform.
7. **Plan limits enforced on the server.**
8. **Monochrome. Bricolage Grotesque for words, Inter for numbers that stand on their own.** No em dashes or en dashes.
9. **Opportunity, not shame** in every piece of copy.
10. **No discount codes or offers.** The 3-month price is a fixed plan price.
11. **Readable at a glance**, everywhere: the dashboard, the PDFs, a shared Audit and the pictures of the product on `/drishti` and the website.
    - No shape, dot, square or colour without a name or number right next to it.
    - No chart that needs a key to understand.
    - If a person can't understand it in 3 seconds, simplify it.
12. **Empty states that help.** Anything that can be empty says why it is empty, what to do about it, and when it fills: no rival suggestions yet says where suggestions come from and how to add rivals; no alerts yet says what arrives and when; a new prospect on the team side says what to do first; not much said about you yet says why and what helps. A set of tabs opens on one with something in it.
13. **Leads are the students' own, for that college only.** The only individual student data in Drishti, because students send it to that college themselves, with a consent line. Shown only to that college, kept only as long as it chooses, deleted on request. Not a CRM. A lawyer checks it before it goes live (section 23).

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

**Version 2 (October 2026)**, in three steps:

1. The plan and this spec. Wait for approval.
2. A development only mock page (not found in production, not indexed) with the new Audit, Rivals, Demand with Make these 3, Leads (the client's view, the team's links and the public form), Home, the monthly summary and the Audit ready email, and the review before sending (To review, one review, the college's waiting state), with two options where there is a real design choice, shown on desktop and phone. Wait for the pick.
3. Build in parts. Each part: shots of its key screens on desktop and phone, every check and test once at its end, then a local commit and a short summary. The mock page goes at the end.

| Part | What gets built |
|---|---|
| 1. Data and mock providers | Migrations, the new provider slots and mocks, the sample data, the engine's words and impact (with tests), the price in config |
| 2. Audit | The places, fixes with ready fixes, Let AdmitLabs fix this, marks on findings, plan gating, the shared Audit and the team's views; review before sending for Audits: To review, fixing a result or a line, Approve and send, the college's waiting state, the Review first setting |
| 3. Rivals | City suggestions and Nearby city, the ranking, place by place, the month's one line, lessons, the new alerts, a rival's page |
| 4. Demand | Make these 3 and Mark as made, program and content signals, the best months, honest numbers |
| 5. Leads | Team links, the public form and its spam checks, the Client's Leads page and CSV, alert emails to the local test inbox, keeping and deleting |
| 6. Home, summary, PDFs, pricing | The new Home, the monthly summary by email and on Reports, the Audit ready email for Free, both waiting in To review when Review first is on, both PDFs, Paid's price everywhere |
| 7. Product page, website, sign up and log in | `/drishti`, the website's Drishti parts and the pictures on sign up and log in; the mock page removed |

**The Client Brain (8 October 2026)**, in three steps: the plan; a development only mock with both layouts of the Brain, the onboarding, Help us know you and Ask the brain, on desktop and phone (layout 1 picked: a list of sections, one open at a time); then the build, with every check and test, and a local commit. The mock page went with the build.

**The Blueprint (8 October 2026)**, in the Client Brain: the plan and build together (no mock), with every check and test, and a local commit.

**Later (not now):** connect real providers one by one, Claude API for analysis, Razorpay, reminders by email, a real email sender, WhatsApp, deployment of the dashboard to app.admitlabs.in.

---

## 20. Sample data

Fictional only. No real institution names.

- 8 institutions in Assam: 3 colleges, 2 universities, 3 skilling institutes. Mostly Guwahati, some in other Assam cities. Plus 2 rival records added in version 2: a skilling institute in Guwahati and an institute in Tezpur.
- Rivals are local: Highfield University moves to Guwahati, so every Guwahati institution tracks 3 or more rivals in its own city.
- The Nearby city case: Loomcraft Skills Institute (Tezpur) signs up on Free and tracks one rival in Tezpur and two from Guwahati, marked "Nearby city".
- Programs such as BBA, MBA, BCA, B.Com, Nursing, Hotel Management, Digital Marketing, Data Analytics.
- Use `.example` domains for websites (for example `northbank-college.example`), and for listing sites, news and forums.
- A spread of results: some parts Strong, some Okay, some Weak.
- Every fix has its ready fix; some use details added by you.
- What people say: plenty for Eastgate and Silverline, a little for Brightpath, and "Not much said about you yet" for Northbank and Loomcraft.
- Other places: listings with old details, missing listings and a news story or two.
- Fixes marked done: one the next Audit confirmed, one it did not find yet, one still waiting. One finding marked done and confirmed.
- Asks to let AdmitLabs fix something: one open, one handled.
- To review: a Free sign up's first Audit, a Paid refresh and a monthly summary waiting; one Audit approved after the team fixed a result; Brightpath on Send automatically.
- 6 months of Audit history for at least 2 institutions.
- Rival scores and Demand pulls from April to September 2026, so the month by month charts have 6 months too.
- Rival alerts, including started ads and a big jump in reviews.
- Details added by some institutions, for themselves and their programs.
- Rivals set up between them, with moves, best content and ads.
- Demand pulls for Guwahati and Tezpur, with Assam filling in, across the sample programs, in English, Hindi and Assamese: programs rising and falling, topics, questions, content signals, best months and ideas with hooks and key points. Make these 3 for August and September: Eastgate made 2 of August's 3.
- The Client Brain: Brightpath's, Ready since 16 March, lived in since, with 2 facts to check before admissions open on 1 December; Silverline College became a Client on 1 October (Free before), and its Brain is 80% complete, onboarding, with what Drishti found waiting to be confirmed. Brightpath has a member, Anjali Das. Names: Ritu Bora and Anjali Das (Brightpath), Meera Kalita (Silverline), Kabir Sen (the team user).
- Brightpath's Blueprint: version 1, approved by Ritu in March; version 2, shared by its Client manager on 6 October and waiting for the college. Each is a small sample PDF. Silverline has none yet.
- Leads for Brightpath (Client): 4 tracking links from July, and enquiries from July to September with made up names, `.example` emails and made up phone numbers.
- One institution on each tier: Free, Paid, Client (and a second Free, Loomcraft). Plus 2 prospects visible only to the team.
- Sample users: one owner per institution, one team user, one admin.

---

## 21. Open items (not decided yet)

- WhatsApp: the monthly summary and the alert for each new enquiry (later)
- A real email sender (later; the local test inbox for now)
- Email reminders for plan end (later)
- **Before Leads goes live: a lawyer checks its privacy** (the consent line, keeping and deleting, what changes under the DPDP rules)
- A proper Google Drive connection for the Brain's folders and files, and the Claude API behind Ask the brain (with the backend). Links and two small files for now
- What happens to a Client's Leads when the service ends. For now: the forms close, and the list stays with the college until its keeping time runs out
- Scoring What people say and Other places, once there is enough data
- Whether a review that waits too long goes out on its own. For now it waits, and To review shows how long each has waited
- Whether AdmitLabs serves two direct rivals for the same program in the same city (services decision)
- Moving thresholds from fixed rules to peer comparison (after enough Audits)
- Final hex values, confirmed against the brand identity PDF

---

## 22. AdmitLabs website (admitlabs.in)

The main AdmitLabs website, built in this app (section 4), in the **Spotlight** style chosen on 2026-10-02: premium and calm (think Linear, Vercel, Resend, Attio, Raycast). Black with soft light from above, ivory surfaces for the moments that matter, fine frames with small cross marks, a light grain where light falls, and crafted pictures of what students actually see. It turns a visitor into a free Audit or an enquiry.

**What AdmitLabs is:** an education only content partner. Three services (content only, never ads) and two products: Drishti for institutions and Tathya for students.

**Pages:** the home page (`/`), Work with us (`/work-with-us`) and the product page (`/drishti`, section 15, in the same style). One header on every page: Services, Products (a small menu: Drishti, with its eye, still, before the name, and Tathya, which opens mytathya.in in a new tab), How we work, FAQ, "Work with us" and "Get your free Audit" (a menu on a phone, with both products); clear over the light at the top, glass once the page moves. The logo and the buttons keep clear of the frame's lines and crosses, on a desktop and on a phone. One footer: "© 2026 AdmitLabs" (the current year), the email, Drishti and Sign in. Every "Get your free Audit" leads to sign up (`/signup`); Sign in leads to log in (`/login`).

**Home page sections, in order:**

1. **Hero**: "Get discovered, trusted, and chosen." in two lines (80px on a desktop), falling from ivory to warm grey, centred on black under a soft cone of light, inside a fine frame with small crosses. One short paragraph, two buttons ("Get your free Audit" and "Work with us"), and the quiet proof line "120+ education companies worked with." Under it, a slow strip of ten client logos (ivory WebPs in public/brand/clients, each named in its alt text) sliding right to left in an endless loop, phones included, faded at both ends, dimmed until pointed at, paused on hover; with reduced motion, one still row that can be swiped sideways. No other picture, no labels
2. **The system** (ivory): one dark stage where the three moments happen in the order a student lives them: a search where the institution is the answer (an AI answer and the top result), a review and its proof, and an enquiry that someone receives. Under each, its words set like a caption: Discovered, Trusted or Chosen, its line, and what Drishti checks. On a phone each moment gets its own small stage
3. **Services**: three chapters, each laid out its own way around what that service makes: Program Growth beside a program's own page (a browser, and the phone in front; on a phone, the phone alone); Institution Branding on a stage of phones (the official page's posts, a reel, a YouTube film); Admit Campaign beside its season, planned week by week, with this week's posts. Instagram and YouTube appear only as their official one colour logos. Each links to the form with the service named. "We create content. We don't run ads." No prices
4. **Drishti**: under one small label, "Product", the only one on the page, its name with the Drishti eye (its Rise reveal plays once when the title comes into view, section 14); its three numbers (5 places checked, 5 rivals in your city, 1 report every month), its three questions as a short list beside the product itself, a made up institution's Home in an app window, then "Free to start." with "Get your free Audit" and "Explore Drishti"
5. **Who we work with** (ivory): private colleges, private universities, and skilling and training institutes, set large as a staircase, for professional and career programs
6. **Our work**: content samples. Hidden until there are samples (`src/site/work.ts`) and `SITE_SETTINGS.showWork` is on
7. **How we work**: the promise held on the left; Audit, Blueprint, Run and Report on a line that fills as the page moves. No numbers
8. **Tathya**: its name with "For students" under it, one line, and "Explore Tathya", which opens mytathya.in in a new tab, in a framed band
9. **FAQ**: ads, who we work with, who owns the content, whether Drishti is free, how to start
10. **Final call**: "See where you stand this month." under the same light as the top of the page, with both buttons

**Rules:**

- Say only who we work with, never who we don't.
- No service prices on the website. No discount codes or offers.
- No small labels above headings (the one exception: "Product" above Drishti by AdmitLabs), no numbered steps, no icons in boxes, and no two sections built the same way.
- The pictures show a made up institution, Larkmoor University, in Bangalore, with made up neighbours (Calderwood College, Brackenfield University, Thornbury College): none is a real institution, and none of it is Drishti's own sample data (`src/site/scenes.ts`). They carry no caption.
- Gradients: subtle and monochrome only (black to graphite, soft ivory tones), for light, depth and transitions. Never colour, neon or glow. The website and `/drishti` only (section 14).
- Motion is CSS only, with no animation library: the light and frame come in on load, sections fade and rise in, the moments and pictures play their details as they scroll into view, and buttons, cards and links answer the pointer calmly. With reduced motion nothing moves and everything shows settled. Lighthouse near 90 on a phone.
- Works on a phone, with no stretched cards.

**Work with us:** the same style (light from above, the frame), the words on the left and the form on an ivory card. Name, institution, role (Founder or director, Principal or dean, Admissions, Marketing, Other), email and phone are required; the program to grow and a message are optional. Then "Thanks. We'll reply within one working day." Each enquiry is saved to `enquiries` (section 16) and joins its lead in the team's Enquiries (section 27), which emails the team. The same form opens at `admitlabs.in/talk/<code>` from a team tracking link, tagged with its source. A hidden field turns bots away, and one email can send at most 3 a day.

**Search and sharing:** every page has its own title, description and link preview image (1200 by 630: the headline in the hero's light and frame, with the proof line).

**Settings** (`src/config/site.ts`): `showWork`, `tathyaUrl` and the contact email.

---

## 23. Leads (AdmitLabs Clients only)

**Answers:** "What did our content bring in?" For AdmitLabs clients: the enquiries their content brings, link by link.

**The one exception to public data only.** Leads are the only place in Drishti with individual student data, because students send their details to that college themselves, through its form, with a consent line. **A lawyer must check Leads' privacy (the consent line, keeping and deleting, the DPDP rules) before it goes live.** Until then it runs on sample data only.

**Tracking links.** The AdmitLabs team makes links for each Client in the team area, and the Client's owner and members make them on `/leads` (decided 5 October 2026; everything else on Leads, the settings and deleting a student's data, stays with the owner): a name ("Instagram bio", "Reel: BBA placements", "YouTube"), where it will be used (Instagram, YouTube, Facebook, website, WhatsApp, other) and one program, or any course: a general form, where the student picks the course. Each link knows its source. Each can be copied, and archived after one more click; an archived link's form says it is closed.

**The form.** Each link opens a short enquiry form that Drishti hosts, at `admitlabs.in/enquire/<code>`, with the college's name and the program ("Ask about a course" for a general link). Fields: name, phone, email, course (the link's program to start, or any of the college's programs; on a general link the student picks one) and city. Above the button, the consent line: "Your details go to [College] so they can contact you about admission." Then "Thanks. [College] will contact you soon." Spam protection: a hidden field, a minimum time to fill the form, one enquiry per phone or email per college per day, and a cap on enquiries per link per hour **[ADJUSTABLE]**. Not indexed by search engines. The form takes enquiries only while the college is a Client.

**What the Client sees (`/leads`):**

- Enquiries this month, and the change from last month.
- The link that brought the most, and every link with its count this month and before.
- The list: name, course, link and date, with phone, email and city, newest first, and Download CSV.
- An alert email to the admissions team for each new enquiry, with the student's details. It goes to the local test inbox in this build; WhatsApp later.

**Monthly report and summary:** "Your content brought 23 enquiries in September." with the links that brought them. Counts only, never a student's details.

**Keeping and deleting.** In Settings, Leads: who gets the alert email (up to 3 addresses; to start, the admissions email from the details added by you, or else the owner's) and how long enquiries are kept (6, 12 or 24 months; 12 to start **[ADJUSTABLE]**), after which they are deleted for good. The owner can delete one student's data on request: find them by phone or email and delete every enquiry they sent.

**Who sees what.** Only the college's own people see the list. The AdmitLabs team sees counts by link, never a student's details, in "view as" too. Rivals never see anything.

**Not a CRM.** No calling, no follow up stages, no sales pipeline, no notes on a student.

---

## 24. Monthly summary, and the Audit ready email

**Paid and Client: the monthly summary.** A short summary each month, made on the 1st with the report:

1. How you're doing: Discovered, Trusted and Chosen, and any that moved.
2. The 3 things to do this month (Home's three).
3. One rival move.
4. For a Client: the month's enquiries ("Your content brought 23 enquiries in September, 6 more than in August.").

It arrives by email to the owner and members, each of whom can turn it off in Settings, Notifications, with links to the dashboard and the PDF. The same summary opens the month on Reports and in the PDF.

**Free: the Audit ready email.** When a free Audit is ready (the first, then every 3 months), a short email: Discovered, Trusted and Chosen; the top 3 fixes, each with Let AdmitLabs fix this; and Subscribe now. Each button opens the dashboard, where the owner asks with one click. To the owner and members, each of whom can turn it off.

In this build both go to the local test inbox; WhatsApp later. With Review first on, both wait for the team's approval (section 25).

---

## 25. Review before sending

The AdmitLabs team can look over a new Audit and a monthly summary before the college sees it, and fix what a provider got wrong.

- **What waits.** With Review first on, every new own Audit (at sign up, on its schedule, or a refresh) and every monthly summary with its report waits in the team's **To review** list, and so do their emails (section 24). Alerts for new enquiries never wait. Prospect Audits are the team's own and need no review.
- **The setting.** Each college has one, set by the team on its page: **Review first** (on to start) or **Send automatically**.
- **To review** (team area): everything waiting, oldest first, each with the college, what it is ("New Audit", "September summary"), its plan, how long it has waited and what changed in one line. A count beside To review in the team's menu.
- **Reviewing one.** First, what changed since the college's last approved Audit: the words that moved, the checks that moved with their results before and after, new findings and findings gone. Then the Audit place by place (or the summary line by line), where the team can:
  - fix a result: choose Strong, Okay, Weak or Missing, with a short reason; the words and the score update straight away;
  - fix a line: what was seen, a fix's name, its steps or ready fix, a summary line;
  - take out a finding that is not about the college.

  Then **Approve and send**.
- **Every change is kept**: who, when, what it was, what it became and why. A result the team changed keeps its link, shows the day the team checked it and the team's line, and reads "Checked by the AdmitLabs team".
- **Until it is approved** the college keeps its last approved Audit and sees "Your Audit is being checked by the AdmitLabs team" on Home and the Audit. On a first Audit that line takes the place of the results, with when to expect it. Nothing about the waiting Audit shows anywhere else, no email goes, and marks done wait to be checked.
- **On Approve and send** the Audit shows, marks done are checked, "Your new Audit is ready" arrives in Notifications and its email goes; a summary goes by email and shows on Reports with its PDF.

---

## 26. Client Brain (AdmitLabs Clients only)

**Answers:** "What does our AdmitLabs team know about us?" One living knowledge base per Client college: everything the team needs to work for it. The college sees it as **Brain** in its menu (after Leads; under More on a phone); the team calls it **Client Brain**. Created at onboarding, kept up to date by both sides after it.

**Who.** Client only, never Free or Paid. The college's owner and members and the AdmitLabs team read and change it, while the college is a Client. **Team only notes**, the team's private notes, sit in it for the team alone. A Client that ends: the college no longer sees it, the team still reads it, nobody changes it, and it comes back if the college returns.

**Nine sections**, a list on the left (a row of chips on a phone), one open at a time, each at its own address, with an Overview first (what needs checking, what's missing, recent changes):

1. **Blueprint**: the plan AdmitLabs makes for the college, as PDF versions (below).
2. **Basics**: about the college (name, type and city from Settings; the year it started, approvals such as UGC, AICTE and the NAAC grade, the address); contacts (the main contact and who approves our content, each with name, role, phone and email, and more contacts); how they like to talk; goals (the top 3 this year, the admission target, main rivals, the cities and states they want students from).
3. **Programs**: for each program its level, duration, fees, seats, eligibility, admission dates, highlights and whether to push it most. The same details as Settings (section 6): one source, never two.
4. **Brand**: the logo (an upload or a Drive link), colours (each a small swatch with its name and hex: the client's data, the one colour in the dashboard), fonts, tagline, tone (friendly or formal, with a line), words or topics to avoid, what to do, and brand guidelines (a PDF or a link, optional).
5. **Proof**: approvals and rankings, awards, placements (each program's, from its details, and placement lists as links), known alumni and student reviews we may use. Alumni and reviews are a line and a link, never a phone number or an email; a review only with the student's agreement.
6. **Links**: the public pages Drishti checks (website, Instagram, YouTube, Facebook, LinkedIn, the Google Business profile; the owner changes them in Settings) and folders, listings and files (the shared Drive folder, Shiksha, CollegeDunia, the admission portal, brochures, photos and videos).
7. **Calendar**: the admission season, exams, fests, events, convocation, open days and days not to post, with each program's admission dates beside them.
8. **Content**: the content plan by month (draft or agreed), scripts (waiting or approved, and who approves), what worked, and the work log (an approved script goes into it in one click).
9. **Notes and decisions**: meeting notes, decisions, feedback and anything else, each with who and when; for the team, Team only notes first.

**Every fact** shows its value, where it came from and when (found by Drishti, added by a person, from Help us know you), Edit, and History: every change with who made it (their name, or their email), when, and what it was before. A missing must-have says what to add, or can be marked "Doesn't apply" with a reason where it may.

**Onboarding builds it.**

- When a college becomes a Client, the team clicks **Start onboarding** (the Client Brain tab on its page). Drishti pre-fills what its latest Audit found: the fees and program pages the website shows, the approvals held officially, the placements page and the listing sites. The team **confirms, corrects or takes out** each one; one that belongs to the details added by you is written there.
- **The kickoff call**: the team goes through the sections in order with every missing fact's form open.
- **Help us know you**: a form in the college's dashboard for what only it knows (basics and goals, each program, its brand files, proof, links, the calendar and anything else), saved into each section as it goes. While onboarding, Home opens with it.
- **Progress**: "Client Brain 80% complete" counts the must-have facts (the year started, approvals, address, the main contact, who approves content, how they like to talk, the goals, the admission target; each program's basics, fees and admission dates; the logo, colours, tone and words to avoid; rankings or awards and placements; a shared Drive folder; the admission season; the first month's content plan), with the list of what's missing. Optional facts never lower it.
- **The checklist**: Drive folder shared (with admitlabs@gmail.com, in config), brand kit received, social media access given (through each platform's own team invite, never passwords), photos and videos received, approval contact confirmed, first month's content plan agreed. The first, fifth and sixth need their fact in the Brain first. Each tick keeps who and when.
- **Ready**: the team clicks Mark as Ready once every must-have is in and the checklist is done. The college gets "Your Brain is ready" in Notifications. Until then the team's list says "Onboarding not finished".

**Living.** Anyone allowed updates it at any time, and every change is kept. **Needs checking** marks a fact older than its time **[ADJUSTABLE]**: fees and admission dates after 6 months, everything else after 12; notes, decisions, scripts and what worked never go stale. "Still right" starts the clock again. In the 8 weeks before admissions open **[ADJUSTABLE]**, the facts to check lead the Overview and Home's team card ("Before admissions open on 1 Dec, check 2 facts").

**It powers the rest of Drishti.** Ready fixes read its facts (a tagline, when admissions open, the admission portal, an email to write to, an alumnus to feature). Make these 3 is fitted to the brand when picked: the hook in its tone, one Brain fact in the key points, nothing it says to avoid. Leads forms use the college's own program list, the same one the Brain shows. The monthly summary, its email and the PDF carry the Brain in one line; the work log and the Brain link to each other.

**Ask the brain.** A box at the top: "What's the BBA fee?", "Who approves reels?". The answer, the section it came from and when it was checked, or where to add it when the Brain does not know. Answers come only from the Brain: never the internet, never Leads, and Team only notes only for the team. The AI writer answers it (section 17): a mock now, the Claude API later.

**Files.** Links first. A logo (PNG, JPG or WebP, up to 2 MB) and brand guidelines (a PDF, up to 10 MB) can be uploaded to a private bucket; nothing bigger. A file goes straight from the browser to the bucket through a signed upload link: the server makes the link only after checking the person, the college, the type and the size, and checks the stored file again before it is kept. Files never pass through the app's server, whose requests stay at the default size (a hosted server takes about 4.5 MB at most). A proper Google Drive connection comes with the backend.

**The Blueprint.** The plan AdmitLabs makes for a Client, as PDF versions, first in the Brain.

- **Upload blueprint** (Admins, Team members and the Client's managers): a PDF, up to 20 MB, straight from the browser to its own private bucket through a signed upload link, as the logo and guidelines go. Each upload is the next version, a Draft.
- **The latest version** leads: its number and status, the file name, when and by whom it was uploaded, shared and approved, and **View** and **Download**. **Past versions** below, each still viewable.
- **Status**: **Draft** (the team only), **Shared** (the college sees it) or **Approved**. The team moves a version between them.
- **The college** (the owner and members) sees only the Shared and Approved versions of its own Blueprint. On the latest Shared version it clicks **Approve**, or **Ask for changes** with a short note (up to 500 characters). Who and when are kept. Either way the Client's managers get an email (every Admin when it has none).
- **Ask the brain** reads the words of the latest Shared or Approved version, never a Draft. The AI reader reads the PDF when it is uploaded (section 17): a mock now that reads a PDF's plain text, so a PDF whose text is compressed, as a design tool makes it, reads as nothing until the real reader.
- **Needs checking** when the latest version is older than 90 days **[ADJUSTABLE]**: the team uploads a new version.
- **After Ready**: once the team clicks Mark as Ready, two steps follow, **Blueprint shared** and **Blueprint approved**, for the team on the Overview and in the Blueprint. They never hold Ready back.
- **The Clients list** shows each Client's Blueprint: None, Draft, Shared or Approved.
- **History** keeps every upload and status change and what the college said. A Draft's upload is the team's alone.

**Rules.** No passwords or login details anywhere in the Brain: every text is checked in the form and again in the database, and every page says "Use a password manager". No student data: that stays in Leads. The dashboard's design rules hold, monochrome but for a brand's own swatches.

---

## 27. The AdmitLabs team area

The team area (`/team`) for AdmitLabs: the menu, who can open what, and Enquiries (our own leads, not student data). Billing and renewals are not part of it yet.

**The menu.**

1. **Audit**: one item with three tabs, To review, Bulk Audit and Rival ads (each as in section 13). The count of what waits for review sits beside it.
2. **Enquiries**: AdmitLabs' own leads (below).
3. **Institutions**: everyone in Drishti, with tabs All, Free, Paid and Client.
4. **Clients**: every Client; each Client's page keeps its Client Brain as a tab. No separate Client Brain item.
5. **Team**: everyone on the AdmitLabs team, with their level. Admins only.

**Access levels**, enforced in the database (row level security and the database functions), not only in the menu:

| Level | Opens |
|---|---|
| Admin | Everything, including the Team page: adds and removes people and sets their level. Changes plans |
| Team member | Everything except the Team page and plan changes. Assigns Client managers; makes a won enquiry a Client |
| Client manager | Only the Clients assigned to them: each one's page, its Client Brain (onboarding, the checklist and Mark as Ready included), its dashboard read only ("view as"), its work log, team notes and Leads links, and its Audits and summaries to review. The rivals those Clients track, as the team sees them. Only the Enquiries they own. Nothing else: no other institution, no To review list, no Bulk Audit, no Rival ads, no Team page |

- How the database does it: `private.is_team()` means Admin or Team member, so every rule written for the team leaves a Client manager out. They come back in only through `private.manages()` (a Client assigned to them) and `private.manages_rival()` (a rival one of those Clients tracks), in read rules of their own beside the team's, and in the team's functions for a Client, which take `private.can_manage()`.
- Admins and Team members assign a Client manager on the Client's page; a Client may have more than one. Only a Client can have one, and only to someone whose level is Client manager. Someone who stops being a Client manager stops looking after any Client.
- A Client manager starts at Clients. Any page they may not open is "not found", as the team area is for everyone outside it.

**Enquiries: our own leads.** One list of every lead for AdmitLabs: people at colleges who may work with AdmitLabs, never students (students stay in a Client's Leads, section 23).

- **A lead**: name, institution (and the college in Drishti, when there is one), city, phone, email, what they want, source, status, owner (someone on the team), next follow-up date, and notes. Every change is kept with who and when: it came in, it came back, notes, status, owner and follow-up changes, edits, made a Client.
- **Status**: New, Contacted, Call booked, Proposal sent, Won, Lost. Lost needs a reason (Price, Timing, Chose someone else, No reply, Not a fit, Other) and may have a short note. Moving a lead on from New handles what came in from a dashboard, so the college can ask again later.
- **Sources that come in on their own**: the website's Talk to us form (Work with us), a new Free college (its owner, the day it signs up), Let AdmitLabs fix this (with the fix asked for), the services card, Asked for Paid and Asked to renew (from the dashboard, with the period).
- **Social sources**: Instagram, Facebook, LinkedIn, YouTube, WhatsApp, Referral, Event, Other. The team adds a lead by hand and picks one; a Client manager's are their own. The team's own tracking links per source: `admitlabs.in/talk/<code>` opens the Talk to us form, and what it sends is tagged with the link's source and name (an archived or unknown link still sends, untagged). Each link counts what came through it.
- **Meta lead ads**: a provider slot (`lead_import`, section 17) for importing them later, shown as "Not connected". Nothing connects in this build.
- **Never a duplicate**: the same email, or the same phone (the last 10 digits, so +91 98765 43210 and 9876543210 match), joins the lead there is: what it brought shows there, and History says it came back. Nothing the team wrote is replaced; only what was missing is filled in.
- **A Lost lead that comes back** (through the website, a dashboard, or added by hand) is New again. History keeps what it was Lost for ("Status: New again. It had been Lost: Price"), and the email says it came back after Lost.
- **Alerts**: each new lead emails its owner, or every Admin when it has none; a lead that comes back emails the owner (every Admin when it has none), and one that had been Lost says so ("Came back after Lost"). Never the person who added it by hand. The database queues them and the server sends them straight away (`src/enquiries/jobs.ts`); a problem sending never loses the enquiry.
- Who sees what: Admins and Team members every lead and every link; a Client manager the leads they own, and what came in for them. Only Admins and Team members give a lead an owner and make links. Every change goes through database functions that check the same.

**The Enquiries screens** (`/team/enquiries`):

- **The list**: the open leads first, by the next follow-up (overdue at the top), then the latest to come in. Each row: who and their institution and city, what they want, status and when it came in, source, owner ("You" for your own), next follow-up; "Follow-up overdue", "Follow up today" and "Came back" when they apply. On a phone the status, source and owner sit under the name.
- **Tabs and filters**: Open, New, Contacted, Call booked, Proposal sent, Won, Lost, All; search by name, institution, email or phone; source; owner (Anyone, Mine, Nobody yet, or a person; Admins and Team members); follow-up due. Counts above: open, new, follow-ups due.
- **Add a lead by hand**: name, institution, city, phone or email (one at least), where they came from (a social source), owner (Admins and Team members; a Client manager's are their own), next follow-up, what they want and a first note. The same phone or email joins the lead there is, and the page says so.
- **Download CSV**: the leads the filters show, with every note, phones as "91 98765 43210" (a spreadsheet keeps them as text), a formula never run.
- **A lead's page**: where it stands (status; Lost asks why and takes a short note; owner, for Admins and Team members; the next follow-up), how to reach them (phone and email as links), their college in Drishti (find it by name or website and link it, or take the link off), what came in (each enquiry as it was sent: the form with its message and tracking link, a Paid request with its period and price, the services card, a fix with its place, a sign up), the details to correct, notes, and History with who and when.
- **Make Client** (Admins and Team members, once Won): when the lead is linked to a college that has signed up, it sets the college's plan to Client (as Make them a Client on its page does) and starts onboarding: the Client Brain opens, the first Client Audit runs, and what Drishti found waits to be confirmed. The lead then says when it was made a Client, with a link to the Client Brain. A Client manager sees "An Admin or a Team member makes them a Client".
- **Make Client for a college not in Drishti** (Admins and Team members, once Won, with no college that has signed up): add the college (name, type, city, website) and the owner's email. Drishti adds the college, signed up by the team, makes it a Client and starts onboarding, and emails the owner to sign in: an owner invitation (`invites.role`), so they come in as its owner (as a member, if the college has an owner already). Never a duplicate: when the owner's email already belongs to a college in Drishti (a member, or an invitation waiting), or the website is a college that has signed up, that college is linked instead; a record with the same website that has not signed up (a prospect, a rival record), or the one the lead is linked to, becomes the college. Its first Client Audit runs once it has programs (the owner adds them in Settings).
- **Tracking links** (Admins and Team members): make one (a name and where it is used), copy its address, see how many enquiries it brought this month and in all, archive it. Under them, Meta lead ads: Not connected.

**Sample.** `manager@admitlabs.example` (Farhan Ali) is a Client manager who looks after Brightpath. Enquiries has 11 leads: Northbank, Silverline and Loomcraft from their Free sign ups (Northbank came back to ask about a fix and for Paid, Loomcraft through the services card, Silverline was won and made a Client), five from the Talk to us form (Rahul Mehta through the Instagram bio link; Sunita Borah came back through the EduConnect fair link), Eastgate's fix request, and two added by hand (a referral, and Fatima Khan from LinkedIn, Farhan's). Statuses from New to Won, one Lost for Price. The sample emails nobody.
