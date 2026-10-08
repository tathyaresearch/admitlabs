// Ask the brain (spec section 26): "What's the BBA fee?", "Who approves reels?". The Brain's
// facts as short answers, each with the section it came from, and the mock's way of finding the
// right ones: words in the question matched to what each fact is about. The real version (the
// Claude API, later) answers from the same facts and names the ones it used. Answers come only
// from the Brain: never the internet, never Leads, and Team only notes for the team alone. Pure.

import { describeItem, programRows, aboutRows, placementText, shortValue } from './facts.ts';
import { CONTACT_ROLE_LABELS, DATE_TYPE_LABELS, SECTION_INFO, sectionOf, type AnyBrainItem, type Brain, type BrainSection } from './model.ts';

export interface AskFact {
  key: string;
  section: BrainSection;
  /** "Programs, BBA, Fees". */
  where: string;
  /** The answer, as a sentence. */
  answer: string;
  /** What it is about, for matching. */
  tags: string[];
  /** A program's name, when the fact belongs to one. */
  program: string | null;
  /** The Brain fact behind it, for its stamp ('item:<id>', 'about', 'program:<id>:fees'). */
  stamp: string;
  teamOnly: boolean;
}

export interface BrainAnswer {
  facts: AskFact[];
  /** Where to add it, when the Brain does not know. */
  addIn: BrainSection | null;
}

// What words in a question are about. A phrase maps to one or more tags.
const CONCEPTS: ReadonlyArray<[RegExp, string[]]> = [
  [/\b(blueprint|strategy|roadmap)\b/, ['blueprint']],
  [/\b(fees?|cost|costs|price|tuition|how much)\b/, ['fees']],
  [/\b(seats?|intake)\b/, ['seats']],
  [/\b(eligib\w*|qualif\w*|marks)\b/, ['eligibility']],
  [/\b(duration|how long|years?|months?)\b/, ['duration']],
  [/\b(level|degree|diploma|certificate)\b/, ['level']],
  [/\b(highlights?|special|unique|different)\b/, ['highlights']],
  [/\b(placements?|placed|packages?|salary|salaries|recruiters?)\b/, ['placements']],
  [/\b(approves?|approval|approver|sign(s)? off|okay(s)?)\b/, ['approver']],
  [/\b(reels?|posts?|content)\b/, ['content']],
  [/\b(contacts?|call|phone|email|reach|who (do|should) (we|i) (talk|speak))\b/, ['contact']],
  [/\b(whatsapp|talk|communicat\w*)\b/, ['talk']],
  [/\b(address|where is|located|location|campus)\b/, ['address']],
  [/\b(naac|ugc|aicte|nirf|accredit\w*|recogni\w*|approvals)\b/, ['approvals']],
  [/\b(started|founded|established|since)\b/, ['founded']],
  [/\b(goals?|aims?)\b/, ['goals']],
  [/\b(targets?)\b/, ['target']],
  [/\b(rivals?|competitors?|competition)\b/, ['rivals']],
  [/\b(cities|states|regions?|students from)\b/, ['regions']],
  [/\b(logo|logos)\b/, ['logo']],
  [/\b(colou?rs?|hex)\b/, ['colours']],
  [/\b(fonts?|typeface)\b/, ['fonts']],
  [/\b(tagline|slogan)\b/, ['tagline']],
  [/\b(tone|voice)\b/, ['tone']],
  [/\b(avoid|never say|don'?t say|banned)\b/, ['avoid']],
  [/\b(guidelines?|brand book)\b/, ['guidelines']],
  [/\b(awards?|rankings?|ranked|rank)\b/, ['awards']],
  [/\b(alumni|alumnus|alumna|former students?)\b/, ['alumni']],
  [/\b(reviews?|testimonials?|quotes?)\b/, ['reviews']],
  [/\b(drive|folders?)\b/, ['drive']],
  [/\b(photos?|pictures?)\b/, ['photos']],
  [/\b(videos?|footage)\b/, ['videos']],
  [/\b(brochures?)\b/, ['brochure']],
  [/\b(portal|apply|application form)\b/, ['portal']],
  [/\b(shiksha)\b/, ['shiksha']],
  [/\b(collegedunia|college dunia)\b/, ['collegedunia']],
  [/\b(website|site)\b/, ['website']],
  [/\b(instagram|insta)\b/, ['instagram']],
  [/\b(youtube)\b/, ['youtube']],
  [/\b(facebook)\b/, ['facebook']],
  [/\b(linkedin)\b/, ['linkedin']],
  [/\b(google|maps|business profile)\b/, ['google']],
  [/\b(admissions? (open|start|season)|when do admissions|admission dates?|deadline|last date)\b/, ['season', 'dates']],
  [/\b(exams?)\b/, ['exam']],
  [/\b(fests?|festival)\b/, ['fest']],
  [/\b(events?)\b/, ['event']],
  [/\b(convocation|graduation)\b/, ['convocation']],
  [/\b(open days?|open house)\b/, ['open_day']],
  [/\b(not? post|don'?t post|quiet days?|blackout)\b/, ['no_post']],
  [/\b(plan|calendar)\b/, ['plan']],
  [/\b(scripts?)\b/, ['script']],
  [/\b(worked|works best|did well)\b/, ['worked']],
  [/\b(decid\w*|decision|agreed|meeting|feedback|notes?|ads?)\b/, ['notes']],
];

/** Where an unanswered question's fact would go, by what it is about. */
const TAG_SECTION: Readonly<Record<string, BrainSection>> = {
  blueprint: 'blueprint',
  fees: 'programs',
  seats: 'programs',
  eligibility: 'programs',
  duration: 'programs',
  level: 'programs',
  highlights: 'programs',
  dates: 'programs',
  placements: 'proof',
  approver: 'basics',
  contact: 'basics',
  talk: 'basics',
  address: 'basics',
  approvals: 'basics',
  founded: 'basics',
  goals: 'basics',
  target: 'basics',
  rivals: 'basics',
  regions: 'basics',
  logo: 'brand',
  colours: 'brand',
  fonts: 'brand',
  tagline: 'brand',
  tone: 'brand',
  avoid: 'brand',
  guidelines: 'brand',
  awards: 'proof',
  alumni: 'proof',
  reviews: 'proof',
  drive: 'links',
  photos: 'links',
  videos: 'links',
  brochure: 'links',
  portal: 'links',
  shiksha: 'links',
  collegedunia: 'links',
  website: 'links',
  instagram: 'links',
  youtube: 'links',
  facebook: 'links',
  linkedin: 'links',
  google: 'links',
  season: 'calendar',
  exam: 'calendar',
  fest: 'calendar',
  event: 'calendar',
  convocation: 'calendar',
  open_day: 'calendar',
  no_post: 'calendar',
  plan: 'content',
  script: 'content',
  worked: 'content',
  content: 'content',
  notes: 'notes',
};

export function questionTags(question: string): string[] {
  const text = question.toLowerCase().replace(/[’']/g, "'");
  return [...new Set(CONCEPTS.flatMap(([pattern, tags]) => (pattern.test(text) ? tags : [])))];
}

const where = (section: BrainSection, ...parts: Array<string | null>) => [SECTION_INFO[section].name, ...parts.filter(Boolean)].join(', ');
const sentence = (text: string) => (/[.?!”]$/.test(text) ? text : `${text}.`);

function itemFact(item: AnyBrainItem, brain: Pick<Brain, 'programs'>): AskFact | null {
  if (item.toConfirm || item.kind === 'skip' || item.kind === 'found') return null;
  const view = describeItem(item, brain.programs);
  const section = sectionOf(item);
  const base = { key: `item:${item.id}`, section, stamp: `item:${item.id}`, program: null, teamOnly: false };
  const value = shortValue(view);
  switch (item.kind) {
    case 'contact': {
      const f = item.fields;
      const reach = [f.phone, f.email].filter(Boolean).join(', ');
      const answer =
        f.role === 'approver'
          ? `Who approves content: ${f.name}${f.title ? `, ${f.title}` : ''}.${f.approves ? ` ${sentence(f.approves)}` : ''}${reach ? ` ${reach}.` : ''}`
          : `${CONTACT_ROLE_LABELS[f.role]}: ${f.name}${f.title ? `, ${f.title}` : ''}.${reach ? ` ${reach}.` : ''}${f.best ? ` ${sentence(f.best)}` : ''}`;
      return { ...base, where: where(section, 'Contacts'), answer, tags: f.role === 'approver' ? ['approver', 'content', 'contact'] : ['contact', f.role === 'main' ? 'main' : 'other'] };
    }
    case 'link': {
      const tag = item.fields.type === 'other' ? 'link' : item.fields.type;
      return { ...base, where: where(section, view.label), answer: `${view.label}: ${view.link?.href ?? value}.`, tags: [tag] };
    }
    case 'date': {
      const tags = item.fields.type === 'season' ? ['season', 'dates'] : [item.fields.type];
      return { ...base, where: where(section, DATE_TYPE_LABELS[item.fields.type]), answer: `${view.value}: ${view.lines[0]}.`, tags };
    }
    case 'award':
      return { ...base, where: where(section, 'Rankings and awards'), answer: sentence(`${view.label}: ${value}`), tags: ['awards'] };
    case 'alumnus':
      return { ...base, where: where(section, 'Known alumni'), answer: sentence(value), tags: ['alumni'] };
    case 'review':
      return { ...base, where: where(section, 'Student reviews'), answer: `${value} ${item.fields.by}.`, tags: ['reviews'] };
    case 'placement_list':
      return { ...base, where: where(section, 'Placements'), answer: `${view.label} placement list: ${view.link?.href ?? ''}.`, tags: ['placements'] };
    case 'plan':
      return { ...base, where: where(section, 'Content plan'), answer: sentence(`${view.label}: ${view.state}${view.lines[0] ? `, ${view.lines[0].toLowerCase()}` : ''}`), tags: ['plan', 'content'] };
    case 'script':
      return { ...base, where: where(section, 'Scripts'), answer: sentence(`${view.label} “${item.fields.title}”: ${view.lines[0] ?? view.state}`), tags: ['script', 'content'] };
    case 'worked':
      return { ...base, where: where(section, 'What worked'), answer: sentence(`${view.label}: ${value}`), tags: ['worked', 'content'] };
    case 'note':
      return { ...base, where: where(section, view.label), answer: sentence([item.fields.title, item.fields.body.split('\n')[0]].filter(Boolean).join(': ')), tags: ['notes'] };
    default: {
      const tag = item.kind === 'dos' ? 'avoid' : item.kind;
      return { ...base, where: where(section, view.label), answer: sentence(`${view.label}: ${value}`), tags: [tag] };
    }
  }
}

/** Every fact the Brain can answer from. Team only notes come only when the team asks. */
export function askFacts(
  brain: Pick<Brain, 'items' | 'details' | 'programs' | 'institution'>,
  teamNotes: ReadonlyArray<{ id: string; body: string }> = [],
  blueprint: { id: string; version: number; text: string | null } | null = null,
): AskFact[] {
  const facts: AskFact[] = [];
  const i = brain.institution;
  for (const row of aboutRows(brain.details, i.type)) {
    if (!row.value) continue;
    const tags = row.key === 'founded' ? ['founded'] : row.key === 'admissions' ? ['contact'] : [row.key];
    facts.push({ key: `about:${row.key}`, section: 'basics', where: where('basics', row.label), answer: sentence(`${row.label}: ${row.value}`), tags, program: null, stamp: 'about', teamOnly: false });
  }
  for (const program of brain.programs) {
    for (const row of programRows(program.details)) {
      if (!row.value) continue;
      const group = row.key === 'fees' ? 'fees' : row.key === 'dates' ? 'dates' : 'details';
      const tags = row.key === 'dates' ? ['dates', 'season'] : [row.key];
      facts.push({
        key: `program:${program.id}:${row.key}`,
        section: 'programs',
        where: where('programs', program.name, row.label),
        answer: sentence(`${program.name} ${row.label.toLowerCase()}: ${row.value}`),
        tags,
        program: program.name,
        stamp: `program:${program.id}:${group}`,
        teamOnly: false,
      });
    }
    const placements = placementText(program.details);
    if (placements) {
      facts.push({ key: `program:${program.id}:placements`, section: 'proof', where: where('proof', 'Placements', program.name), answer: sentence(`${program.name} placements: ${placements}`), tags: ['placements'], program: program.name, stamp: `program:${program.id}:details`, teamOnly: false });
    }
  }
  const record: Array<[string, string | null, string]> = [
    ['website', i.website, 'Website'],
    ['instagram', i.instagram ? `instagram.com/${i.instagram}` : null, 'Instagram'],
    ['youtube', i.youtube, 'YouTube'],
    ['facebook', i.facebook, 'Facebook'],
    ['linkedin', i.linkedin, 'LinkedIn'],
    ['google', i.googleMaps, 'Google Business profile'],
  ];
  for (const [tag, value, label] of record) {
    if (value) facts.push({ key: `record:${tag}`, section: 'links', where: where('links', label), answer: `${label}: ${value}.`, tags: [tag], program: null, stamp: 'record', teamOnly: false });
  }
  for (const item of brain.items) {
    const fact = itemFact(item, brain);
    if (fact) facts.push(fact);
  }
  for (const note of teamNotes) {
    facts.push({ key: `team-note:${note.id}`, section: 'notes', where: 'Team only notes', answer: sentence(note.body), tags: ['notes'], program: null, stamp: 'team-note', teamOnly: true });
  }
  if (blueprint) facts.push(...blueprintFacts(blueprint));
  return facts;
}

/**
 * The Blueprint's words, line by line, each a fact (the latest Shared or Approved version: the one
 * the college sees too). Each is tagged with what it is about, as a question is.
 */
export function blueprintFacts(blueprint: { id: string; version: number; text: string | null }): AskFact[] {
  if (!blueprint.text) return [];
  return blueprint.text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 12)
    .slice(0, 80)
    .map((line, index) => ({
      key: `blueprint:${blueprint.id}:${index}`,
      section: 'blueprint' as const,
      where: where('blueprint', `version ${blueprint.version}`),
      answer: sentence(line),
      tags: ['blueprint', ...questionTags(line).filter((tag) => tag !== 'blueprint')],
      program: null,
      stamp: `blueprint:${blueprint.id}`,
      teamOnly: false,
    }));
}

const STOP = new Set(['what', 'whats', 'the', 'is', 'are', 'a', 'an', 'of', 'for', 'our', 'we', 'who', 'when', 'where', 'how', 'do', 'does', 'to', 'in', 'on', 'and', 'or', 'it', 'this', 'that', 'next', 'their', 'they', 'can', 'i', 'you', 'your', 'about', 'with', 'there', 'any', 'much']);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9.]+/)
    .filter((word) => word && !STOP.has(word));

/** The facts that answer a question best (up to 3 of the same kind), or where to add the answer. */
export function matchQuestion(question: string, facts: readonly AskFact[]): BrainAnswer {
  const tags = questionTags(question);
  const asked = new Set(words(question));
  const namesProgram = facts.some((fact) => fact.program && words(fact.program).every((word) => asked.has(word)));
  const scored = facts
    .map((fact) => {
      let score = fact.tags.filter((tag) => tags.includes(tag)).length * 4;
      if (fact.program) {
        const named = words(fact.program).every((word) => asked.has(word));
        if (named) score += 3;
        else if (namesProgram) score -= 6;
      }
      score += words(fact.answer).filter((word) => asked.has(word) && word.length > 3).length;
      // The Blueprint's lines answer when asked about the Blueprint; otherwise the Brain's own facts come first.
      if (fact.section === 'blueprint' && !tags.includes('blueprint')) score -= 2;
      return { fact, score };
    })
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return { facts: [], addIn: tags.map((tag) => TAG_SECTION[tag]).find((section): section is BrainSection => Boolean(section)) ?? null };
  const close = scored.filter((entry) => entry.score === best.score && entry.fact.tags[0] === best.fact.tags[0]).slice(0, 3);
  return { facts: close.map((entry) => entry.fact), addIn: null };
}
