// The written bank behind the mock analysis provider's fix advice: why each check matters to
// a student, how to fix it in short steps, and how hard that is. Later the Claude API writes this
// from the same facts. Rules: plain words, short sentences, no dashes, each step one thing to do,
// and a low result is always an opportunity, never a failure.

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

interface Fix {
  steps: readonly string[];
  difficulty: Difficulty;
}

interface Entry<K extends CheckKey> {
  why: (context: AdviceContext<K>) => string;
  fix: { readonly [R in Gap]: (context: AdviceContext<K>) => Fix };
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
        steps: [`Make sure ${program} has its own page.`, `Use the words students search for in its title and first lines, such as ${program} with your city.`, 'Link to it from your home page.'],
        difficulty: 'medium',
      }),
      weak: ({ program }) => ({
        steps: [`Give ${program} its own detailed page.`, 'Put the program name and your city in its title and first lines.', 'Link to it from your home page and your Google profile.'],
        difficulty: 'medium',
      }),
      missing: ({ program }) => ({
        steps: [
          `Make a clear page for ${program}, named the way students search for it.`,
          'Put the program name and your city in its title and first lines.',
          'Link to it from your home page, your Google profile and your social pages.',
        ],
        difficulty: 'hard',
      }),
    },
  },

  instagram_activity: {
    why: () => 'Students check Instagram to see real campus life before they enquire. Regular posts and reels keep you in their feed while they decide.',
    fix: {
      okay: () => ({
        steps: ['Post 3 or more times a week.', 'Make most of them reels. Short clips of classes, events and students work well.'],
        difficulty: 'medium',
      }),
      weak: () => ({
        steps: ['Post at least once a week to start.', 'Build up to 3 posts a week, mostly reels.', 'Plan a month of posts at a time, so the feed never goes quiet.'],
        difficulty: 'medium',
      }),
      missing: () => ({
        steps: ['Create an Instagram account for the institution.', 'Post at least 3 times a week, mostly reels.', 'Use your phone camera. That is enough to start.'],
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
        steps: ['Ask students and parents for a Google review at good moments, like results day and admission day.', 'Put a QR code for reviews at the front desk.'],
        difficulty: 'medium',
      }),
      weak: () => ({
        steps: ['Ask every new batch and happy parents for a Google review.', 'Share your review link on WhatsApp.'],
        difficulty: 'medium',
      }),
      missing: () => ({
        steps: ['Create a free Google Business Profile and verify it.', 'Add your address, hours, photos and website. It takes about an hour.'],
        difficulty: 'easy',
      }),
    },
  },

  youtube: {
    why: () => 'Many students watch videos to understand a course and a campus before they apply. A channel with fresh videos builds trust over time.',
    fix: {
      okay: () => ({ steps: ['Post at least one video every month.', 'Start with student stories, course explainers and campus tours.'], difficulty: 'medium' }),
      weak: () => ({ steps: ['Restart your channel with one video a month.', 'Begin with a course explainer or a student story.'], difficulty: 'medium' }),
      missing: () => ({ steps: ['Create a YouTube channel.', 'Post one video a month. A phone and good light are enough to start.'], difficulty: 'medium' }),
    },
  },

  ai_answers: {
    why: () => 'More students now ask AI assistants which institution to choose. Being named in those answers puts you on their shortlist.',
    fix: {
      okay: ({ program }) => ({
        steps: [
          `Keep the details of ${program} clear: what students learn, fees, placements and reviews.`,
          'Keep them the same on your website, your Google profile and your listings. Assistants learn from what is public.',
        ],
        difficulty: 'medium',
      }),
      weak: ({ program }) => ({
        steps: [`Make ${program} easy to find on your website.`, 'Get listed on trusted education directories and in local news.'],
        difficulty: 'hard',
      }),
      missing: () => ({
        steps: ['Make sure your website clearly says who you are, where you are and what you teach.', 'Get listed on trusted education directories.'],
        difficulty: 'hard',
      }),
    },
  },

  other_socials: {
    why: () => 'Parents often look for you on Facebook, and LinkedIn shows your placements and faculty. An active page shows you are running and growing.',
    fix: {
      okay: () => ({ steps: ['Post at least once a month on Facebook or LinkedIn.', 'Share results, events and placement news you already have.'], difficulty: 'easy' }),
      weak: () => ({ steps: ['Pick one update to share each month: an event, a result or a placement.', 'Post it on Facebook and LinkedIn.'], difficulty: 'easy' }),
      missing: () => ({
        steps: ['Create a Facebook page.', 'Create a LinkedIn page too if you place students in jobs.', 'Post once a month.'],
        difficulty: 'easy',
      }),
    },
  },

  placement_proof: {
    why: () => 'Placements and results are the biggest worry for most students and parents. Clear numbers and company names are the proof they look for.',
    fix: {
      okay: ({ facts, program }) =>
        facts.hasCompanies
          ? { steps: [`Update the placement numbers for ${program} after every placement season.`, 'Show the year clearly, next to the numbers.'], difficulty: 'medium' }
          : { steps: [`List the companies that hired from ${program}.`, 'Add them next to the numbers you already show, with the year.'], difficulty: 'medium' },
      weak: ({ program }) => ({
        steps: [`Collect real numbers for ${program}: how many were placed, where, and in which year.`, 'Replace the general claims on your website with those numbers.'],
        difficulty: 'medium',
      }),
      missing: ({ program }) => ({
        steps: [
          `Collect the last batch's results for ${program}: how many were placed, the companies and the year.`,
          `Add a placements section to the ${program} page with them.`,
          'Show them even if the first batch is small.',
        ],
        difficulty: 'medium',
      }),
    },
  },

  review_rating: {
    why: () => 'Students read reviews to see how you treat people. A good rating and polite replies to reviews both count.',
    fix: {
      okay: ({ facts }) =>
        facts.rating !== null && facts.rating >= 4.3
          ? { steps: ['Reply to every review, good or bad, within a few days.', 'Keep replies short and polite. It shows students you listen.'], difficulty: 'easy' }
          : {
              steps: ['Reply to every review.', 'Fix the issues that come up again and again.', 'Ask happy students and parents to share their experience.'],
              difficulty: 'medium',
            },
      weak: () => ({
        steps: ['Read your reviews for the issues that repeat, and fix those first.', 'Reply to every review politely.', 'Ask satisfied students and parents to add theirs.'],
        difficulty: 'medium',
      }),
      missing: () => ({
        steps: ['Ask your current students and alumni to leave a Google review.', 'Share the review link on WhatsApp after results or events.'],
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
        steps: ['Make one clear page with every approval you mention.', 'Add the certificate or an official link for each one.', 'Link to that page from every page of your website.'],
        difficulty: 'easy',
      }),
      weak: ({ facts, institutionType }) => {
        const notShown = (facts.held ?? []).filter((name) => !facts.shown.includes(name));
        const what = institutionType === 'skilling' ? 'recognition' : 'approvals';
        return {
          steps: notShown.length
            ? [
                `Add ${list(notShown)} to your website. You hold ${notShown.length === 1 ? 'it' : 'them'} but do not show ${notShown.length === 1 ? 'it' : 'them'} yet.`,
                'Add the certificate or an official link for each one you show.',
              ]
            : [`Show all of your ${what} on your website.`, 'Add the certificate or an official link for each one.'],
          difficulty: 'easy',
        };
      },
      missing: ({ facts, institutionType }) => {
        const held = facts.held ?? [];
        const what = institutionType === 'skilling' ? 'skilling recognition' : 'approvals';
        return held.length
          ? { steps: [`Show the ${what} you hold (${list(held)}) on your website.`, 'Add the certificate or an official link for each one.'], difficulty: 'easy' }
          : {
              steps: [`If you hold any ${what}, add them to your website with proof.`, 'If not, plan for recognition. Students ask about it.'],
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
        const page = missing.length ? `Add ${list(missing)} to your faculty page.` : 'Keep your faculty page up to date.';
        return { steps: [page, 'Feature your leaders in posts and videos.'], difficulty: 'easy' };
      },
      weak: () => ({ steps: ['Turn your list of names into a faculty page.', 'Add a photo and qualifications for each teacher.'], difficulty: 'easy' }),
      missing: () => ({
        steps: ['Add a faculty page with names, photos and qualifications.', 'Add a short message from your head of institution.'],
        difficulty: 'medium',
      }),
    },
  },

  students_in_content: {
    why: () => 'Real students and alumni in your posts show what life with you is really like. Students trust other students more than any advert.',
    fix: {
      okay: () => ({ steps: ['Feature a real student or alumnus every month.', 'Try short interviews, day in the life reels and success stories.'], difficulty: 'medium' }),
      weak: () => ({ steps: ['Swap stock photos for your own students and alumni, with their permission.', 'Start a monthly student story.'], difficulty: 'medium' }),
      missing: () => ({ steps: ['Start a monthly student or alumni feature, with their permission.', 'Use real faces. They make your content believable.'], difficulty: 'medium' }),
    },
  },

  fees_shown: {
    why: () => 'Fees are one of the first things students and parents check. When fees are hidden, many move on to an institution that shows them.',
    fix: {
      okay: ({ program }) => ({ steps: [`Show the full fee for ${program}, year by year.`, 'Add any other charges, in one clear table.'], difficulty: 'easy' }),
      weak: ({ program }) => ({
        steps: [`Replace ${open('Contact us for fees')} with the actual fee for ${program}.`, 'Keep an invitation to ask about scholarships.'],
        difficulty: 'easy',
      }),
      missing: ({ program }) => ({ steps: [`Add the fee for ${program} to its page, year by year.`, 'List any other charges.'], difficulty: 'easy' }),
    },
  },

  program_page: {
    why: () => 'Each program needs its own page, so students can find it on Google and see everything in one place: what they learn, fees, eligibility and careers.',
    fix: {
      okay: ({ program }) => ({
        steps: [`Expand the ${program} page.`, 'Cover what students learn, eligibility, duration, fees, placements and how to apply.'],
        difficulty: 'medium',
      }),
      weak: ({ program }) => ({
        steps: [`Give ${program} its own page instead of a line on a combined page.`, 'Include what students learn, eligibility, fees and careers.'],
        difficulty: 'medium',
      }),
      missing: ({ program }) => ({
        steps: [`Add ${program} to your website on its own page.`, 'Include what students learn, eligibility, fees and careers.'],
        difficulty: 'medium',
      }),
    },
  },

  easy_enquiry: {
    why: () => 'When students are interested, they want to ask a question right away. A form and WhatsApp on every page make that easy, and bring more enquiries.',
    fix: {
      okay: ({ facts }) =>
        facts.pagesWithWhatsapp >= facts.pagesChecked
          ? { steps: ['Add a short enquiry form to every page.', 'Put it next to your WhatsApp button, so students can choose.'], difficulty: 'easy' }
          : { steps: ['Add a WhatsApp button to every page.', 'Put it next to your enquiry form, so students can choose.'], difficulty: 'easy' },
      weak: () => ({ steps: ['Bring your enquiry form out of the contact page.', 'Put a short form and a WhatsApp button on every page.'], difficulty: 'easy' }),
      missing: () => ({ steps: ['Fix your enquiry form first. It did not work when we checked.', 'Then add a WhatsApp button to every page.'], difficulty: 'easy' }),
    },
  },

  admission_steps: {
    why: () => 'Students need to know exactly how to apply and by when. Clear steps with dates mean fewer drop offs and fewer phone calls.',
    fix: {
      okay: ({ program }) => ({ steps: [`Add the key dates for ${program}: when applications open and close.`, 'Add when classes start.'], difficulty: 'easy' }),
      weak: ({ program }) => ({
        steps: [`Turn the admission information for ${program} into numbered steps.`, 'List the documents needed and the dates.'],
        difficulty: 'easy',
      }),
      missing: ({ program }) => ({
        steps: [`Add a how to apply section for ${program}.`, 'Write it as numbered steps, with the documents needed and the key dates.'],
        difficulty: 'easy',
      }),
    },
  },

  mobile_friendly: {
    why: () => 'Most students browse on their phone. If your site is hard to use on a phone, they leave before they enquire.',
    fix: {
      okay: ({ facts }) => ({
        steps: [`Fix the one issue found on phones${facts.issues[0] ? `: ${facts.issues[0].toLowerCase()}` : ''}.`, 'Then check your key pages on a phone.'],
        difficulty: 'medium',
      }),
      weak: ({ facts }) => ({
        steps: [
          `Fix the issues found on phones${facts.issues.length ? `: ${list(facts.issues.map((issue) => issue.toLowerCase()))}` : ''}.`,
          'Ask a web developer. These usually take a few days.',
        ],
        difficulty: 'medium',
      }),
      missing: () => ({ steps: ['Ask your web developer to make your website load on phones.', 'Do this first. It affects every visitor.'], difficulty: 'hard' }),
    },
  },

  page_speed: {
    why: () => 'A slow site loses students before the page even opens, and Google shows faster sites higher.',
    fix: {
      okay: () => ({
        steps: ['Compress large images.', 'Remove unused plugins and scripts.', 'Use good hosting. Aim for a speed score of 90 or more.'],
        difficulty: 'medium',
      }),
      weak: () => ({
        steps: ['Start with images. They are usually the biggest cause.', 'Then remove unused plugins and scripts.', 'Check your hosting.'],
        difficulty: 'medium',
      }),
      missing: () => ({
        steps: ['Ask your web developer to check your hosting. The site did not load for the speed test.', 'Fix any errors first.'],
        difficulty: 'hard',
      }),
    },
  },
};

export function writeFixAdvice<K extends CheckKey>(input: {
  checkKey: K;
  result: CheckResult;
  facts: CheckFacts[K];
  institutionType: InstitutionType;
  programName: string | null;
}): Omit<FixAdvice, 'readyFix'> {
  const entry = BANK[input.checkKey] as Entry<K>;
  const context: AdviceContext<K> = { facts: input.facts, institutionType: input.institutionType, program: input.programName ?? 'this program' };
  const whyItMatters = entry.why(context);
  if (input.result === 'strong') return { whyItMatters, steps: [], howToFix: null, difficulty: null };
  const fix = entry.fix[input.result](context);
  return { whyItMatters, steps: [...fix.steps], howToFix: fix.steps.join(' '), difficulty: fix.difficulty };
}
