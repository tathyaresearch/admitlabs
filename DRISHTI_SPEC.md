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
| `/login` | Email OTP login |
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

The addresses are settings in `.env` (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PRODUCT_URL`), so moving them is a config change only. Locally the website is http://admitlabs.localhost:3000 and the dashboard http://localhost:3000. The website's pages live at `/site` inside the app. Search engines may crawl only the website's address (`robots.txt`), which lists its pages in `sitemap.xml`.

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

After onboarding, Free users pick the **one program** their Free Audit covers.

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
| 0 to 39 | At risk |

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
2. **Area by area**: every check with its result (Strong, Okay, Weak, Missing), what Drishti found, where it found it (source link) and the date checked.
3. **What's working**: top 3 strengths. Shown first.
4. **What to fix**: gaps ranked by impact (points that could be gained). Each shows what's wrong, why it matters to a student, and how hard it is to fix (Easy, Medium, Hard).
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
6. **5 content ideas**: each built on a real student question, with its source.

### 9.5 Rules

- **Grouped only.** Never show or store individual students' names or profiles. Store the topic, the count and the source link, not the person.
- **Source shown** for every insight.
- **Shared pulls.** Demand data is collected once per region + program and shared by every institution that needs it. This keeps running costs low.

---

## 10. What each plan sees

| | Free | Paid | Client |
|---|---|---|---|
| **Audit** | | | |
| Overall score and 3 pillar scores | Yes | Yes | Yes |
| Area by area | Results only, details blurred | Full, with sources | Full, with sources |
| What's working | Top 3 | Full | Full |
| What to fix | Top 3 | Full ranked list | Full ranked list |
| Programs | 1 | All | All |
| Score history | No | Yes | Yes |
| **Rivals** | | | |
| Suggested rivals | Yes | Yes | Yes |
| Ahead or behind (overall only) | Yes | Yes | Yes |
| Full comparison, best content, moves, ads | Blurred | Yes | Yes |
| Change rivals | No | Once a month | Anytime |
| **Demand** | | | |
| 1 rising trend | Yes | Yes | Yes |
| Everything else | Blurred | Yes | Yes |
| Mentions of you and rivals | No | Yes | Yes |
| **Other** | | | |
| Alerts (rival moves, demand spikes) | No | Yes | Yes |
| Monthly PDF report | No | Yes | Yes |
| AdmitLabs team acts on it | No | No | Yes |

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
- Free users get a nudge when a new free Audit is available: "Your new Audit is ready. See what changed."
- In this build, schedules run against mock providers. Build a way to trigger any scheduled run by hand for testing.

---

## 12. Monthly report (PDF)

- One PDF per institution per month. Downloadable from `/reports`. Paid and Client only.
- Stored in Supabase Storage.
- Same brand as the dashboard (section 14): the overall score on its gauge, each result as a thin bar of the points it earns with the word, check and pillar icons, and bars for what each fix could add, how fast a trend rises and how often a question is asked.

**Contents, in order:**

1. Cover: institution name, month, overall score and label
2. Score summary: overall, three pillars, change since last month
3. What's working (top 3)
4. What to fix (ranked)
5. By program (one short block each)
6. Rivals: head to head, each pillar against every rival, key moves
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
| Login | Email, then OTP |
| Onboarding | The input form from section 6, then program pick for Free |
| Home | Overall score on its gauge with the score month by month, how far the next band is, 3 pillars (each with its trend, how many of its checks are Strong and its weakest check), change, top 3 fixes, rival snapshot with the latest move, 1 demand highlight with its searches by month, 3 things to do |
| Audit | Pillars, all checks with results and points earned against possible, what's working, what to fix, score history, program switcher |
| Program detail | Same as Audit, for one program |
| Check detail | Side panel: result, what was found, source link, date checked, how to fix, difficulty, details added by you |
| Rivals | Rival list, head to head table, each pillar against every rival, overall score month by month, where you lead, moves, best content |
| Rival detail | One rival's full view, pillar by pillar and month by month |
| Demand | Region switch (City, State, All India), 6 output sections from 9.4, the fastest rise by month, rising and falling as bars |
| Reports | List of monthly PDFs, download, the score trend |
| Plan | Current tier, dates, what Paid unlocks, renewal reminder state, a table comparing the plans |
| Settings | Institution details, programs, social links, users, details added by you (section 6) |
| Notifications | Alerts list |

**Team screens (`/team`)**

| Screen | Contents |
|---|---|
| Team home | All institutions: search, filter by type, city, state, score, tier, prospect or client |
| Bulk Audit | Add many institutions at once (paste list or CSV), run Audits, see results in a table |
| Institution detail | Everything the institution sees, plus private notes, tier control (Admin), manual refresh |
| Share | Create a share link or PDF of a prospect's Audit |
| Manual entry | Enter rival ads and any data a provider can't collect yet |
| Enquiries | Everyone who wrote in through the website's Work with us form, newest first: name, role, institution, email, phone, program and message. New or All. Mark as handled, or back to new. Every team user sees them. No emails are sent |

**Team rules**

- Prospect Audits run by the team stay private until the team shares them.
- A prospect's shared Audit does **not** use up their Free Audit.
- Private notes are never visible to institution users.

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

Confirm these hex values against the AdmitLabs brand identity PDF before Phase 1 ends. Greys between black and ivory are allowed. **No accent colour. No green, amber or red. No gradients, no glow.** One exception: the AdmitLabs website (section 22), the `/drishti` product page included (section 15), may use subtle monochrome gradients (black to graphite, soft ivory tones) for light, depth and section transitions. Never colour, neon or glow. The dashboard keeps no gradients.

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
  - **A**, in the dashboard, login and a shared Audit: the eye opens as it appears, then blinks once every 23 seconds, and once on hover. The lashes follow the lid.
  - **C**, on `/drishti` and the website: the same, and the iris turns gently towards the pointer (on a phone it looks ahead, and a tap blinks).
  - **The Rise reveal**, once, as the intro of the `/drishti` hero and the website's Drishti section (when it comes into view, not on every scroll): the eye, half open, rises from behind the word and peeks over the top of the D, looks left and right, glides down into its place, opens fully and blinks once; then it is C.
  - **Still**: pictures of the product, the Products menu, the PDFs and link previews.
  - With reduced motion turned on, every eye is still and open.
- Favicon: the eye on a black rounded square for the dashboard, login and `/drishti`. The website's own pages keep the "AL" mark.
- Motion files: `brand/motion` holds the Rise reveal and the Side reveal (the eye comes out from behind the D) as MP4 and GIF, square and wide, on black and ivory, with and without "by AdmitLabs". `npm run motion:record` makes them again from the development-only stage at `/drishti/motion`.

**Contrast**

Comes from scale, weight, black and ivory surface flips, and inverted highlight blocks. Never from colour.

**Showing Strong, Okay, Weak, Missing without colour**

- In rows and lists: a thin bar of the points earned against the points possible (for example 18/30), then the word. Missing is an empty dashed bar. One style for every result, on screen and in the PDF, so a list reads evenly.
- In compact grids: one small square per check, in four shades: Strong solid (ivory on black, black on ivory), Okay mid grey, Weak dark grey with a thin outline (so it stands out from the surface at least 3 to 1), Missing a dashed outline. A small key sits nearby.
- Readable on black and on ivory. The word is always available: beside the bar, on hover, and for screen readers. Never rely on the shape alone.
- The overall score sits on a large gauge: filled to the score out of 100, with a notch where Needs work (40) and Strong (70) begin. The number, in Inter, sits centred inside the arc on its baseline, never touching it, with "/100" smaller on the same baseline; "0" and "100" line up under the arc's two ends (left out on a small gauge). The same drawing on screen and in the PDF.

**Icons and logos**

- Line icons drawn for Drishti (thin strokes, square ends, no icon library): one for each of the 17 checks, the 3 pillars and the main sections. The same icons in the PDF.
- Real one-colour logos only for Instagram, X and YouTube (from Simple Icons, CC0), unchanged and in the colours each brand allows. Source and licence are kept next to the files.
- Every other platform (Google, Google Maps, Facebook, LinkedIn, Reddit, Quora, ChatGPT, Gemini, Perplexity, websites) gets a neutral line icon and its name, until AdmitLabs has permission to use its logo.
- Icons are decoration. The name always sits beside them.

**Charts**

- Hand-built, monochrome: you in the text colour, rivals in grey, each named on the chart. No legend to decode.
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
2. **The problem** (ivory): "Most teams guess. Drishti checks." beside a Drishti card with the sample university's answers to the three questions, each with where it came from: its score (number, thin bar and word) from the Audit's 17 checks of public pages; its place among its rivals, by name, from each one's own Audit; the questions students ask most in its city, each with the site it was asked on and how often; and under them one small line with the search rising fastest and its numbers (Search trends). The date it was last checked
3. **The three features**, each in the same frame: a bar with its name (heavy and narrow, with the dashboard's icon), its question and its place ("1 of 3"), which stays under the header while its pictures pass, on a phone too; one short line; then the product across the full width on a dark stage. The Audit with its score gauge, what to fix first and every check; Rivals with the ladder, the latest move and each pillar; Demand with the fastest rise by month, what else is rising and the question asked most
4. **The score**, inside the Audit (its label says so): "One score, from 17 checks." Beside the words, the sample's overall score; then a table of the three parts side by side (Discovered, Trusted, Chosen; stacked on a phone), each with its question and its score on a thin bar, and its checks, one to a row, each with its result. A table: every row one height, every bar one width in one place, the result words in one column; the rows line up across the parts, and Trusted, with one check fewer, ends in an empty slot ruled like the rest. A check made for each program shows its weakest program, as the Audit's grid does. The only numbers are the total and the three part scores, which average to it: no points per check. Then, compact, what each result earns
5. **Public data only**: the rules every result follows, in one framed band
6. **How it works**: four steps on a line that fills as the page moves: enter details, Drishti checks everything, see results, get a monthly report
7. **Sample report** (ivory): three of its pages fanned out, and the download of the full sample PDF, marked "Sample report. Fictional data." on every page
8. **Plans**: Free and Paid (₹9,999 for 6 months, no auto-renew), Paid on ivory, then every feature compared
9. **For AdmitLabs clients**: included free, with the team acting on it
10. **FAQ**: data sources, privacy, what "public data only" means, renewal
11. **Final call to action**: "Get your free Audit", under the same light as the top of the page

**Motion**, calm and almost all CSS: sections and headings fade and rise in; each feature's bar holds its place while its pictures pass; the score counts up while its gauge draws; points bars fill; the rivals slide into rank order; Demand's bars grow; the report's pages fan out; buttons, cards and plans answer the pointer. With reduced motion, or no script, everything shows settled.

"Get your free Audit" leads to `/login` then `/onboarding`.

---

## 16. Data model (Postgres)

Starting shape. Claude Code may refine names and types, but must keep the ideas.

| Table | Key fields |
|---|---|
| `institutions` | id, name, type (college, university, skilling), city, state, website, instagram, youtube, other_links (jsonb), claimed (bool), is_prospect (bool), created_at |
| `programs` | id, institution_id, name |
| `memberships` | user_id, institution_id, role (owner, member) |
| `team_users` | user_id, role (team, admin) |
| `plans` | institution_id, tier (free, paid, client), starts_at, ends_at, set_by, free_program_id |
| `signals` | id, institution_id, program_id (nullable), provider, check_key, value (jsonb), source_url, fetched_at |
| `audits` | id, institution_id, run_at, kind (free, paid, client, team), overall, discovered, trusted, chosen, config_version |
| `audit_program_scores` | audit_id, program_id, overall, discovered, trusted, chosen |
| `audit_checks` | audit_id, program_id (nullable), pillar, check_key, result, points_awarded, points_max, finding, how_to_fix, difficulty, source_url, checked_at |
| `rivals` | institution_id, rival_institution_id, suggested (bool), added_at |
| `rival_moves` | id, rival_institution_id, kind, description, source_url, detected_at |
| `rival_content` | id, rival_institution_id, platform, url, metrics (jsonb), why_it_worked, month |
| `rival_ads` | id, rival_institution_id, promise, source_url, entered_by, entered_at |
| `demand_pulls` | id, scope (city, state, india), region, program_key, month |
| `demand_items` | id, pull_id, kind (rising, falling, question, worry, mention, season, idea), text, language, count, source_url, found_at |
| `actions` | institution_id, month, rank, text, feature (audit, rivals, demand) |
| `reports` | institution_id, month, storage_path, created_at |
| `notifications` | id, institution_id, kind, text, read, created_at |
| `notes` | id, institution_id, author_id, body, created_at (team only) |
| `share_links` | token, institution_id, audit_id, created_by, created_at |
| `institution_details` | institution_id, the details added by the institution (section 6), updated_at, updated_by. Never read by scoring |
| `program_details` | program_id, institution_id, the details added for each program (section 6), updated_at, updated_by. Never read by scoring |
| `scoring_config` | version, weights (jsonb), result_shares (jsonb), thresholds (jsonb), labels (jsonb), active (bool) |
| `enquiries` | id, created_at, name, institution, role (founder_director, principal_dean, admissions, marketing, other), email, phone, program, message, handled_at, handled_by (website, section 22) |

**Row Level Security:**
- Institution users only see their own institution's data, filtered by plan.
- Team and Admin see everything.
- Notes are team only.
- Enquiries: anyone can send one, only through `submit_enquiry` (at most 3 a day from one email). Only the team reads them and marks them handled.
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
- A spread of scores: some Strong, some Needs work, some At risk.
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

**Pages:** the home page (`/`), Work with us (`/work-with-us`) and the product page (`/drishti`, section 15, in the same style). One header on every page: Services, Products (a small menu: Drishti, with its eye, still, before the name, and Tathya, which opens mytathya.in in a new tab), How we work, FAQ, "Work with us" and "Get your free Audit" (a menu on a phone, with both products); clear over the light at the top, glass once the page moves. The logo and the buttons keep clear of the frame's lines and crosses, on a desktop and on a phone. One footer: "© 2026 AdmitLabs" (the current year), the email, Drishti and Sign in.

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
