'use client';

// Side panel (check detail) and dialog, built on the native <dialog> element: focus is kept
// inside, Escape closes it, and focus returns to what opened it.

import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { IconButton } from './Button';
import styles from './Overlay.module.css';

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  // A click on the <dialog> element itself (not its content) is a click on the backdrop.
  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  };

  return { ref, onBackdropClick };
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Slides in from the right. Full screen on a phone. */
export function SidePanel({ open, onClose, title, description, children, footer }: OverlayProps) {
  const { ref, onBackdropClick } = useModal(open, onClose);
  return (
    <dialog ref={ref} className={`${styles.dialog} ${styles.panel}`} onClick={onBackdropClick} aria-labelledby="side-panel-title">
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 id="side-panel-title" className={styles.title}>
              {title}
            </h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <IconButton icon="close" label="Close" onClick={() => ref.current?.close()} />
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}

/** A centred dialog for short decisions. */
export function Dialog({ open, onClose, title, description, children, footer }: OverlayProps) {
  const { ref, onBackdropClick } = useModal(open, onClose);
  return (
    <dialog ref={ref} className={`${styles.dialog} ${styles.centered}`} onClick={onBackdropClick} aria-labelledby="dialog-title">
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 id="dialog-title" className={styles.title}>
              {title}
            </h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <IconButton icon="close" label="Close" onClick={() => ref.current?.close()} />
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}
