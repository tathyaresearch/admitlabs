'use client';

// A picture's box that marks itself (data-near) once it comes close to the screen, so its
// stylesheet loads the box's photos only then. Until then, and without a script, the box keeps its
// drawn placeholders. A box hidden at this width (display none) never comes close.

import { useEffect, useRef, useState, type HTMLAttributes } from 'react';

/** How far ahead of the screen a picture's photos and films start loading. */
export const LOAD_AHEAD = '400px 0px';

export function NearScreen({ children, ...props }: HTMLAttributes<HTMLDivElement> & { 'data-theme'?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: LOAD_AHEAD },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} {...props} data-near={near ? '' : undefined}>
      {children}
    </div>
  );
}
