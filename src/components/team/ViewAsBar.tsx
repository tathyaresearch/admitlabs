// The strip at the top of an institution's dashboard while the team views it: whose it is, that
// it is read only, and the way back.

import { stopViewingAction } from '@/app/team/view-as-actions';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './team.module.css';

export function ViewAsBar({ name }: { name: string }) {
  return (
    <div className={`invert ${styles.viewAs}`} role="status">
      <p className={styles.viewAsText}>
        <Icon name="team" size={18} />
        <span>
          <strong>Viewing {name} as the AdmitLabs team.</strong> Read only.
        </span>
      </p>
      <form action={stopViewingAction}>
        <Button type="submit" size="sm" variant="secondary" icon="chevronLeft">
          Back to the team area
        </Button>
      </form>
    </div>
  );
}
