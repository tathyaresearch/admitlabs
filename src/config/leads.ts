// Leads rules (spec section 23). Every [ADJUSTABLE] value lives here. The database checks the
// same limits again in submit_lead(); a test reads the migration so the two never drift.

export const LEAD_RULES = {
  /** [ADJUSTABLE] Seconds a person needs at least to fill the form. Quicker is a bot, or a second try. */
  minSeconds: 3,
  /** [ADJUSTABLE] Enquiries one phone or email may send one college in a day (India time). */
  perContactPerDay: 1,
  /** [ADJUSTABLE] Enquiries one tracking link takes in an hour. */
  perLinkPerHour: 20,
  /** How long enquiries are kept, in months; the owner picks one in Settings. */
  keepMonths: [6, 12, 24] as const,
  /** [ADJUSTABLE] The keeping time to start. */
  keepMonthsDefault: 12,
  /** Who gets the alert email: up to this many addresses. */
  alertEmailsMax: 3,
  /** Enquiries the Leads page lists before "Show all". */
  listShown: 25,
  nameMax: 120,
  cityMax: 80,
  linkNameMax: 80,
} as const;

export type KeepMonths = (typeof LEAD_RULES.keepMonths)[number];
