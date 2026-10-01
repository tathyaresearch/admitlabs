// Drishti's line icons, as path data on a 24px grid with 1.75px strokes and square ends, to
// match the brand's sharp edges. Hand-drawn; no icon library. Pure, so the dashboard (Icon.tsx)
// and the PDFs draw the same icons. Brand logos live in brands.ts.

import type { CheckKey, Pillar } from '../domain/types.ts';
import type { Brand } from './brands.ts';

export const LINE_ICONS = {
  home: 'M3.5 10.5 12 3.5l8.5 7M5.5 9v11h13V9M9.5 20v-6h5v6',
  audit: 'M4 18a8 8 0 1 1 16 0M12 18l4-6M8 7.2l.9 1.5M16 7.2l-.9 1.5M4.6 12.2l1.6.6M19.4 12.2l-1.6.6',
  rivals: 'M4 7h11M11.5 3.5 15 7l-3.5 3.5M20 17H9M12.5 13.5 9 17l3.5 3.5',
  demand: 'M3.5 17.5 9 12l4 4 7.5-8M15.5 8h5v5',
  reports: 'M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12h6M9 15.5h6',
  plan: 'M12 3.5 20.5 8 12 12.5 3.5 8zM3.5 12 12 16.5 20.5 12M3.5 16 12 20.5 20.5 16',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5h4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M4.5 12.5l5 5 10-11',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17 17 7M9 7h8v8',
  equal: 'M6 9.5h12M6 14.5h12',
  external: 'M14 4.5h5.5V10M19.5 4.5 11 13M17 14v5.5H4.5V7H10',
  lock: 'M6.5 10.5h11v9h-11zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5.5M12 7.5v.01',
  search: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15.5 15.5l5 5',
  download: 'M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15',
  mail: 'M3.5 6h17v12h-17zM3.5 6.5l8.5 6.5 8.5-6.5',
  signOut: 'M14 4.5H5.5v15H14M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5',
  team: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M15.5 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.2A6 6 0 0 1 21 20',
  institution: 'M3.5 20.5h17M5 20.5v-9M19 20.5v-9M9.5 20.5v-9M14.5 20.5v-9M3.5 9 12 3.5 20.5 9z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  spark: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.4-5.5M19.5 4v4h-4',
  plus: 'M12 5v14M5 12h14',
  user: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',

  // The 17 checks (Instagram and YouTube show their own logos instead).
  searchResults: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15.5 15.5l5 5M7.5 9h6M7.5 12h4',
  mapPin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  assistant: 'M4.5 4.5h15v11H10l-5.5 4.5zM12 7.5v5M9.5 10h5',
  share: 'M17.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6.5 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.7 10.8l6.6-3.6M8.7 13.2l6.6 3.6',
  placements: 'M3.5 8h17v11.5h-17zM9 8V5.5h6V8M8.5 13.5l2.5 2.5 4.5-4.5',
  star: 'M12 3.5l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.8l-5.4 2.9 1.2-5.9-4.4-4.1 6-.7z',
  seal: 'M12 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM9.5 9l2 2 3-3.5M8.5 13.5 7 20.5l5-2.5 5 2.5-1.5-7',
  lecturer: 'M8.5 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 20.5a5 5 0 0 1 10 0M14 4.5h6.5v8H16',
  video: 'M3.5 7h12v10h-12zM15.5 10.5l5-3v9l-5-3',
  fees: 'M3 6.5h18v11H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 9.5v5M18 9.5v5',
  webPage: 'M3.5 4.5h17v15h-17zM3.5 8.5h17M7 12.5h10M7 15.5h6',
  enquiry: 'M4 4.5h16v11h-9l-5 4v-4H4zM8 8.5h8M8 11.5h5',
  steps: 'M3.5 19.5h5v-5h5v-5h5v-5h2',
  phone: 'M7 2.5h10v19H7zM11 18.5h2',
  stopwatch: 'M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM12 13.5V10M10 2.5h4M18.5 6l1.5-1.5',
  // The three pillars.
  compass: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM15.5 8.5l-2 5-5 2 2-5z',
  shield: 'M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6zM8.5 12l2.5 2.5 4.5-5',
  target: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  // Sections.
  wrench: 'M14.8 4.2a4.5 4.5 0 0 0-5.6 5.6L3.5 15.5l5 5 5.7-5.7a4.5 4.5 0 0 0 5.6-5.6l-2.8 2.8-3.5-.5-.5-3.5z',
  checkCircle: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM8 12.5l2.7 2.7L16 9.5',
  // Neutral platform icons, for brands whose logo Drishti does not show.
  globe: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z',
  forum: 'M3.5 4.5h11v8h-6l-3.5 3v-3H3.5zM14.5 9.5h6v8H19v3l-3.5-3h-4v-2.5',
  briefcase: 'M3.5 8h17v11.5h-17zM9 8V5.5h6V8M3.5 13h17',
} as const;

export type LineIconName = keyof typeof LINE_ICONS;

/** A line icon of Drishti's own, or a brand's one-colour logo. */
export type IconRef = { kind: 'line'; name: LineIconName } | { kind: 'brand'; brand: Brand };

const line = (name: LineIconName): IconRef => ({ kind: 'line', name });

/** One icon for each of the 17 checks. A check named after a platform shows that platform's mark. */
export const CHECK_ICONS: Readonly<Record<CheckKey, IconRef>> = {
  google_search: line('searchResults'),
  instagram_activity: { kind: 'brand', brand: 'instagram' },
  google_profile: line('mapPin'),
  youtube: { kind: 'brand', brand: 'youtube' },
  ai_answers: line('assistant'),
  other_socials: line('share'),
  placement_proof: line('placements'),
  review_rating: line('star'),
  approvals: line('seal'),
  faculty_leaders: line('lecturer'),
  students_in_content: line('video'),
  fees_shown: line('fees'),
  program_page: line('webPage'),
  easy_enquiry: line('enquiry'),
  admission_steps: line('steps'),
  mobile_friendly: line('phone'),
  page_speed: line('stopwatch'),
};

/** Discovered: can students find you. Trusted: do they believe you. Chosen: is it easy to pick you. */
export const PILLAR_ICONS: Readonly<Record<Pillar, LineIconName>> = {
  discovered: 'compass',
  trusted: 'shield',
  chosen: 'target',
};
