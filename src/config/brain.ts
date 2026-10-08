// Client Brain rules (spec section 26). Every [ADJUSTABLE] value lives here. The database checks
// the limits that matter for safety again (brain_item_ok and the password check in the
// client_brain migration); a test reads the migration so the two never drift.

export const BRAIN_RULES = {
  /** Where a college shares its Drive folders, photos and brand files. */
  driveShareEmail: 'admitlabs@gmail.com',
  /** [ADJUSTABLE] How old a fact may get before it needs checking, in months. */
  checkMonths: { fees: 6, dates: 6, other: 12 },
  /** [ADJUSTABLE] Weeks before admissions open when the facts to check move to the top. */
  seasonWeeks: 8,
  /** The longest a short answer, a long note and the whole of one fact may be. */
  textMax: 300,
  longMax: 1500,
  /** Characters in one fact's fields, stored as JSON. The database checks it again. */
  factMax: 4000,
  /** Items in a list (do's, words to avoid, cities), and the length of each. */
  listMax: 10,
  listItemMax: 80,
  goalsMax: 3,
  coloursMax: 6,
  rivalsMax: 5,
  /** Files: a logo (an image) and brand guidelines (a PDF), in a private bucket. */
  files: {
    bucket: 'brain-files',
    logo: { maxMb: 2, types: ['image/png', 'image/jpeg', 'image/webp'] },
    guidelines: { maxMb: 10, types: ['application/pdf'] },
  },
  /** Changes the History panel shows for one fact, and Recent changes on the Overview. */
  historyShown: 20,
  recentShown: 6,
} as const;

export type BrainFileKind = 'logo' | 'guidelines';
