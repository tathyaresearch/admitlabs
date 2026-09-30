// The account menu. Uses the browser's popover: opens on click, closes on Escape or a click
// outside, with no JavaScript of our own.

import { Icon } from '@/components/ui/Icon';
import { signOut } from '@/lib/auth/actions';
import styles from './AppShell.module.css';

function initials(email: string): string {
  const name = email.split('@')[0] ?? '';
  return (name.replace(/[^a-z]/gi, '').slice(0, 2) || 'D').toUpperCase();
}

export function AccountMenu({ email, roleLabel, institutionName }: { email: string; roleLabel: string; institutionName?: string }) {
  return (
    <>
      <button type="button" className={styles.accountButton} popoverTarget="account-menu" aria-label={`Account: ${email}`}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(email)}
        </span>
        <Icon name="chevronDown" size={16} className={styles.accountChevron} />
      </button>
      <div id="account-menu" popover="auto" className={styles.menu}>
        <div className={styles.menuHead}>
          <p className={styles.menuEmail}>{email}</p>
          <p className={styles.menuRole}>{institutionName ? `${roleLabel}, ${institutionName}` : roleLabel}</p>
        </div>
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
