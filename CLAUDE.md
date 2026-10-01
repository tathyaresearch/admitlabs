# Drishti by AdmitLabs: instructions for Claude Code

You are building **Drishti**, an institution-facing product by AdmitLabs. It helps private colleges, universities and skilling institutes see where they stand, who's ahead, and what students want.

**Read `DRISHTI_SPEC.md` fully before doing anything.** It is the single source of truth.

## How to work

1. **Phase by phase.** Follow the build phases in section 19 of the spec. One phase at a time.
2. **Plan first, then build.** At the start of each phase, share a short plan (what you will build, files and folders, any questions) and **wait for approval** before writing code.
3. **Stop at the end of each phase.** Give a short summary: what was built, how to run and check it, anything left open. Do not start the next phase until told.
4. **Ask, don't guess.** If the spec doesn't cover something that changes the product (a screen, a rule, a price, copy, a plan limit), ask. Small technical choices are yours; mention them in the phase summary.
5. **Sample data only.** Use the mock providers from section 17. Do not connect any real external service, API, payment or messaging system. Do not add API keys.
6. **Keep it lean.** No libraries beyond what the spec names unless there is a clear reason. Say why when you add one.
7. **Test the scoring engine properly.** It is a pure function. Cover every check, both institution types, all four results, rounding and labels.

## Accounts (very important)

This computer is logged in to **several different GitHub, Vercel and Supabase accounts** used for other products. None of them are for Drishti yet.

- **Never use, connect to, push to, deploy to or create anything in any GitHub, Vercel or Supabase account** without asking first.
- Before any action that touches one of these services, **stop and ask** which exact account and project to use. Show the account name you see and wait for a clear yes.
- Do not reuse any existing project, repo, database or keys, including Tathya's.
- Do not run `git push`, `vercel`, `supabase link`, `supabase login` or `supabase db push` without approval.
- Phases 1 to 7 run **locally only**: local Supabase (Supabase CLI with Docker), local Next.js. Git is local only until told otherwise.

## Stack (summary)

Next.js 16 (App Router), React 19, TypeScript strict, Supabase (local via Supabase CLI), CSS Modules with CSS custom properties, hand-built SVG charts, @react-pdf/renderer, Node's built-in test runner. No ORM, no Tailwind, no component library.

This machine is **Windows**. The project folder is `D:\Drishti`. All scripts and commands must work on Windows.

## Brand rules (never break)

- **Strictly monochrome.** Black #0A0A0C, Graphite #1E1F23, Ivory #F2E8D6, Slate #8A8D94, and greys between. No accent colour. No green, amber or red. No gradients or glow.
- **Two fonts, two jobs.** Bricolage Grotesque for all headings, text and buttons. Inter only for numbers that stand on their own (scores, points, prices, counts, percentages, numbers in tables), with tabular figures. Numbers and dates inside a sentence stay in Bricolage. No other font.
- Contrast from size, weight, width, black and ivory surface flips, and inverted blocks.
- Strong, Okay, Weak, Missing shown with a small semi-circle gauge plus the word. Never colour.
- **No em dashes or en dashes** anywhere in UI, pages or PDF.
- Plain language, short sentences. A low score is an opportunity, never a failure.
- Premium SaaS feel. Works on phone.

## Product rules (never break)

- Public data only. Every result shows what was found, its source and date.
- Learn from rivals, never copy. Rivals never know who tracks them.
- Demand is grouped only. No individual students stored or shown.
- Plan limits enforced on the server, not just hidden in the UI.
- Blurred content is placeholder content, never real data hidden with CSS.
- No discounts on any plan.

## First task

Read `DRISHTI_SPEC.md`. Then share your plan for **Phase 1: Foundation** (folder structure, schema outline, design system approach, mock provider design, sample data plan, and any questions). Wait for approval.
