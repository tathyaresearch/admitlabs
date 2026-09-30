// Mock wording for the Rivals 3 things to do. Written to the copy rules: plain, short, an
// opportunity and never a failing. Learn from rivals, never copy them: content items name the
// idea behind a post and say to tell it with your own students.

import { checkAction } from '../../domain/checks.ts';
import { formatCount, joinNames } from '../../domain/format.ts';
import type { CheckKey, InstitutionType } from '../../domain/types.ts';
import type { Opportunity } from '../../rivals/opportunities.ts';
import { moveNotice } from '../../rivals/text.ts';
import type { RivalActionText } from '../analysis.ts';

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

export function writeRivalAction(item: Opportunity, type: InstitutionType): RivalActionText {
  switch (item.type) {
    case 'gap': {
      const leaders = item.rivals.slice(0, 2).map((rival) => rival.name);
      const verb = leaders.length > 1 ? 'are' : 'is';
      return {
        text: checkAction(item.key, item.programs, type),
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
