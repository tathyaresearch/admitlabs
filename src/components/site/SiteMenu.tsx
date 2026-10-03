'use client';

// The website's phone menu: the browser's own popover (opens and closes with the button, Escape or
// a tap outside), closed again when a link is chosen so the page can scroll to it. The products sit
// together under their own small label; Tathya opens in a new tab.

import { useRef, useState } from 'react';
import { AnchorButton } from '@/components/ui/Button';
import { EyeName } from '@/components/ui/Eye';
import { Icon } from '@/components/ui/Icon';
import type { NAV, PRODUCTS } from '@/site/content';
import styles from './site.module.css';

const MENU_ID = 'site-menu';

export function SiteMenu({
  nav,
  products,
  buttons,
}: {
  nav: typeof NAV;
  products: typeof PRODUCTS;
  /** The header’s two buttons, in its order: Talk to us, outlined, then Sign in, filled. */
  buttons: ReadonlyArray<{ href: string; label: string; filled: boolean }>;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => menu.current?.hidePopover();

  return (
    <>
      <button type="button" className={styles.menuButton} popoverTarget={MENU_ID} aria-label={open ? 'Close the menu' : 'Menu'}>
        <Icon name={open ? 'close' : 'menu'} size={18} />
      </button>
      <div id={MENU_ID} ref={menu} popover="auto" className={styles.menu} onToggle={(event) => setOpen(event.newState === 'open')}>
        <nav className={styles.menuLinks} aria-label="Main">
          {nav.map((entry) =>
            'href' in entry ? (
              <a key={entry.href} href={entry.href} className={styles.menuLink} onClick={close}>
                {entry.label}
              </a>
            ) : (
              <div key={entry.label} className={styles.menuGroup}>
                <p className={styles.menuGroupLabel}>{products.label}</p>
                <ul className={styles.menuProducts}>
                  {products.items.map((item) => (
                    <li key={item.name}>
                      <a href={item.href} className={styles.menuProduct} onClick={close} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noreferrer' : undefined}>
                        <span className={styles.menuProductName}>
                          {item.eye ? (
                            <EyeName lashes={false}>
                              <span>{item.name}</span>
                            </EyeName>
                          ) : (
                            item.name
                          )}
                          {item.newTab ? <Icon name="arrowUpRight" size={16} className={styles.menuProductArrow} /> : null}
                        </span>{' '}
                        <span className={styles.menuProductFor}>{item.for}</span>
                        {item.newTab ? <span className="visually-hidden"> (opens in a new tab)</span> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </nav>
        <div className={styles.menuActions}>
          {buttons.map((button) => (
            <AnchorButton key={button.label} href={button.href} variant={button.filled ? 'primary' : 'secondary'} block onClick={close} className={button.filled ? styles.cta : styles.ghost}>
              {button.label}
            </AnchorButton>
          ))}
        </div>
      </div>
    </>
  );
}
