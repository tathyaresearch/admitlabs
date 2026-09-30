// The saved theme lives in a cookie so the server renders the right surface with no flash.
// No cookie means "follow the device".

export const THEME_COOKIE = 'drishti-theme';

export type ThemeChoice = 'light' | 'dark';

export function parseTheme(value: string | undefined | null): ThemeChoice | null {
  return value === 'light' || value === 'dark' ? value : null;
}
