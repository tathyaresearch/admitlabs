// The report's look: the dashboard's brand on A4 (spec section 14). Strictly monochrome, Bricolage
// Grotesque only (embedded from src/report/fonts), contrast from size, weight, width and black and
// ivory flips. Small text on ivory uses grey 700 (5.17:1); slate is only used on black.

import { fileURLToPath } from 'node:url';
import { Font, StyleSheet } from '@react-pdf/renderer';

export const COLORS = {
  black: '#0A0A0C',
  graphite: '#1E1F23',
  ivory: '#F2E8D6',
  slate: '#8A8D94',
  /** Small text on ivory. */
  muted: '#5E6066',
  /** Rules and tracks on ivory. */
  line: '#E2D9CA',
  lineMedium: '#CBC4B7',
  track: '#E5DCCE',
  /** Rules on black. */
  lineDark: '#303237',
  /** Longer text on black (grey 300). */
  quietDark: '#BEBAB5',
} as const;

export const FONT = 'Bricolage';
export const FONT_SEMI_CONDENSED = 'Bricolage SemiCondensed';
export const FONT_CONDENSED = 'Bricolage Condensed';

const file = (name: string) => fileURLToPath(new URL(`../fonts/${name}`, import.meta.url));

let registered = false;

/** Registers the embedded fonts once. Words are never split with a hyphen. */
export function registerFonts(): void {
  if (registered) return;
  Font.register({
    family: FONT,
    fonts: [
      { src: file('BricolageGrotesque-Regular.ttf'), fontWeight: 400 },
      { src: file('BricolageGrotesque-Medium.ttf'), fontWeight: 500 },
      { src: file('BricolageGrotesque-SemiBold.ttf'), fontWeight: 600 },
      { src: file('BricolageGrotesque-Bold.ttf'), fontWeight: 700 },
      { src: file('BricolageGrotesque-ExtraBold.ttf'), fontWeight: 800 },
    ],
  });
  Font.register({ family: FONT_SEMI_CONDENSED, src: file('BricolageGrotesque-SemiCondensedBold.ttf'), fontWeight: 700 });
  Font.register({ family: FONT_CONDENSED, src: file('BricolageGrotesque-CondensedExtraBold.ttf'), fontWeight: 800 });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

/** A4 in points, and the page margins. */
export const PAGE = { width: 595.28, height: 841.89, side: 44, top: 44, bottom: 64 } as const;

export const styles = StyleSheet.create({
  // No line height here: react-pdf passes it down in points, which would stretch small text.
  // Text that wraps sets its own.
  page: {
    fontFamily: FONT,
    fontSize: 9.5,
    color: COLORS.black,
    backgroundColor: COLORS.ivory,
    paddingTop: PAGE.top,
    paddingBottom: PAGE.bottom,
    paddingHorizontal: PAGE.side,
  },
  cover: {
    fontFamily: FONT,
    color: COLORS.ivory,
    backgroundColor: COLORS.black,
    padding: PAGE.side,
  },

  // Page head: eyebrow, title, one line on what the page shows.
  head: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.black },
  eyebrow: { fontSize: 7.5, fontWeight: 500, letterSpacing: 0.9, textTransform: 'uppercase', color: COLORS.muted, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.15 },
  lead: { fontSize: 10, color: COLORS.muted, marginTop: 5, lineHeight: 1.4 },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 600, letterSpacing: -0.15, marginBottom: 2 },
  sectionLead: { fontSize: 8.5, color: COLORS.muted, marginBottom: 8 },

  small: { fontSize: 8.5, lineHeight: 1.4 },
  caption: { fontSize: 7.5, color: COLORS.muted, lineHeight: 1.4 },
  strong: { fontWeight: 600 },
  rule: { borderBottomWidth: 0.75, borderBottomColor: COLORS.line },

  footer: {
    position: 'absolute',
    left: PAGE.side,
    right: PAGE.side,
    bottom: 28,
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.lineMedium,
    fontSize: 7.5,
    color: COLORS.muted,
  },
});
