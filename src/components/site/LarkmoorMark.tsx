// Larkmoor University's mark, inline (no request), in the colour of the text around it. Its shapes
// are written once on the page (LarkmoorSymbol, at the top of the home page's main) and each mark
// points to them, so every mark costs a few bytes. Sized by its class; decorative, like the pictures
// it sits in.

import type { CSSProperties } from 'react';
import { LARKMOOR_MARK } from '@/site/larkmoor-mark';

const SYMBOL = 'larkmoor-mark';

/** Hidden, taking no space: only there to be pointed to. */
const HIDDEN: CSSProperties = { position: 'absolute', width: 0, height: 0, overflow: 'hidden' };

/** The mark's shapes, once per page, before any LarkmoorMark. */
export function LarkmoorSymbol() {
  return (
    <svg style={HIDDEN} aria-hidden="true" focusable="false">
      <symbol id={SYMBOL} viewBox={LARKMOOR_MARK.viewBox}>
        <path d={LARKMOOR_MARK.shield} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        <path d={LARKMOOR_MARK.hills} fill="currentColor" />
        <path d={LARKMOOR_MARK.bird} fill="currentColor" />
      </symbol>
    </svg>
  );
}

export function LarkmoorMark({ className }: { className?: string }) {
  return (
    <svg viewBox={LARKMOOR_MARK.viewBox} className={className} aria-hidden="true" focusable="false">
      <use href={`#${SYMBOL}`} />
    </svg>
  );
}
