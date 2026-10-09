// Larkmoor University's mark (the made-up institution in the website's pictures), redrawn by hand
// on a 32 by 32 grid from the original in brand/larkmoor-logo.png (approved 2026-10-09): a shield
// with an arched top, a lark flying up to the right, two hills with a path between them. The
// shield's walls fall on whole pixels at 16 and 32 px. Drawn in one colour (currentColor); the
// two standalone versions, near-black on cream and cream on near-black, are
// public/brand/larkmoor-mark-on-ivory.svg and larkmoor-mark-on-black.svg.

export const LARKMOOR_MARK = {
  viewBox: '0 0 32 32',
  /** The shield's centre line, stroked 2 wide with round joins. */
  shield: 'M3 3.4Q16 -1.4 29 3.4V18C29 25 22.8 28.6 16 31C9.2 28.6 3 25 3 18Z',
  /** The two hills, filled, with the path cut between them. */
  hills:
    'M3.28 20.49C6.41 19.18 10.77 19.51 13.88 21.7L23.26 26.98L23.85 25.94L14.47 20.65C17.74 18.31 22.1 17 25.16 17.44C26.68 17.65 27.99 18.42 28.93 19.29C28.21 25.45 22.37 28.75 16 31C10.06 28.9 4.57 25.89 3.28 20.49Z',
  /** The lark, filled. */
  bird: 'M10.88 3.48C12.95 5.56 15.35 7.41 16.65 8.5C17.42 9.15 17.31 10.46 18.18 10.57C18.94 9.37 20.14 8.93 21.23 9.26L23.19 10.02L21.56 10.57C20.36 11.33 21.01 13.29 18.62 14.71C16.98 15.69 15.35 15.58 14.04 15.8L12.18 18.2L11.75 16.67L8.81 16.45L13.6 14.17C12.29 13.95 11.2 13.08 10.99 12.2C11.97 12.2 12.29 11.88 12.4 11.66C10.99 11.11 10.33 9.81 10.33 8.93C11.2 9.15 11.86 9.15 12.08 9.04C10.77 7.84 10.33 5.66 10.88 3.48Z',
} as const;
