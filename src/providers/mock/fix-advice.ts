// The written bank behind the mock analysis provider's fix advice: why each check matters to
// a student, how to fix it, and how hard that is. Later the Claude API writes this from the
// same facts. Rules: plain words, short sentences, no dashes, and a low result is always an
// opportunity, never a failure.

import type { CheckFacts } from '../../domain/facts.ts';
import type { CheckKey, CheckResult, Difficulty, InstitutionType } from '../../domain/types.ts';
import type { FixAdvice } from '../analysis.ts';

type Gap = Exclude<CheckResult, 'strong'>;

interface AdviceContext<K extends CheckKey> {
  facts: CheckFacts[K];
  institutionType: InstitutionType;
  /** The program name, or a stand in such as "this program" for program checks. */
  program: string;
}

interface Entry<K extends CheckKey> {
  why: (context: AdviceContext<K>) => string;
  fix: { readonly [R in Gap]: (context: AdviceContext<K>) => { text: string; difficulty: Difficulty } };
}

const open = (text: string) => `“${text}”`;

function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

const BANK: { readonly [K in CheckKey]: Entry<K> } = {
  google_search: {
    why: () => 'Most students start with a Google search for the course and the city. The first few results get almost all of the clicks.',
    fix: {
      okay: ({ program }) => ({
        text: `You are already on page 1. To reach the top 3, make sure ${program} has its own page that uses the words students search for, such as the program name with your city, and link to it from your home page.`,
        difficulty: 'medium',
      }),
      weak: ({ program }) => ({
        text: `You are close to page 1. Give ${program} its own detailed page with the program name and your city in the title and the first lines, and link to it from your home page and Google profile.`,
        difficulty: 'medium',
      }),
      missing: ({ program }) => ({
        text: `Students searching for ${program} in your city do not find you yet. Start with a clear page for ${program}, named the way students search, and link to it from your home page, Google profile and social pages.`,
        difficulty: 'hard',
      }),
    },
  },

  instagram_activity: {
    why: () => 'Students check Instagram to see real campus life before they enquire. Regular posts and reels keep you in their feed while they decide.',
    fix: {
      okay: () => ({
        text: 'Post 3 or more times a week and make most of them reels. Short clips of classes, events and students work well.',
        difficulty: 'medium',
      }),
      weak: () => ({
        text: 'Post at least once a week to start, then build up to 3 a week, mostly reels. Plan a month of posts at a time so the feed never goes quiet.',
        difficulty: 'medium',
      }),
      missing: () => ({
        text: 'Create an Instagram account for the institution and post at least 3 times a week, mostly reels. Your phone camera is enough to start.',
        difficulty: 'medium',
      }),
    },
  },

  google_profile: {
    why: ({ institutionType }) =>
      institutionType === 'skilling'
        ? 'For a skilling institute, a Google profile with reviews is often the first thing a learner sees, so it counts for more in your score.'
        : 'A Google profile puts you on Maps and in local searches. The number of reviews is one of the first things parents look at.',
    fix: {
      okay: () => ({
        text: 'Ask students and parents for a Google review at good moments, like results day and admission day. A QR code at the front desk makes it easy.',
        difficulty: 'medium',
      }),
      weak: () => ({
        text: 'Your profile is in place. Now build reviews: ask every new batch and happy parents, and share the review link on WhatsApp.',
        difficulty: 'medium',
      }),
      missing: () => ({
        text: 'Create and verify a free Google Business Profile with your address, hours, photos and website. It takes about an hour to set up.',
        difficulty: 'easy',
      }),
    },
  },

  youtube: {
    why: () => 'Many students watch videos to understand a course and a campus before they apply. A channel with fresh videos builds trust over time.',
    fix: {
      okay: () => ({ text: 'Post at least one video every month. Student stories, course explainers and campus tours are good places to start.', difficulty: 'medium' }),
      weak: () => ({ text: 'Your channel has gone quiet. Restart with one video a month, such as a course explainer or a student story.', difficulty: 'medium' }),
      missing: () => ({ text: 'Create a YouTube channel and post one video a month. A phone and good light are enough to start.', difficulty: 'medium' }),
    },
  },

  ai_answers: {
    why: () => 'More students now ask AI assistants which institution to choose. Being named in those answers puts you on their shortlist.',
    fix: {
      okay: ({ program }) => ({
        text: `Assistants learn from what is public. Keep the details of ${program}, fees, placements and reviews clear and the same across your website, Google profile and listings.`,
        difficulty: 'medium',
      }),
      weak: ({ program }) => ({
        text: `Assistants know you, but not yet for ${program}. Make ${program} easy to find on your website, and get listed on trusted education directories and local news.`,
        difficulty: 'hard',
      }),
      missing: () => ({
        text: 'Assistants do not know you yet. Make sure your website clearly says who you are, where you are and what you teach, and get listed on trusted education directories.',
        difficulty: 'hard',
      }),
    },
  },

  other_socials: {
    why: () => 'Parents often look for you on Facebook, and LinkedIn shows your placements and faculty. An active page shows you are running and growing.',
    fix: {
      okay: () => ({ text: 'Post at least once a month on Facebook or LinkedIn. Share results, events and placement news you already have.', difficulty: 'easy' }),
      weak: () => ({ text: 'Your pages have gone quiet. Share one update a month, such as an event, a result or a placement.', difficulty: 'easy' }),
      missing: () => ({ text: 'Create a Facebook page, and a LinkedIn page if you place students in jobs. Then post once a month.', difficulty: 'easy' }),
    },
  },

  placement_proof: {
    why: () => 'Placements and results are the biggest worry for most students and parents. Clear numbers and company names are the proof they look for.',
    fix: {
      okay: ({ facts, program }) =>
        facts.hasCompanies
          ? { text: `Update the placement numbers for ${program} after every placement season, and show the year clearly.`, difficulty: 'medium' }
          : { text: `Add the names of the companies that hired from ${program}, with the year, next to the numbers you already show.`, difficulty: 'medium' },
      weak: ({ program }) => ({
        text: `Replace general claims with real numbers for ${program}: how many were placed, where, and in which year.`,
        difficulty: 'medium',
      }),
      missing: ({ program }) => ({
        text: `Add a placements or results section for ${program} with numbers, company names and the year. Even a small first batch is worth showing.`,
        difficulty: 'medium',
      }),
    },
  },

  review_rating: {
    why: () => 'Students read reviews to see how you treat people. A good rating and polite replies to reviews both count.',
    fix: {
      okay: ({ facts }) =>
        facts.rating !== null && facts.rating >= 4.3
          ? { text: 'Your rating is good. Reply to every review, good or bad, within a few days. A short, polite reply shows students you listen.', difficulty: 'easy' }
          : {
              text: 'Reply to every review and fix the issues that come up again and again. Then ask happy students and parents to share their experience.',
              difficulty: 'medium',
            },
      weak: () => ({
        text: 'Read your reviews for the issues that repeat and fix those first. Reply to every review politely, and ask satisfied students and parents to add theirs.',
        difficulty: 'medium',
      }),
      missing: () => ({
        text: 'Ask your current students and alumni to leave a Google review. Share the review link on WhatsApp after results or events.',
        difficulty: 'easy',
      }),
    },
  },

  approvals: {
    why: ({ institutionType }) =>
      institutionType === 'skilling'
        ? 'Learners want to know a course is recognised. Showing your skilling recognition, with proof, answers that at once.'
        : 'Parents want to know a degree is recognised. Showing approvals such as UGC, AICTE, NAAC or NIRF, with proof, answers that at once.',
    fix: {
      okay: () => ({
        text: 'Add the certificate or an official link for each approval you mention, on one clear page linked from every page.',
        difficulty: 'easy',
      }),
      weak: ({ facts, institutionType }) => {
        const notShown = (facts.held ?? []).filter((name) => !facts.shown.includes(name));
        const what = institutionType === 'skilling' ? 'recognition' : 'approvals';
        return {
          text: notShown.length
            ? `You hold ${list(notShown)} but do not show ${notShown.length === 1 ? 'it' : 'them'}. Add every one of your ${what} to your website, with the certificate or an official link.`
            : `Show all of your ${what} on your website, with the certificate or an official link.`,
          difficulty: 'easy',
        };
      },
      missing: ({ facts, institutionType }) => {
        const held = facts.held ?? [];
        const what = institutionType === 'skilling' ? 'skilling recognition' : 'approvals';
        return held.length
          ? { text: `Show the ${what} you hold (${list(held)}) on your website, with the certificate or an official link.`, difficulty: 'easy' }
          : {
              text: `No ${what} were found. If you hold any, add them with proof. If not, recognition is worth planning for, because students ask about it.`,
              difficulty: 'hard',
            };
      },
    },
  },

  faculty_leaders: {
    why: () => 'Students want to know who will teach them. Named faculty with photos and qualifications, and leaders who speak in your content, build trust.',
    fix: {
      okay: ({ facts }) => {
        const missing = [facts.photos ? null : 'photos', facts.qualifications ? null : 'qualifications'].filter((item): item is string => item !== null);
        const page = missing.length ? `Add ${list(missing)} to your faculty page` : 'Keep your faculty page up to date';
        return { text: `${page}, and feature your leaders in posts and videos.`, difficulty: 'easy' };
      },
      weak: () => ({ text: 'Turn your list of names into a faculty page with a photo and qualifications for each teacher.', difficulty: 'easy' }),
      missing: () => ({
        text: 'Add a faculty page with names, photos and qualifications, and a short message from your head of institution.',
        difficulty: 'medium',
      }),
    },
  },

  students_in_content: {
    why: () => 'Real students and alumni in your posts show what life with you is really like. Students trust other students more than any advert.',
    fix: {
      okay: () => ({ text: 'Feature a real student or alumnus every month. Short interviews, day in the life reels and success stories all work.', difficulty: 'medium' }),
      weak: () => ({ text: 'Swap stock photos for your own students and alumni, with their permission. A monthly student story is a good start.', difficulty: 'medium' }),
      missing: () => ({ text: 'Start a monthly student or alumni feature, with their permission. Real faces make your content believable.', difficulty: 'medium' }),
    },
  },

  fees_shown: {
    why: () => 'Fees are one of the first things students and parents check. When fees are hidden, many move on to an institution that shows them.',
    fix: {
      okay: ({ program }) => ({ text: `Show the full fee for ${program}, year by year, including any other charges, in one clear table.`, difficulty: 'easy' }),
      weak: ({ program }) => ({
        text: `Replace ${open('Contact us for fees')} with the actual fee for ${program}. You can still invite students to ask about scholarships.`,
        difficulty: 'easy',
      }),
      missing: ({ program }) => ({ text: `Add the fee for ${program} to its page, year by year, with any other charges listed.`, difficulty: 'easy' }),
    },
  },

  program_page: {
    why: () => 'Each program needs its own page, so students can find it on Google and see everything in one place: what they learn, fees, eligibility and careers.',
    fix: {
      okay: ({ program }) => ({
        text: `Expand the ${program} page to cover what students learn, eligibility, duration, fees, placements and how to apply.`,
        difficulty: 'medium',
      }),
      weak: ({ program }) => ({
        text: `Give ${program} its own page instead of a line on a combined page. Include what students learn, eligibility, fees and careers.`,
        difficulty: 'medium',
      }),
      missing: ({ program }) => ({
        text: `Add ${program} to your website on its own page, with what students learn, eligibility, fees and careers.`,
        difficulty: 'medium',
      }),
    },
  },

  easy_enquiry: {
    why: () => 'When students are interested, they want to ask a question right away. A form and WhatsApp on every page make that easy, and bring more enquiries.',
    fix: {
      okay: ({ facts }) =>
        facts.pagesWithWhatsapp >= facts.pagesChecked
          ? { text: 'Add a short enquiry form to every page, next to your WhatsApp button.', difficulty: 'easy' }
          : { text: 'Add a WhatsApp button to every page, next to your enquiry form.', difficulty: 'easy' },
      weak: () => ({ text: 'Bring your enquiry form out of the contact page. Put a short form and a WhatsApp button on every page.', difficulty: 'easy' }),
      missing: () => ({ text: 'Your enquiry form did not work when we checked. Fix it first, then add a WhatsApp button to every page.', difficulty: 'easy' }),
    },
  },

  admission_steps: {
    why: () => 'Students need to know exactly how to apply and by when. Clear steps with dates mean fewer drop offs and fewer phone calls.',
    fix: {
      okay: ({ program }) => ({ text: `Add the key dates for ${program}: when applications open and close, and when classes start.`, difficulty: 'easy' }),
      weak: ({ program }) => ({
        text: `Turn general admission information into numbered steps for ${program}, with the documents needed and the dates.`,
        difficulty: 'easy',
      }),
      missing: ({ program }) => ({ text: `Add a simple how to apply section for ${program}: numbered steps, documents needed and key dates.`, difficulty: 'easy' }),
    },
  },

  mobile_friendly: {
    why: () => 'Most students browse on their phone. If your site is hard to use on a phone, they leave before they enquire.',
    fix: {
      okay: ({ facts }) => ({
        text: `Fix the one issue found on phones${facts.issues[0] ? `: ${facts.issues[0].toLowerCase()}` : ''}. Then check your key pages on a phone.`,
        difficulty: 'medium',
      }),
      weak: ({ facts }) => ({
        text: `Fix the issues found on phones${facts.issues.length ? `: ${list(facts.issues.map((issue) => issue.toLowerCase()))}` : ''}. A web developer can usually sort these out in a few days.`,
        difficulty: 'medium',
      }),
      missing: () => ({ text: 'Your website did not load on a phone. Ask your web developer to fix this first, because it affects every visitor.', difficulty: 'hard' }),
    },
  },

  page_speed: {
    why: () => 'A slow site loses students before the page even opens, and Google shows faster sites higher.',
    fix: {
      okay: () => ({
        text: 'Compress large images, remove unused plugins and scripts, and use good hosting. Aim for a speed score of 90 or more.',
        difficulty: 'medium',
      }),
      weak: () => ({
        text: 'Start with images, which are usually the biggest cause. Then remove unused plugins and scripts, and check your hosting.',
        difficulty: 'medium',
      }),
      missing: () => ({ text: 'Your website did not load for the speed test. Ask your web developer to check the hosting and fix any errors first.', difficulty: 'hard' }),
    },
  },
};

export function writeFixAdvice<K extends CheckKey>(input: {
  checkKey: K;
  result: CheckResult;
  facts: CheckFacts[K];
  institutionType: InstitutionType;
  programName: string | null;
}): FixAdvice {
  const entry = BANK[input.checkKey] as Entry<K>;
  const context: AdviceContext<K> = { facts: input.facts, institutionType: input.institutionType, program: input.programName ?? 'this program' };
  const whyItMatters = entry.why(context);
  if (input.result === 'strong') return { whyItMatters, howToFix: null, difficulty: null };
  const fix = entry.fix[input.result](context);
  return { whyItMatters, howToFix: fix.text, difficulty: fix.difficulty };
}
