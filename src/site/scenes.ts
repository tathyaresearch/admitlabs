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
  initial: 'L',
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
    initial: INSTITUTION.initial,
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

/** Institution Branding: the official page, posts, a reel and a film. */
export const SOCIAL = {
  handle: INSTITUTION.handle,
  posts: 248,
  followers: '18.4K',
  bio: `${INSTITUTION.name}, ${CITY}`,
  tiles: [
    { kind: 'figure', big: '92%', small: 'placed in 2025' },
    { kind: 'person', initials: 'MR', small: 'Meet Dr. Rao' },
    { kind: 'reel', small: 'Campus at 7am' },
    { kind: 'text', small: 'Fees, explained' },
    { kind: 'person', initials: 'SN', small: 'Alumni at work' },
    { kind: 'reel', small: 'Hostel tour' },
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

/** Drishti: the institution's Home, as the dashboard would show it. */
export const DASHBOARD = {
  address: 'app.admitlabs.in',
  nav: ['Home', 'Audit', 'Rivals', 'Demand', 'Reports'],
  title: 'Home',
  question: 'How are we doing this month?',
  score: { title: 'Overall score', overall: 73, label: 'Strong', change: 14, since: 'April' },
  pillars: [
    { name: 'Visibility', value: 75 },
    { name: 'Trust', value: 69 },
    { name: 'Chosen', value: 74 },
  ],
  fixes: {
    title: 'Fix these first',
    unit: 'points',
    items: [
      { name: 'Placement proof', points: 4 },
      { name: 'Review rating', points: 3 },
      { name: 'Google search', points: 3 },
    ],
    note: 'All three could add up to 10 points.',
  },
  rivals: {
    title: 'Your rank',
    rank: '2nd',
    of: 4,
    rows: [
      { name: OTHERS.calderwood.name, score: 77, you: false },
      { name: 'You', score: 73, you: true },
      { name: OTHERS.brackenfield.name, score: 52, you: false },
      { name: OTHERS.thornbury.name, score: 45, you: false },
    ],
    note: `Next step: catching ${OTHERS.calderwood.name}.`,
  },
  demand: {
    title: `Rising fastest in ${CITY}`,
    topic: 'BCA with AI and Machine Learning',
    change: 24,
    months: [
      { month: 'Apr', value: 199 },
      { month: 'May', value: 214 },
      { month: 'Jun', value: 236 },
      { month: 'Jul', value: 262 },
      { month: 'Aug', value: 350 },
    ],
  },
} as const;
