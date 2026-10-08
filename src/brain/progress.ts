// How complete a Client Brain is (spec section 26): the facts every Brain needs, each done, or
// marked "Doesn't apply" with a reason. Optional facts (fonts, a tagline, alumni, reviews, events)
// never lower it. "Client Brain 80% complete" and the list of what's missing come from here, and
// Mark as Ready waits until nothing is missing and the checklist is done. Pure.

import { STEPS, contactOf, firstOf, itemsOf, skipOf, type Brain, type BrainSection, type BrainStep } from './model.ts';

export interface Slot {
  /** Stable: the "Doesn't apply" mark is kept against it. */
  key: string;
  section: BrainSection;
  label: string;
  /** What to add, in a few words. */
  line: string;
  done: boolean;
  /** Done because it was marked "Doesn't apply". */
  skipped: boolean;
  /** May be marked "Doesn't apply". */
  skippable: boolean;
}

export interface Progress {
  /** Rounded down, so 100 means nothing is missing. */
  percent: number;
  done: number;
  total: number;
  missing: Slot[];
}

type SlotDraft = Omit<Slot, 'skipped' | 'done'> & { done: boolean };

export function brainSlots(brain: Pick<Brain, 'items' | 'details' | 'programs'>): Slot[] {
  const d = brain.details;
  const drafts: SlotDraft[] = [
    { key: 'founded', section: 'basics', label: 'Year started', line: 'The year the college started.', done: d.foundedYear !== null, skippable: false },
    {
      key: 'approvals',
      section: 'basics',
      label: 'Approvals',
      line: 'UGC, AICTE, the NAAC grade, or skilling recognition.',
      done: Boolean(d.naacGrade || d.aicteApproved !== null || d.ugcRecognised !== null || d.skillingRecognition.length || d.otherApprovals),
      skippable: true,
    },
    { key: 'address', section: 'basics', label: 'Address', line: 'Where the campus is.', done: Boolean(d.campusAddress), skippable: false },
    { key: 'contact:main', section: 'basics', label: 'Main contact', line: 'Name, role, phone and email.', done: Boolean(contactOf(brain, 'main')), skippable: false },
    { key: 'contact:approver', section: 'basics', label: 'Who approves our content', line: 'Who says yes to posts and reels.', done: Boolean(contactOf(brain, 'approver')), skippable: false },
    { key: 'talk', section: 'basics', label: 'How they like to talk', line: 'WhatsApp, email or calls, and when.', done: Boolean(firstOf(brain, 'talk')), skippable: false },
    { key: 'goals', section: 'basics', label: 'Top goals this year', line: 'Up to three.', done: Boolean(firstOf(brain, 'goals')), skippable: false },
    { key: 'target', section: 'basics', label: 'Admission target', line: 'How many students this year.', done: Boolean(firstOf(brain, 'target')), skippable: true },
  ];
  for (const program of brain.programs) {
    const p = program.details;
    drafts.push(
      {
        key: `program:${program.id}:basics`,
        section: 'programs',
        label: `${program.name}: level, duration, seats, eligibility`,
        line: 'The basics a student asks first.',
        done: p.level !== null && p.durationValue !== null && p.seats !== null && Boolean(p.eligibility),
        skippable: false,
      },
      { key: `program:${program.id}:fees`, section: 'programs', label: `${program.name} fees`, line: 'For a year, or the full course.', done: p.feesAmount !== null, skippable: false },
      { key: `program:${program.id}:dates`, section: 'programs', label: `${program.name} admission dates`, line: 'When applications open and close.', done: p.applicationsOpen !== null, skippable: true },
    );
  }
  const placements = brain.programs.some((program) => program.details.placedPercent !== null || program.details.averagePackage !== null || program.details.highestPackage !== null) || itemsOf(brain, 'placement_list').some((item) => !item.toConfirm);
  const logo = firstOf(brain, 'logo');
  const drive = itemsOf(brain, 'link').some((item) => !item.toConfirm && item.fields.type === 'drive' && item.fields.shared);
  const season = itemsOf(brain, 'date').some((item) => !item.toConfirm && item.fields.type === 'season') || brain.programs.some((program) => program.details.applicationsOpen !== null);
  drafts.push(
    { key: 'logo', section: 'brand', label: 'Logo', line: 'The logo files, uploaded or as a Drive link.', done: Boolean(logo && (logo.fields.file || logo.fields.link)), skippable: false },
    { key: 'colours', section: 'brand', label: 'Colours', line: 'The brand colours, with their hex codes.', done: Boolean(firstOf(brain, 'colours')), skippable: false },
    { key: 'tone', section: 'brand', label: 'Tone', line: 'Friendly or formal.', done: Boolean(firstOf(brain, 'tone')), skippable: false },
    { key: 'avoid', section: 'brand', label: 'Words or topics to avoid', line: 'What never goes in a post.', done: Boolean(firstOf(brain, 'avoid')), skippable: true },
    { key: 'awards', section: 'proof', label: 'Rankings and awards', line: 'Each with its year and a link.', done: itemsOf(brain, 'award').some((item) => !item.toConfirm), skippable: true },
    { key: 'placements', section: 'proof', label: 'Placements', line: 'Highest and average package, top recruiters.', done: placements, skippable: true },
    { key: 'drive', section: 'links', label: 'Shared Drive folder', line: 'A folder shared with the AdmitLabs team.', done: drive, skippable: false },
    { key: 'season', section: 'calendar', label: 'Admission season', line: 'When admissions open and close.', done: season, skippable: false },
    { key: 'plan', section: 'content', label: 'First month’s content plan', line: 'Agreed with the college.', done: itemsOf(brain, 'plan').some((item) => !item.toConfirm && item.fields.status === 'agreed'), skippable: false },
  );
  return drafts.map((draft) => {
    const skipped = !draft.done && draft.skippable && Boolean(skipOf(brain, draft.key));
    return { ...draft, done: draft.done || skipped, skipped };
  });
}

export function brainProgress(brain: Pick<Brain, 'items' | 'details' | 'programs'>): Progress {
  const slots = brainSlots(brain);
  const done = slots.filter((slot) => slot.done).length;
  return { percent: slots.length ? Math.floor((done * 100) / slots.length) : 100, done, total: slots.length, missing: slots.filter((slot) => !slot.done) };
}

/** The checklist steps that need a Brain fact before they can be ticked, and whether it is there. */
export function stepBlocked(step: BrainStep, brain: Pick<Brain, 'items'>): boolean {
  switch (step) {
    case 'drive_shared':
      return !itemsOf(brain, 'link').some((item) => !item.toConfirm && item.fields.type === 'drive');
    case 'approver_confirmed':
      return !contactOf(brain, 'approver');
    case 'plan_agreed':
      return !itemsOf(brain, 'plan').some((item) => !item.toConfirm && item.fields.status === 'agreed');
    default:
      return false;
  }
}

/** Ready once nothing is missing and every step is ticked. Says what is still to go. */
export function readiness(brain: Pick<Brain, 'items' | 'details' | 'programs' | 'steps'>): { ready: boolean; facts: number; steps: number } {
  const facts = brainProgress(brain).missing.length;
  const steps = STEPS.filter((step) => !brain.steps.has(step)).length;
  return { ready: facts === 0 && steps === 0, facts, steps };
}

