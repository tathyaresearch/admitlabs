'use client';

// Version 2 mock (Step 2, development only): the few parts that run in the browser.

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { SidePanel } from '@/components/ui/Overlay';

/** Copies the ready fix as plain text, and says so. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={copied ? 'check' : undefined}
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}

/** The fix panel, open over the Audit as it is when a fix is clicked. */
export function OpenPanel({ title, description, footer, children }: { title: ReactNode; description: ReactNode; footer: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <SidePanel open={open} onClose={() => setOpen(false)} title={title} description={description} footer={footer}>
      {children}
    </SidePanel>
  );
}
