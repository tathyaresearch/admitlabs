'use client';

// Flips between the black and ivory surfaces. The choice is saved in a cookie so the server
// renders the same theme next time, with no flash. Until someone chooses, the device decides.

import { useSyncExternalStore } from 'react';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { THEME_COOKIE, type ThemeChoice } from '@/lib/theme';

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  media.addEventListener('change', onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    media.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

function currentTheme(): ThemeChoice {
  const saved = document.documentElement.dataset.theme;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function choose(next: ThemeChoice) {
  document.documentElement.dataset.theme = next;
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

function useTheme(): { theme: ThemeChoice; next: ThemeChoice } {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'dark' as ThemeChoice);
  return { theme, next: theme === 'dark' ? 'light' : 'dark' };
}

export function ThemeToggle() {
  const { theme, next } = useTheme();
  return <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={`Switch to the ${next} theme`} onClick={() => choose(next)} />;
}

/** The same switch as a row in the account menu. */
export function ThemeMenuItem({ className }: { className?: string }) {
  const { theme, next } = useTheme();
  return (
    <button type="button" className={className} onClick={() => choose(next)}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      {next === 'light' ? 'Light theme' : 'Dark theme'}
    </button>
  );
}
