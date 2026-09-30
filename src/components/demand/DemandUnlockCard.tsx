// Free: the one card that says what Paid adds to Demand, with the one "Unlock with Paid" action
// on the page. It names what is locked and counts it, to show the data is real. Nothing locked
// is sent to the page.

import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { plural } from '@/domain/format';
import type { FreeDemand } from '@/lib/demand/load';
import audit from '@/components/audit/audit.module.css';

export function DemandUnlockCard({ teaser }: { teaser: FreeDemand['teaser'] }) {
  const more = Math.max(0, teaser.trends - 1);
  const items = [
    teaser.questions > 0 ? `The top ${plural(teaser.questions, 'student question', 'student questions')} this month, with where they were asked` : 'The top student questions this month',
    teaser.worries > 0
      ? `${plural(teaser.worries, 'worry', 'worries')} students raise${teaser.newWorries ? `, ${teaser.newWorries} of them new this month` : ''}`
      : 'What students worry about',
    teaser.ideas > 0 ? `${plural(teaser.ideas, 'content idea', 'content ideas')}, each built on a real question` : 'Content ideas built on real questions',
    more > 0 ? `${plural(more, 'more course or career', 'more courses and careers')} rising and falling` : 'Every course and career rising and falling',
    'Where you are in the admission year',
    'Your state and all of India, not just your city',
    'What students say about you and your rivals',
    'An alert when a course or career spikes in your city',
  ];
  return (
    <section className={audit.unlock} aria-labelledby="unlock-title">
      <div className={audit.unlockText}>
        <h2 id="unlock-title" className={audit.unlockTitle}>
          Paid shows everything students are asking
        </h2>
        <ul className={audit.unlockList}>
          {items.map((item) => (
            <li key={item} className={audit.unlockItem}>
              <Icon name="lock" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <ButtonLink href="/plan" iconAfter="arrowRight">
        Unlock with Paid
      </ButtonLink>
    </section>
  );
}
