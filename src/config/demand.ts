// Demand rules (spec sections 9, 10 and 11). Every [ADJUSTABLE] value lives here.

export const DEMAND_RULES = {
  /** [ADJUSTABLE] A rise of this much or more in your city, for one of your programs, is a big spike: Paid and Client get an alert. */
  spikeMinChangePct: 40,
  /** Shared pulls run once a month on this day (India time), for that month. */
  pullDay: 28,
  /** [ADJUSTABLE] The words for a search trend (spec 9.5): up this much or more is "Rising fast". */
  risingFastMinPct: 40,
  /** [ADJUSTABLE] Up this much or more (and under Rising fast) is "Rising". */
  risingMinPct: 10,
  /** [ADJUSTABLE] Down this much or more is "Falling". Anything between is "Steady". */
  fallingMinDropPct: 5,
  /** Make these 3 this month (spec 9.4). */
  picks: 3,
  /**
   * [ADJUSTABLE] A city has too little data for a program when search trends give it nothing, or
   * fewer questions than this were counted there: its state fills in (spec 9.2).
   */
  cityMinQuestions: 20,
  /** How many of each list the page shows before "Show more". */
  topQuestions: 5,
  contentIdeas: 5,
  trendsShown: 6,
  moreIdeasShown: 5,
  /** The questions shown under each topic of what students ask. */
  topicQuestions: 2,
  /** Months of the fastest rise shown as bars. */
  historyMonths: 6,
} as const;
