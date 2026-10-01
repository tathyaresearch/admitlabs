import { Bricolage_Grotesque, Inter } from 'next/font/google';

// Bricolage Grotesque for every word: headings, text and buttons, with all three variable axes:
// weight (200 to 800), width (75 to 100) and optical size, so hierarchy can use width as well as
// size and weight.
// next/font downloads it at build time and serves it from this app.
export const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz', 'wdth'],
  variable: '--font-bricolage',
  display: 'swap',
});

// Inter for numbers that stand on their own (scores, points, prices, counts, percentages, table
// numbers), with tabular figures so they line up. Numbers inside a sentence stay in Bricolage.
// latin-ext carries the rupee sign; the optical size axis gives big scores the display cut.
export const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz'],
  variable: '--font-inter',
  display: 'swap',
});
