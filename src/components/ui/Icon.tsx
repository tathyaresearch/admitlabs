// Hand-drawn icon set. 24px grid, 1.75px strokes, square ends to match the brand's sharp edges.
// Icons are decorative by default; pass a label when an icon stands alone.

import type { SVGProps } from 'react';

const PATHS = {
  home: 'M3.5 10.5 12 3.5l8.5 7M5.5 9v11h13V9M9.5 20v-6h5v6',
  audit: 'M4 18a8 8 0 1 1 16 0M12 18l4-6M8 7.2l.9 1.5M16 7.2l-.9 1.5M4.6 12.2l1.6.6M19.4 12.2l-1.6.6',
  rivals: 'M4 7h11M11.5 3.5 15 7l-3.5 3.5M20 17H9M12.5 13.5 9 17l3.5 3.5',
  demand: 'M3.5 17.5 9 12l4 4 7.5-8M15.5 8h5v5',
  reports: 'M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12h6M9 15.5h6',
  plan: 'M12 3.5 20.5 8 12 12.5 3.5 8zM3.5 12 12 16.5 20.5 12M3.5 16 12 20.5 20.5 16',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5h4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M4.5 12.5l5 5 10-11',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17 17 7M9 7h8v8',
  equal: 'M6 9.5h12M6 14.5h12',
  external: 'M14 4.5h5.5V10M19.5 4.5 11 13M17 14v5.5H4.5V7H10',
  lock: 'M6.5 10.5h11v9h-11zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5.5M12 7.5v.01',
  search: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15.5 15.5l5 5',
  download: 'M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15',
  mail: 'M3.5 6h17v12h-17zM3.5 6.5l8.5 6.5 8.5-6.5',
  signOut: 'M14 4.5H5.5v15H14M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5',
  team: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M15.5 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.2A6 6 0 0 1 21 20',
  institution: 'M3.5 20.5h17M5 20.5v-9M19 20.5v-9M9.5 20.5v-9M14.5 20.5v-9M3.5 9 12 3.5 20.5 9z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  spark: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
} as const;

export type IconName = keyof typeof PATHS;

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Give a label only when the icon is the only thing that says what something does. */
  label?: string;
}

export function Icon({ name, size = 20, label, strokeWidth = 1.75, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap={name === 'more' ? 'round' : 'square'}
      strokeLinejoin="miter"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} strokeWidth={name === 'more' ? 3 : undefined} />
    </svg>
  );
}
