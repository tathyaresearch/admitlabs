// A Client's Home while its Brain is being set up (spec section 26): Help us know you, the one
// loud card, with how complete the Brain is and what only the college can add.

import { Icon } from '@/components/ui/Icon';
import { KpiBar } from '@/components/ui/Kpi';
import { Card } from '@/components/ui/Layout';
import { ButtonLink } from '@/components/ui/Button';
import { joinNames } from '@/domain/format';
import styles from './brain.module.css';

export function HelpCard({ percent, left, canFill }: { percent: number; left: readonly string[]; canFill: boolean }) {
  const shown = left.slice(0, 2);
  return (
    <Card inverted padding="md" className={styles.helpCard}>
      <div className={styles.helpCardText}>
        <h2 className={styles.helpCardTitle}>
          <Icon name="brain" size={20} />
          Help us know you
        </h2>
        <p className={styles.helpCardLine}>
          {left.length
            ? `${left.length} ${left.length === 1 ? 'thing' : 'things'} only you know, like ${joinNames(shown)}. Your AdmitLabs team uses them in every post and fix.`
            : 'Everything your AdmitLabs team needs is in. They mark your Brain Ready once onboarding is done.'}
        </p>
      </div>
      <div className={styles.helpCardSide}>
        <p className={styles.helpCardMeter}>
          <span>Your Brain</span>
          <span className="num">{percent}%</span>
        </p>
        <KpiBar value={percent} />
        <div className={styles.formActions}>
          {canFill && left.length ? (
            <ButtonLink href="/brain/help" iconAfter="arrowRight" size="sm">
              Fill them in
            </ButtonLink>
          ) : null}
          <ButtonLink href="/brain" variant="quiet" size="sm">
            See your Brain
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
