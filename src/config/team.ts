// Team tools (spec sections 5, 13 and 19, Phase 6 decisions). The database enforces the shared
// fix limit (private.shared_fix_limit in the team_tools migration); a test checks they agree.

export const TEAM_RULES = {
  /** A share link works this many days, unless the team stops it sooner. */
  shareLinkDays: 90,
  /** A shared Audit explains this many fixes in full; the rest say "AdmitLabs can fix this". */
  sharedFixesInFull: 3,
  /** Institutions in one bulk Audit. */
  bulkMaxRows: 100,
  /** Institutions on each page of the team's list. */
  institutionsPerPage: 50,
  /** A Paid plan counts as ending soon this many days before it ends. */
  paidEndingSoonDays: 30,
} as const;

/** Where a prospect writes to AdmitLabs, on the shared Audit and its PDF. */
export const ADMITLABS_EMAIL = 'hello@admitlabs.in';
