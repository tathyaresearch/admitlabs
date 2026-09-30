'use client';

// Flips between the black and ivory surfaces. The choice is saved in a cookie so the server
// renders the same theme next time, with no flash. Until someone chooses, the device decides.

import { useSyncExternalStore } from 'react';
import { IconButton } from '@/components/ui/Button';
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

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'dark' as ThemeChoice);
  const next: ThemeChoice = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      icon={theme === 'dark' ? 'sun' : 'moon'}
      label={`Switch to the ${next} theme`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      }}
    />
  );
}
