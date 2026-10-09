// The system, in ivory: the three things that decide whether a student picks you, shown as the
// moments a student lives (search, trust, enquiry) on one dark stage, each with its words set like
// a caption underneath. On a phone, each moment gets its own small stage, followed by its words.
// One set of markup for both.

import { SYSTEM } from '@/site/content';
import { EnquiryScene, SearchScene, TrustScene } from './Scenes';
import site from './site.module.css';
import styles from './system.module.css';

const SCENES = { discovered: SearchScene, trusted: TrustScene, chosen: EnquiryScene } as const;

export function System() {
  const [first, second] = SYSTEM.title;
  return (
    <section id="system" className={`${styles.system} ${site.grain}`} data-theme="light" aria-labelledby="system-title">
      <div className={site.container}>
        <div className={`${styles.head} ${site.reveal}`}>
          <h2 id="system-title" className={site.title}>
            {first} <span className={site.titleSoft}>{second}</span>
          </h2>
          <p className={site.lede}>
            <strong>{SYSTEM.lede.strong}</strong> {SYSTEM.lede.rest}
          </p>
        </div>

        <ol className={styles.moments}>
          {SYSTEM.pillars.map((pillar) => {
            const Scene = SCENES[pillar.pillar];
            return (
              <li key={pillar.pillar} className={styles.moment}>
                <div className={styles.scene} data-theme="dark" aria-hidden="true">
                  <Scene />
                </div>
                <div className={`${styles.words} ${site.reveal}`}>
                  <h3 className={styles.pillarName}>{pillar.name}</h3>
                  <p className={styles.pillarLine}>{pillar.line}</p>
                  <p className={styles.checks}>
                    <strong>{SYSTEM.checksLabel}</strong> {pillar.checks.join(', ')}.
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
