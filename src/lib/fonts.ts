import { Bricolage_Grotesque } from 'next/font/google';

// Bricolage Grotesque only, with all three variable axes: weight (200 to 800),
// width (75 to 100) and optical size, so hierarchy can use width as well as size and weight.
// next/font downloads it at build time and serves it from this app.
export const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz', 'wdth'],
  variable: '--font-bricolage',
  display: 'swap',
});
