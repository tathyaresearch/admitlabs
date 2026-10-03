// Start here: Home's first visit guide, until the person closes it. Three short steps, each with
// where it is done: your score, your first fix, your rivals. A step that is done shows a tick.

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { CHECKS } from '@/domain/checks';
import styles from './homepage.module.css';

interface Step {
  done: boolean;
  title: string;
  text: string;
  link: { href: string; text: string } | null;
}

export function StartGuide({
  score,
  firstFix,
  fixMarked,
  rivalsPicked,
  owner,
  onClose,
}: {
  score: number;
  /** The fix that could add the most, and where it opens. Null when every check is Strong. */
  firstFix: { title: string; points: number; href: string } | null;
  /** That first fix is marked done. */
  fixMarked: boolean;
  rivalsPicked: boolean;
  /** Only the owner picks rivals. */
  owner: boolean;
  onClose: () => Promise<void>;
}) {
  const points = firstFix ? Math.round(firstFix.points) : 0;
  const steps: Step[] = [
    {
      done: true,
      title: `Your score: ${score} out of 100`,
      text: `It comes from ${CHECKS.length} checks of what students see: can they find you, do they believe you, is it easy to pick you.`,
      link: { href: '/audit', text: 'See every check' },
    },
    firstFix
      ? {
          done: fixMarked,
          title: 'Your first fix',
          text: `${firstFix.title}. It could add up to ${points} ${points === 1 ? 'point' : 'points'}.`,
          link: { href: firstFix.href, text: 'See how' },
        }
      : { done: true, title: 'Your first fix', text: 'Every check is Strong. Keep it that way.', link: null },
    rivalsPicked
      ? { done: true, title: 'Rivals picked', text: 'You see who is ahead of you. They never know who tracks them.', link: { href: '/rivals', text: 'See your rivals' } }
      : owner
        ? { done: false, title: 'Pick your rivals', text: 'Pick 3 to 5 you compete with. They never know who tracks them.', link: { href: '/rivals/choose', text: 'Pick rivals' } }
        : { done: false, title: 'Your rivals', text: 'The owner of your account picks 3 to 5 you compete with.', link: { href: '/rivals', text: 'See Rivals' } },
  ];
  return (
    <section className={styles.card} aria-labelledby="guide-title">
      <div className={styles.cardHead}>
        <h2 id="guide-title" className={styles.cardTitle}>
          <Icon name="spark" size={20} className={styles.blockIcon} />
          Start here
        </h2>
        <form action={onClose}>
          <button type="submit" className={styles.hideButton}>
            Got it, hide this
          </button>
        </form>
      </div>
      <ol className={styles.guideSteps}>
        {steps.map((step, index) => (
          <li key={step.title} className={styles.guideStep} data-done={step.done ? 'true' : undefined}>
            <span className={styles.guideStepHead}>
              <span className={`${styles.guideStepNumber} num`} aria-hidden="true">
                {step.done ? <Icon name="check" size={12} /> : index + 1}
              </span>
              {step.done ? <span className="visually-hidden">Done: </span> : null}
              {step.title}
            </span>
            <p className={styles.guideText}>{step.text}</p>
            {step.link ? (
              <Link href={step.link.href} className={styles.guideLink}>
                {step.link.text}
                <Icon name="arrowRight" size={14} />
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
