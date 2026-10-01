// The account menu. Uses the browser's popover: opens on click, closes on Escape or a click
// outside, with no JavaScript of our own. At the foot of the sidebar on desktop (opens upwards)
// and in the top bar on a phone (opens downwards).

import { Icon } from '@/components/ui/Icon';
import { signOut } from '@/lib/auth/actions';
import { ThemeMenuItem } from './ThemeToggle';
import styles from './AppShell.module.css';

export function AccountMenu({
  variant,
  email,
  roleLabel,
  institutionName,
}: {
  variant: 'side' | 'top';
  email: string;
  roleLabel: string;
  institutionName?: string;
}) {
  const id = `account-menu-${variant}`;
  return (
    <>
      {variant === 'side' ? (
        <button type="button" className={styles.accountSide} popoverTarget={id} aria-label={`Account: ${email}`}>
          <span className={styles.avatar} aria-hidden="true">
            <Icon name="user" size={18} />
          </span>
          <span className={styles.accountText}>
            <span className={styles.accountEmail}>{email}</span>
            <span className={styles.accountRole}>{roleLabel}</span>
          </span>
          <Icon name="more" size={18} className={styles.accountMore} />
        </button>
      ) : (
        <button type="button" className={styles.accountButton} popoverTarget={id} aria-label={`Account: ${email}`}>
          <span className={styles.avatar} aria-hidden="true">
            <Icon name="user" size={18} />
          </span>
        </button>
      )}
      <div id={id} popover="auto" className={`${styles.menu} ${variant === 'side' ? styles.menuSide : styles.menuTop}`}>
        <div className={styles.menuHead}>
          <p className={styles.menuEmail}>{email}</p>
          <p className={styles.menuRole}>{institutionName && institutionName !== roleLabel ? `${roleLabel}, ${institutionName}` : roleLabel}</p>
        </div>
        <ThemeMenuItem className={styles.menuItem} />
        <form action={signOut}>
          <button type="submit" className={styles.menuItem}>
            <Icon name="signOut" size={18} />
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
