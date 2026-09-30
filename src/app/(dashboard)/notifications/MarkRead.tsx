'use client';

// Opening the list counts as reading it. Runs once, after the page has shown what was new.

import { useEffect, useRef } from 'react';
import { markAllReadAction } from './actions';

export function MarkRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markAllReadAction();
  }, []);
  return null;
}
