// Copy guards. Drishti never shows em dashes or en dashes (brand rule).
// The banned characters are built from their code points so they never appear in source.

const FIGURE_DASH = 0x2012;
const EN_DASH = 0x2013;
const EM_DASH = 0x2014;
const HORIZONTAL_BAR = 0x2015;

/** Dash-like characters that are not allowed: figure dash, en dash, em dash, horizontal bar. */
export const BANNED_DASH_CODES: readonly number[] = [FIGURE_DASH, EN_DASH, EM_DASH, HORIZONTAL_BAR];

export const BANNED_DASHES: readonly string[] = BANNED_DASH_CODES.map((code) => String.fromCharCode(code));

export function dashName(char: string): string {
  const code = char.codePointAt(0);
  if (code === EM_DASH) return 'em dash';
  if (code === EN_DASH) return 'en dash';
  if (code === FIGURE_DASH) return 'figure dash';
  return 'horizontal bar';
}

export interface DashHit {
  line: number;
  column: number;
  char: string;
}

/** Every banned dash in the text, with 1-based line and column. */
export function findDashes(text: string): DashHit[] {
  const hits: DashHit[] = [];
  text.split(/\r?\n/).forEach((lineText, index) => {
    for (let column = 0; column < lineText.length; column += 1) {
      const code = lineText.charCodeAt(column);
      if (code >= FIGURE_DASH && code <= HORIZONTAL_BAR) {
        hits.push({ line: index + 1, column: column + 1, char: lineText.charAt(column) });
      }
    }
  });
  return hits;
}

export function hasDashes(text: string): boolean {
  return findDashes(text).length > 0;
}
