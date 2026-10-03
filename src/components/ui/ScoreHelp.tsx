// "What do these mean?": the score, its three parts, the four results and the bands, in plain
// words, folded under one quiet line beside the score. Every number comes from the scoring config.

import { bandsText, resultShareText } from '@/domain/scores';
import { CHECKS } from '@/domain/checks';
import { PILLAR_LABELS, PILLAR_QUESTIONS, PILLARS, RESULT_LABELS, RESULTS } from '@/domain/types';
import { Icon } from './Icon';
import { PillarIcon } from './Marks';
import styles from './ScoreHelp.module.css';

export function ScoreHelp() {
  return (
    <details className={styles.help}>
      <summary className={styles.summary}>
        <Icon name="info" size={14} />
        What do these mean?
        <Icon name="chevronDown" size={14} className={styles.chevron} />
      </summary>
      <div className={styles.body}>
        <div className={styles.groups}>
          <div className={styles.group}>
            <p className={styles.lead}>The score, out of 100, is the average of three parts. Each part answers one question a student has:</p>
            <ul className={styles.list}>
              {PILLARS.map((pillar) => (
                <li key={pillar} className={styles.item}>
                  <span className={styles.name}>
                    <PillarIcon pillar={pillar} size={14} />
                    {PILLAR_LABELS[pillar]}
                  </span>
                  <span>{PILLAR_QUESTIONS[pillar]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.group}>
            <p className={styles.lead}>Each part adds up its checks ({CHECKS.length} in all). Every check gets one of four results:</p>
            <ul className={styles.list}>
              {RESULTS.map((result) => (
                <li key={result} className={styles.item}>
                  <span className={styles.name}>{RESULT_LABELS[result]}</span>
                  <span>{resultShareText(result)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.group}>
            <p className={styles.lead}>The score&apos;s band:</p>
            <p className={styles.bands}>{bandsText()}. A low score is simply the most room to grow.</p>
          </div>
        </div>
      </div>
    </details>
  );
}
