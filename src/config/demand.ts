// Demand rules (spec sections 9, 10 and 11). Every [ADJUSTABLE] value lives here.

export const DEMAND_RULES = {
  /** [ADJUSTABLE] A rise of this much or more in your city, for one of your programs, is a big spike: Paid and Client get an alert. */
  spikeMinChangePct: 40,
  /** Shared pulls run once a month on this day (India time), for that month. */
  pullDay: 28,
  /** How many of each list the page shows before "See all". */
  topQuestions: 5,
  contentIdeas: 5,
  trendsShown: 5,
  /** Months of the fastest rise shown as bars. */
  historyMonths: 6,
} as const;
