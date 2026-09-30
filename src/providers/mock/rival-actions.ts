// Mock wording for the Rivals 3 things to do. Written to the copy rules: plain, short, an
// opportunity and never a failing. Learn from rivals, never copy them: content items name the
// idea behind a post and say to tell it with your own students.

import { formatCount, joinNames } from '../../domain/format.ts';
import type { CheckKey, InstitutionType } from '../../domain/types.ts';
import type { Opportunity } from '../../rivals/opportunities.ts';
import { moveNotice } from '../../rivals/text.ts';
import type { RivalActionText } from '../analysis.ts';

/** What to do, per check. `{programs}` becomes the programs where a rival leads you. */
const GAP_TITLES: Readonly<Record<CheckKey, string>> = {
  google_search: 'Get found when students search for {programs}',
  instagram_activity: 'Post on Instagram every week',
  google_profile: 'Build up your Google profile and reviews',
  youtube: 'Post a short YouTube video each month',
  ai_answers: 'Get named when students ask AI about {programs}',
  other_socials: 'Keep Facebook and LinkedIn active',
  placement_proof: 'Publish your {programs} placement results',
  review_rating: 'Reply to every Google review',
  approvals: 'Show your approvals on your website',
  faculty_leaders: 'Introduce your faculty and leaders',
  students_in_content: 'Put real students in your posts',
  fees_shown: 'Show your full {programs} fees',
  program_page: 'Give {programs} a page of its own',
  easy_enquiry: 'Make it one tap to enquire',
  admission_steps: 'Spell out the {programs} admission steps',
  mobile_friendly: 'Make your website easy to use on a phone',
  page_speed: 'Make your website load faster',
};

/** Why it matters to a student, in one sentence. */
const GAP_WHY: Readonly<Record<CheckKey, string>> = {
  google_search: 'Most students start with a Google search, and they rarely look past the first page.',
  instagram_activity: 'Students check Instagram to see if a place feels alive before they enquire.',
  google_profile: 'A full Google profile with many reviews is often the first thing a parent sees.',
  youtube: 'Short videos let students see the campus and classes before they visit.',
  ai_answers: 'More students now ask AI assistants where to study, and they trust the names it gives.',
  other_socials: 'Parents often look on Facebook, and LinkedIn shows where graduates work.',
  placement_proof: 'Students trust results they can check: names, numbers and the year.',
  review_rating: 'Replies to reviews show that someone listens, and parents notice it.',
  approvals: 'Approvals shown with a source answer the first worry of many parents.',
  faculty_leaders: 'Knowing who teaches makes a place feel real and accountable.',
  students_in_content: 'Real students in posts are easier to believe than stock photos.',
  fees_shown: 'Students compare fees before they enquire, and a clear number builds trust.',
  program_page: 'A page of its own lets students find everything about a program in one place.',
  easy_enquiry: 'Every extra step between interest and enquiry loses students.',
  admission_steps: 'Clear steps and dates stop students from putting off applying.',
  mobile_friendly: 'Most students look you up on a phone.',
  page_speed: 'Students leave a slow page before it finishes loading.',
};

const MOVE_ACTIONS = {
  admission_dates: { text: 'Plan your admission push early', next: 'Share your own dates and steps before students decide.' },
  fee_change: { text: 'See how your fees compare', next: 'Students compare fees side by side, so make yours easy to find.' },
  new_program: { text: 'Look at the new program they started', next: 'Check whether your programs already answer the same need, and say so clearly.' },
  new_page: { text: 'See what they added to their website', next: 'Ask whether your own site answers the same student question.' },
} as const;

function titleFor(key: CheckKey, programs: readonly string[], type: InstitutionType): string {
  const title = key === 'approvals' && type === 'skilling' ? 'Show your skilling recognition on your website' : GAP_TITLES[key];
  return title.replace('{programs}', programs.length ? joinNames(programs) : 'your programs');
}

export function writeRivalAction(item: Opportunity, type: InstitutionType): RivalActionText {
  switch (item.type) {
    case 'gap': {
      const leaders = item.rivals.slice(0, 2).map((rival) => rival.name);
      const verb = leaders.length > 1 ? 'are' : 'is';
      return {
        text: titleFor(item.key, item.programs, type),
        detail: `${joinNames(leaders)} ${verb} ahead of you here. ${GAP_WHY[item.key]}`,
      };
    }
    case 'content': {
      const why = item.whyItWorked ? ` ${item.whyItWorked}` : '';
      return {
        text: `Learn from ${item.rival.name}'s top post`,
        detail: `"${item.title}" reached ${formatCount(item.views)} views.${why} Take the idea, not the post: tell it with your own students.`,
      };
    }
    case 'move': {
      const action = MOVE_ACTIONS[item.kind];
      return { text: action.text, detail: `${moveNotice(item.rival.name, item.description)} ${action.next}` };
    }
  }
}
