'use client';

// The header's Products menu: the browser's own popover, placed under its button (Escape or a click
// outside closes it), and closed again when a product is chosen. Tathya opens in a new tab.

import { useRef } from 'react';
import { EyeName } from '@/components/ui/Eye';
import { Icon } from '@/components/ui/Icon';
import type { PRODUCTS } from '@/site/content';
import styles from './site.module.css';

const MENU_ID = 'products-menu';

export function ProductsMenu({ products }: { products: typeof PRODUCTS }) {
  const menu = useRef<HTMLDivElement>(null);
  const close = () => menu.current?.hidePopover();

  return (
    <>
      <button type="button" className={`${styles.navLink} ${styles.productsButton}`} popoverTarget={MENU_ID}>
        {products.label}
        <Icon name="chevronDown" size={14} />
      </button>
      <div id={MENU_ID} ref={menu} popover="auto" className={styles.products}>
        <ul className={styles.productsList}>
          {products.items.map((item) => (
            <li key={item.name}>
              <a href={item.href} className={styles.product} onClick={close} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noreferrer' : undefined}>
                <span className={styles.productName}>
                  {item.eye ? (
                    <EyeName lashes={false}>
                      <span>{item.name}</span>
                    </EyeName>
                  ) : (
                    item.name
                  )}
                  {item.newTab ? <Icon name="arrowUpRight" size={14} className={styles.productArrow} /> : null}
                </span>{' '}
                <span className={styles.productFor}>{item.for}</span>
                {item.newTab ? <span className="visually-hidden"> (opens in a new tab)</span> : null}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
