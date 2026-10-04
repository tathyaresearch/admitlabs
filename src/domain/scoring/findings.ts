// "What Drishti found", in plain words, from the raw facts. Every result shows this next to
// its source and the date it was checked (spec rule 2). Neutral and factual: no judgement,
// no shaming. The result word and meter already say how it scored.

import type { CheckFacts } from '../facts.ts';
import { AI_ASSISTANT_LABELS, type CheckKey, type InstitutionType } from '../types.ts';

export interface FindingContext {
  institutionType: InstitutionType;
  /** The program for program checks. */
  programName: string | null;
}

type Describer<K extends CheckKey> = (facts: CheckFacts[K], context: FindingContext) => string;

const quote = (text: string) => `“${text}”`;
const percent = (share: number) => `${Math.round(share * 100)}%`;
const days = (count: number) => (count === 0 ? 'today' : count === 1 ? '1 day ago' : `${count} days ago`);

function list(items: readonly string[], last = 'and'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${last} ${items.at(-1)}`;
}

function perWeek(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${rounded === 1 ? 'post' : 'posts'} a week`;
}

const DESCRIBERS: { readonly [K in CheckKey]: Describer<K> } = {
  google_search(facts) {
    const from = facts.searchedFrom ? `, searched from ${facts.searchedFrom}` : '';
    if (facts.position === null) return `Not in the top ${facts.resultsChecked} Google results for ${quote(facts.query)}${from}.`;
    return `Position ${facts.position} on Google for ${quote(facts.query)}${from}.`;
  },

  instagram_activity(facts) {
    if (!facts.exists) return 'No Instagram account found.';
    if (facts.postsPerWeek <= 0) return `No posts in the last ${facts.weeksChecked} weeks.`;
    return `About ${perWeek(facts.postsPerWeek)} over the last ${facts.weeksChecked} weeks. ${percent(facts.reelShare)} of them are reels.`;
  },

  google_profile(facts) {
    if (!facts.exists) return 'No Google profile found.';
    if (facts.reviewCount === 0) return 'A Google profile with no reviews yet.';
    return `A Google profile with ${facts.reviewCount} ${facts.reviewCount === 1 ? 'review' : 'reviews'}.`;
  },

  youtube(facts) {
    if (!facts.exists) return 'No YouTube channel found.';
    if (facts.lastUploadDaysAgo === null) return 'A YouTube channel with no videos yet.';
    const months = `New videos in ${facts.monthsWithUploads} of the last ${facts.monthsChecked} months.`;
    return `${months} Last upload ${days(facts.lastUploadDaysAgo)}.`;
  },

  ai_answers(facts) {
    // Each assistant by name, when the provider says which named you.
    if (facts.assistants?.length) {
      const asked = quote(facts.question);
      const named = facts.assistants.filter((entry) => entry.named).map((entry) => AI_ASSISTANT_LABELS[entry.assistant]);
      const notNamed = facts.assistants.filter((entry) => !entry.named).map((entry) => AI_ASSISTANT_LABELS[entry.assistant]);
      if (named.length) return `Named by ${list(named)} when asked ${asked}.${notNamed.length ? ` Not by ${list(notNamed, 'or')}.` : ''}`;
      if (facts.knownWhenAskedByName) return `Not named by ${list(notNamed, 'or')} when asked ${asked}. They know you when asked by name.`;
      return `Not named by ${list(notNamed, 'or')} when asked ${asked}, and not known when asked by name.`;
    }
    if (facts.assistantsNaming > 0) {
      return `Named by ${facts.assistantsNaming} of ${facts.assistantsAsked} AI assistants asked ${quote(facts.question)}.`;
    }
    if (facts.knownWhenAskedByName) return `Not named by the ${facts.assistantsAsked} AI assistants asked ${quote(facts.question)}. They know you when asked by name.`;
    return `Not named by the ${facts.assistantsAsked} AI assistants asked ${quote(facts.question)}, and not known when asked by name.`;
  },

  other_socials(facts) {
    const present = facts.platforms.filter((platform) => platform.exists);
    if (present.length === 0) return 'No Facebook page found.';
    return present
      .map((platform) => {
        const name = platform.platform === 'facebook' ? 'Facebook' : 'LinkedIn';
        return platform.daysSinceLastPost === null ? `${name}: no posts yet.` : `${name}: last post ${days(platform.daysSinceLastPost)}.`;
      })
      .join(' ');
  },

  placement_proof(facts, { programName }) {
    const forProgram = programName ? ` for ${programName}` : '';
    if (!facts.found) return `No placement or results proof found${forProgram}.`;
    if (facts.vagueClaimsOnly || !facts.hasNumbers) return `Only general claims about placements${forProgram}, with no numbers.`;
    const what = facts.hasCompanies ? 'Placement numbers and company names' : 'Placement numbers, without company names,';
    const year = facts.year !== null ? ` from ${facts.year}` : '';
    const updated = facts.updatedDaysAgo !== null ? ` Last updated ${days(facts.updatedDaysAgo)}.` : '';
    return `${what}${year}${forProgram}.${updated}`;
  },

  review_rating(facts) {
    if (facts.reviewCount <= 0 || facts.rating === null) return 'No Google reviews yet.';
    const reviews = `${facts.reviewCount} ${facts.reviewCount === 1 ? 'review' : 'reviews'}`;
    return `Rated ${facts.rating.toFixed(1)} from ${reviews}. Replies to ${percent(facts.replyRate)} of reviews.`;
  },

  approvals(facts, { institutionType }) {
    const noun = institutionType === 'skilling' ? 'skilling recognition' : 'approvals';
    if (facts.shown.length === 0) return `No ${noun} shown on the website.`;
    const expected = facts.held && facts.held.length > 0 ? facts.held : facts.shown;
    const notShown = expected.filter((name) => !facts.shown.includes(name));
    const withoutProof = facts.shown.filter((name) => !facts.withProof.includes(name));
    const shown = `Shows ${list(facts.shown)}`;
    if (notShown.length > 0) {
      return `${shown}. ${list(notShown)} ${notShown.length === 1 ? 'is' : 'are'} held but not shown.`;
    }
    if (withoutProof.length === 0) return `${shown}, each with proof or a link.`;
    if (withoutProof.length === facts.shown.length) return `Mentions ${list(facts.shown)}, without proof or links.`;
    return `${shown}. ${list(withoutProof)} ${withoutProof.length === 1 ? 'has' : 'have'} no proof or link.`;
  },

  faculty_leaders(facts) {
    if (facts.facultyPage) {
      const has = [facts.names ? 'names' : null, facts.photos ? 'photos' : null, facts.qualifications ? 'qualifications' : null].filter(
        (item): item is string => item !== null,
      );
      const page = has.length ? `A faculty page with ${list(has)}.` : 'A faculty page with little detail.';
      return `${page} ${facts.leadersInContent ? 'Leaders appear in content.' : 'Leaders do not appear in content.'}`;
    }
    if (facts.names) return 'Faculty names are listed, but there is no faculty page.';
    return 'No faculty or leaders shown.';
  },

  students_in_content(facts) {
    if (facts.mostlyStockPhotos) return 'Posts use mostly stock photos rather than real students.';
    if (facts.monthsWithStudents === 0) return `No real students or alumni in the last ${facts.monthsChecked} months of posts.`;
    return `Real students or alumni in ${facts.monthsWithStudents} of the last ${facts.monthsChecked} months of posts.`;
  },

  fees_shown(facts, { programName }) {
    const program = programName ?? 'this program';
    if (facts.disclosure === 'full') return `Full fees shown for ${program}${facts.amountText ? `: ${facts.amountText}` : ''}.`;
    if (facts.disclosure === 'partial') return `A fee range shown for ${program}${facts.amountText ? `: ${facts.amountText}` : ''}.`;
    if (facts.disclosure === 'on_request') return `The ${program} page says ${quote(facts.amountText ?? 'Contact us for fees')}.`;
    return `No fees found for ${program}.`;
  },

  program_page(facts, { programName }) {
    const program = programName ?? 'This program';
    const words = facts.wordCount !== null ? `, about ${facts.wordCount} words` : '';
    if (facts.ownPage) return `${program} has its own page${words}.`;
    if (facts.onCombinedPage) return `${program} is only listed on a combined programs page.`;
    return `${program} is not on the website.`;
  },

  easy_enquiry(facts) {
    const pages = facts.pagesChecked;
    const form = facts.formWorks && facts.pagesWithForm >= pages;
    const whatsapp = facts.pagesWithWhatsapp >= pages;
    if (form && whatsapp) return `An enquiry form and WhatsApp on all ${pages} pages checked.`;
    if (form) return `An enquiry form on all ${pages} pages checked. No WhatsApp.`;
    if (whatsapp) return `WhatsApp on all ${pages} pages checked. The enquiry form is only on the contact page.`;
    if (!facts.formWorks && facts.pagesWithWhatsapp === 0) return 'The enquiry form did not work, and there is no WhatsApp.';
    if (facts.contactPageOnly) return 'The enquiry form is only on the contact page.';
    return `Enquiry options on ${Math.max(facts.pagesWithForm, facts.pagesWithWhatsapp)} of ${pages} pages checked.`;
  },

  admission_steps(facts, { programName }) {
    const forProgram = programName ? ` for ${programName}` : '';
    if (facts.stepsListed && facts.datesListed) return `Step by step admission process${forProgram}, with dates.`;
    if (facts.stepsListed) return `Admission steps listed${forProgram}, without dates.`;
    if (facts.vague) return `Admission information${forProgram} is general, with no clear steps.`;
    return `No admission steps found${forProgram}.`;
  },

  mobile_friendly(facts) {
    if (!facts.loads) return 'The website did not load on a phone.';
    if (facts.issues.length === 0) return 'The website works fully on a phone.';
    return `On a phone: ${list(facts.issues.map((issue, index) => (index === 0 ? issue : issue.charAt(0).toLowerCase() + issue.slice(1))))}.`;
  },

  page_speed(facts) {
    if (!facts.loads || facts.mobileScore === null) return 'The website did not load for the speed test.';
    return `Google speed score of ${facts.mobileScore} out of 100 on a phone.`;
  },
};

export function describeFinding<K extends CheckKey>(key: K, facts: CheckFacts[K], context: FindingContext): string {
  const describe = DESCRIBERS[key] as Describer<K>;
  return describe(facts, context);
}
