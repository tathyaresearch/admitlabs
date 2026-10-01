// The system, in ivory: the three things that decide whether a student picks you (the same three
// pillars as the Drishti score, each with the checks Drishti runs), then the monthly loop in an
// inverted black block.

import { PillarIcon } from '@/components/ui/Marks';
import { SYSTEM } from '@/site/content';
import { Loop } from './Loop';
import styles from './site.module.css';

export function System() {
  return (
    <section id="system" className={styles.system} data-theme="light" aria-labelledby="system-title">
      <div className={styles.container}>
        <div className={styles.reveal}>
          <p className={styles.eyebrow}>{SYSTEM.eyebrow}</p>
          <h2 id="system-title" className={styles.systemTitle}>
            {SYSTEM.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className={styles.systemLede}>
            <strong>{SYSTEM.lede.strong}</strong> {SYSTEM.lede.rest}
          </p>
        </div>

        <ul className={styles.pillars}>
          {SYSTEM.pillars.map((pillar) => (
            <li key={pillar.pillar} className={`${styles.pillar} ${styles.reveal}`}>
              <span className={styles.pillarIcon} aria-hidden="true">
                <PillarIcon pillar={pillar.pillar} size={22} />
              </span>
              <h3 className={styles.pillarWord}>{pillar.name}</h3>
              <p className={styles.pillarLine}>{pillar.line}</p>
              <p className={styles.pillarChecks}>
                <span className={styles.pillarChecksLabel}>{SYSTEM.checksLabel}</span>
                {pillar.checks.join(', ')}
              </p>
            </li>
          ))}
        </ul>

        <div className={`${styles.loop} ${styles.reveal}`} data-theme="dark">
          <div className={styles.loopHead}>
            <h3 className={styles.loopTitle}>{SYSTEM.loop.title}</h3>
            <p className={styles.loopNote}>{SYSTEM.loop.note}</p>
          </div>
          <Loop steps={SYSTEM.loop.steps} back={SYSTEM.loop.back} />
        </div>
      </div>
    </section>
  );
}
