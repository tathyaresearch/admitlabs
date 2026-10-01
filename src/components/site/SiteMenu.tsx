'use client';

// The website's phone menu: the browser's own popover (opens and closes with the button, Escape or
// a tap outside), closed again when a link is chosen so the page can scroll to it.

import { useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './site.module.css';

const MENU_ID = 'site-menu';

export function SiteMenu({ links, work }: { links: ReadonlyArray<{ href: string; label: string }>; work: { href: string; label: string } }) {
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => menu.current?.hidePopover();

  return (
    <>
      <button type="button" className={styles.menuButton} popoverTarget={MENU_ID} aria-label={open ? 'Close the menu' : 'Menu'}>
        <Icon name={open ? 'close' : 'menu'} size={18} />
      </button>
      <div id={MENU_ID} ref={menu} popover="auto" className={styles.menu} onToggle={(event) => setOpen(event.newState === 'open')}>
        <nav className={styles.menuLinks} aria-label="On this page">
          {links.map((link) => (
            <a key={link.href} href={link.href} className={styles.menuLink} onClick={close}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.menuActions}>
          <ButtonLink href={work.href} variant="secondary" block onClick={close}>
            {work.label}
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
