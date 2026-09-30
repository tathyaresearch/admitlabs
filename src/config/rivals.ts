// Rival rules (spec sections 8, 10 and 11). The database enforces the list size and the number
// of suggestions (private.rival_limits in the rivals_access migration); a test checks they agree.

export const RIVAL_RULES = {
  /** An institution tracks 3 to 5 rivals. */
  min: 3,
  max: 5,
  /** Suggestions shown when picking rivals. */
  suggestions: 6,
  /** Moves shown on the Rivals page: the last 30 days. */
  movesWindowDays: 30,
  /** Each weekly check looks this far back for moves, so a rival added today shows its recent ones. */
  movesLookbackDays: 31,
  /** Each weekly check also looks back over the month before, so a month's last posts count. */
  contentLookbackDays: 35,
  /** Best posts kept per rival per month. */
  postsPerMonth: 5,
  /** Best posts shown across all rivals on the Rivals page. */
  postsOnOverview: 6,
  /** How far back an admission push still counts as this season's. */
  admissionPushDays: 240,
} as const;
