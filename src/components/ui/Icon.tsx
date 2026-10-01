// Hand-drawn icon set (paths in src/graphics/icons.ts). 24px grid, 1.75px strokes, square ends to
// match the brand's sharp edges.
// Icons are decorative by default; pass a label when an icon stands alone.

import type { SVGProps } from 'react';
import { LINE_ICONS as PATHS } from '@/graphics/icons';

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
