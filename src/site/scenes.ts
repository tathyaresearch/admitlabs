// What the website's pictures show, in one place: a made-up institution, Larkmoor University, in
// Bangalore, with made-up neighbours. None of these names is a real institution (checked on
// 2026-10-02), and none of this is Drishti's own sample data, which the product page and the
// dashboard keep. The pictures carry no caption. No dashes, curly quotes only (content.test.ts).

export const CITY = 'Bangalore';

export const INSTITUTION = {
  name: 'Larkmoor University',
  short: 'Larkmoor',
  site: 'larkmoor-university.example',
  handle: 'larkmoor.university',
} as const;

/** Its neighbours, for the search results and the rivals. */
export const OTHERS = {
  calderwood: { name: 'Calderwood College', site: 'calderwood-college.example', initial: 'C' },
  brackenfield: { name: 'Brackenfield University', site: 'brackenfield-university.example', initial: 'B' },
  thornbury: { name: 'Thornbury College', site: 'thornbury-college.example', initial: 'T' },
} as const;

/** Discovered: a student searches, and the institution is the answer. */
export const SEARCH = {
  query: `bba colleges in ${CITY.toLowerCase()}`,
  ai: {
    label: 'AI answer',
    lead: INSTITUTION.name,
    rest: `offers a three-year BBA in ${CITY}, with a published placement report and clear fees.`,
  },
  top: {
    name: INSTITUTION.name,
    path: `${INSTITUTION.site} › bba`,
    title: `BBA at ${INSTITUTION.name}, ${CITY}`,
    line: 'Three years, 120 seats. Fees, placements and how to apply for 2026.',
  },
  next: {
    initial: OTHERS.calderwood.initial,
    name: OTHERS.calderwood.name,
    path: `${OTHERS.calderwood.site} › programs`,
    title: 'Programs and admissions',
  },
} as const;

/** Trusted: what they see when they look closer. */
export const REVIEW = {
  rating: '4.8',
  count: 312,
  countLabel: 'reviews',
  quote: '“The placement cell knew every one of us by name.”',
  author: 'Riya D., BBA 2025',
  initials: 'RD',
  proofs: [
    { icon: 'placements', label: 'Placed in 2025', value: '92%' },
    { icon: 'seal', label: 'UGC approved', value: null },
    { icon: 'reports', label: 'Placement report, published', value: null },
  ],
} as const;

/** Chosen: asking is easy, and someone answers. */
export const ENQUIRY_SCENE = {
  title: 'Ask about BBA 2026',
  facts: [
    { label: 'Fees', value: '1.2 lakh', rest: 'a year' },
    { label: 'Apply by', value: '30 June', rest: '' },
  ],
  fields: [
    { label: 'Name', value: 'Riya Das' },
    { label: 'Phone', value: '+91 98765 43210' },
  ],
  send: 'Send enquiry',
  received: 'Enquiry received',
  when: '2 min ago',
} as const;

/** The pictures' three films: short silent loops in public/brand/videos, each with a still of its
 *  first frame, made at twice their largest size on screen (originals in brand/videos, not in git). */
export const CLIPS = {
  /** Program Growth: the class, in the program page's video box. */
  bbaClass: { src: '/brand/videos/v1-bba-class.mp4', poster: '/brand/videos/v1-bba-class.webp', width: 476, height: 268 },
  /** Institution Branding: the reel, A day in BBA. */
  reel: { src: '/brand/videos/v2-reel-day-in-bba.mp4', poster: '/brand/videos/v2-reel-day-in-bba.webp', width: 450, height: 800 },
  /** Institution Branding: the film's thumbnail, Placements 2025. */
  placements: { src: '/brand/videos/v3-youtube-placement.mp4', poster: '/brand/videos/v3-youtube-placement.webp', width: 366, height: 206 },
} as const;

/** Program Growth: one program's own page, on a laptop and a phone. */
export const PROGRAM_PAGE = {
  url: `${INSTITUTION.site}/bba`,
  nav: ['Programs', 'Admissions', 'Campus'],
  apply: 'Apply',
  kicker: 'Bachelor of Business Administration',
  title: `BBA at ${INSTITUTION.short}`,
  line: `Three years in ${CITY}, with a placement cell that knows you by name.`,
  facts: [
    { label: 'Fees a year', value: '2.4 lakh' },
    { label: 'Placed in 2025', value: '92%' },
    { label: 'Apply by', value: '30 June' },
  ],
  faculty: [
    { initials: 'MR', name: 'Dr. Meera Rao', role: 'Finance' },
    { initials: 'AK', name: 'Arjun Kamath', role: 'Marketing' },
  ],
  applyNow: 'Apply now',
} as const;

/** The pictures' photos: 16 stills in public/brand/thumbs, numbered as they were made, toned to the
 *  films (originals in brand/thumbs, not in git). The first five are posts on the official page
 *  (tiles, 116 px); all 16 fill the season's busiest weeks (weeks, 68 px). Twice their size on screen. */
export const PHOTOS = [
  '01-campus-at-7am',
  '02-meet-dr-rao',
  '03-fees-explained',
  '04-alumni-at-work',
  '05-hostel-tour',
  '06-library',
  '07-campus-fest',
  '08-convocation',
  '09-campus-visit',
  '10-admission-desk',
  '11-applying-online',
  '12-orientation-day',
  '13-lab-session',
  '14-faculty-mentoring',
  '15-campus-canteen',
  '16-sports-ground',
] as const;

const tilePhoto = (index: number) => `/brand/thumbs/tiles/${PHOTOS[index]}.webp`;

/** Institution Branding: the official page, posts, a reel and a film. */
export const SOCIAL = {
  handle: INSTITUTION.handle,
  posts: 248,
  followers: '18.4K',
  bio: `${INSTITUTION.name}, ${CITY}`,
  tiles: [
    { kind: 'figure', big: '92%', small: 'placed in 2025' },
    { kind: 'person', small: 'Meet Dr. Rao', photo: tilePhoto(1) },
    { kind: 'reel', small: 'Campus at 7am', photo: tilePhoto(0) },
    { kind: 'text', small: 'Fees, explained', photo: tilePhoto(2) },
    { kind: 'person', small: 'Alumni at work', photo: tilePhoto(3) },
    { kind: 'reel', small: 'Hostel tour', photo: tilePhoto(4) },
  ],
  reel: {
    label: 'Reels',
    title: 'A day in BBA',
    caption: '6am to 6pm with our first years.',
    likes: '2,410',
    time: '0:21',
  },
  film: {
    title: 'Placements 2025, the full story',
    channel: INSTITUTION.name,
    views: '18K views',
    length: '12:40',
  },
} as const;

/** Admit Campaign: a season, planned week by week, busiest when students decide. */
export const SEASON = {
  title: 'Admission season 2026',
  legend: 'Posts each week',
  months: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  /** How busy each week is, 0 to 4, four weeks a month. */
  weeks: [1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 2, 2, 1, 1],
  marks: [
    { week: 4, label: 'Applications open' },
    { week: 19, label: 'Last date, 30 June' },
  ],
  thisWeek: 'This week',
  plan: [
    { day: 'Mon', brand: 'instagram', kind: 'Reel', title: 'Hostel tour' },
    { day: 'Wed', brand: 'instagram', kind: 'Post', title: 'Fees, explained' },
    { day: 'Fri', brand: 'youtube', kind: 'Live', title: 'Ask our alumni' },
  ],
} as const;

/** How many squares a week has: one for each day it can post on. */
export const SEASON_DAYS = 5;

/**
 * Which photo fills each square of the busiest weeks (level 4), by week then day; null for the
 * other weeks. All 16 are used before any repeats, shuffled with a fixed seed (the same on every
 * visit), and a photo never sits beside itself, not even across a corner.
 */
export function peakPhotos(weeks: readonly number[], days = SEASON_DAYS, count = PHOTOS.length, seed = 2026): (number[] | null)[] {
  let state = seed;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = () => {
    const bag = Array.from({ length: count }, (_, index) => index);
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [bag[i], bag[j]] = [bag[j]!, bag[i]!];
    }
    return bag;
  };
  const peak = Math.max(...weeks);
  const grid: (number[] | null)[] = weeks.map(() => null);
  let bag = shuffled();
  weeks.forEach((level, week) => {
    if (level !== peak) return;
    const column: number[] = [];
    for (let day = 0; day < days; day += 1) {
      const before = grid[week - 1];
      const near = new Set([column[day - 1], before?.[day - 1], before?.[day], before?.[day + 1]]);
      let at = bag.findIndex((photo) => !near.has(photo));
      if (at < 0) {
        bag = [...bag, ...shuffled()];
        at = bag.findIndex((photo) => !near.has(photo));
      }
      column.push(bag.splice(at, 1)[0]!);
      if (bag.length === 0) bag = shuffled();
    }
    grid[week] = column;
  });
  return grid;
}

/** The season's busiest weeks, as drawn: each square's photo, as its index in PHOTOS. The squares
 *  carry only the number (data-photo, from 1); services.module.css maps it to the file (week
 *  squares, 68 px), which keeps 45 file paths out of the page. */
export const SEASON_PHOTOS = peakPhotos(SEASON.weeks);

/** Drishti: the institution's Home, as the dashboard would show it. */
export const DASHBOARD = {
  address: 'app.admitlabs.in',
  nav: ['Home', 'Audit', 'Rivals', 'Demand', 'Reports'],
  title: 'Home',
  question: 'How are we doing this month?',
  words: {
    title: 'Visibility, Trust and Chosen',
    /** Each word, on a thin bar of the points behind it, out of 100, and what to fix first in it. */
    items: [
      { name: 'Visibility', word: 'Strong', value: 75, fix: 'AI answers' },
      { name: 'Trust', word: 'Okay', value: 69, fix: 'Placements' },
      { name: 'Chosen', word: 'Strong', value: 74, fix: 'Admission steps' },
    ],
    /** Before each word's weakest check. */
    fixFirst: 'Fix first',
    answer: 'Students can find you. Next step: earning their trust.',
  },
  things: {
    title: 'Do these 3 things this month',
    items: [
      { title: 'Reply to every Google review', from: 'Audit' },
      { title: 'Publish your BBA placement results', from: 'Rivals' },
      { title: 'Last year’s BBA placements, one student per reel', from: 'Make these 3' },
    ],
    note: 'A fix, a lesson from your rivals and one of Make these 3.',
  },
  rivals: {
    title: `Your rivals in ${CITY}`,
    rank: '2nd',
    of: 4,
    rows: [
      { name: OTHERS.calderwood.name, score: 77, you: false },
      { name: 'You', score: 73, you: true },
      { name: OTHERS.brackenfield.name, score: 52, you: false },
      { name: OTHERS.thornbury.name, score: 45, you: false },
    ],
    line: `This month, ${OTHERS.calderwood.name} is ahead on placement proof and Instagram.`,
  },
  demand: {
    title: `Rising fastest in ${CITY}`,
    topic: 'BCA with AI and Machine Learning',
    word: 'Rising',
    searches: 350,
    months: [
      { month: 'Apr', value: 199 },
      { month: 'May', value: 217 },
      { month: 'Jun', value: 243 },
      { month: 'Jul', value: 282 },
      { month: 'Aug', value: 350 },
    ],
  },
} as const;
