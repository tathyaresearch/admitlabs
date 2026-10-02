// The AdmitLabs website's settings (admitlabs.in). Every [ADJUSTABLE] value lives here.

export const SITE_SETTINGS = {
  /**
   * [ADJUSTABLE] Show "Our work" on the home page. Keep it off until the content samples are ready
   * and listed in src/site/work.ts; with no samples the section never shows, whatever this says.
   */
  showWork: false,
  /** [ADJUSTABLE] Tathya's address: the students band's button and the header's Products menu. */
  tathyaUrl: 'https://mytathya.in',
  /** Where enquiries and questions go. */
  email: 'hello@admitlabs.in',
} as const;

/** The "Work with us" form's limits. The database checks the same ones (enquiries migration). */
export const ENQUIRY_RULES = {
  nameMax: 120,
  institutionMax: 160,
  programMax: 160,
  messageMax: 2000,
  /** Enquiries one email address can send in a day; more are turned away politely. */
  perEmailPerDay: 3,
} as const;
