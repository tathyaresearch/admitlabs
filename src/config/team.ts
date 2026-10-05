// Team tools (spec sections 5, 13 and 19, Phase 6 decisions). The database enforces the shared
// fix limit (private.shared_fix_limit in the team_tools migration) and orders the list by the
// same attention rules (private.attention_score_drop and private.attention_follow_up_days in the
// ask_paid_attention migration); tests on both sides check they agree.

export const TEAM_RULES = {
  /** A share link works this many days, unless the team stops it sooner. */
  shareLinkDays: 90,
  /** A shared Audit explains this many fixes in full; one line above the rest says AdmitLabs can fix them. */
  sharedFixesInFull: 3,
  /** Institutions in one bulk Audit. */
  bulkMaxRows: 100,
  /** Institutions on each page of the team's list. */
  institutionsPerPage: 50,
  /** A score that drops by this much or more at an Audit needs attention. */
  attentionScoreDrop: 3,
  /** A prospect who has not signed up this many days after their Audit was shared needs a follow-up. */
  followUpAfterDays: 7,
} as const;

/** Where a prospect writes to AdmitLabs, on the shared Audit and its PDF. */
export const ADMITLABS_EMAIL = 'hello@admitlabs.in';
