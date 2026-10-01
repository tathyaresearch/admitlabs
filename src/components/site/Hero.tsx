// The website's hero: the promise, the two buttons, the proof line, and the signature moment: a
// real Drishti Audit of the sample institution (the product page's Eastgate University, August
// 2026, through the real scoring engine) that measures on load, or on a phone as it scrolls into
// view. As each pillar fills, its word in the headline lights. Timing lives here; the movement is
// CSS (./site.module.css).

import type { CSSProperties, ReactNode } from 'react';
import { BrandMark } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PillarIcon } from '@/components/ui/Marks';
import { Delta, ScoreLabel } from '@/components/ui/Results';
import { formatMonth, formatMonthName } from '@/domain/format';
import { bandStarts } from '@/domain/scores';
import { PILLAR_LABELS, PILLARS, type Pillar } from '@/domain/types';
import { SCORE_GAUGE, scoreGauge } from '@/graphics/gauge';
import { appLink } from '@/lib/urls';
import { SCORE } from '@/product/content';
import type { Showcase } from '@/product/showcase';
import { CTA, HERO } from '@/site/content';
import { PlayWhenSeen } from './PlayWhenSeen';
import styles from './site.module.css';

/** When each part of the card moves, in milliseconds from load. The gauge draws 250 to 1550. */
const TIMING: Readonly<Record<Pillar, { bar: number; word: number }>> = {
  discovered: { bar: 650, word: 1150 },
  trusted: { bar: 1000, word: 1500 },
  chosen: { bar: 1350, word: 1850 },
};

const vars = (values: Record<string, string | number>) => values as CSSProperties;

function Word({ pillar, children }: { pillar: Pillar; children: ReactNode }) {
  return (
    <span className={styles.word} style={vars({ '--delay': `${TIMING[pillar].word}ms` })}>
      {children}
    </span>
  );
}

/** A number that counts up from 0 (in CSS). Hidden from screen readers: the card says it in words. */
function Count({ to, delay, duration, className }: { to: number; delay: number; duration: number; className?: string }) {
  return <span className={`${className} ${styles.count} num`} style={vars({ '--to': to, '--delay': `${delay}ms`, '--count-for': `${duration}ms` })} />;
}

function ScoreCard({ showcase }: { showcase: Showcase }) {
  const { scores, label } = showcase.audit;
  const trend = showcase.home.trend;
  const first = trend[0];
  const last = trend[trend.length - 1];
  const change = first ? scores.overall - first.scores.overall : null;
  const shape = scoreGauge(scores.overall, bandStarts());
  const question = (pillar: Pillar) => SCORE.pillars.find((entry) => entry.pillar === pillar)?.question ?? '';

  return (
    <figure className={styles.cardFigure}>
      <div className={styles.scoreCard} data-theme="light" aria-hidden="true">
        <p className={styles.cardHead}>
          <span className={styles.cardTitle}>
            <Icon name="audit" size={16} />
            {HERO.card}
          </span>
          {last ? <span>{formatMonth(last.month)}</span> : null}
        </p>
        <div className={styles.gauge}>
          <svg viewBox={`0 0 ${SCORE_GAUGE.width} ${SCORE_GAUGE.height}`}>
            <path d={shape.track} className={styles.gaugeTrack} strokeWidth={SCORE_GAUGE.stroke} />
            {shape.value ? <path d={shape.value} className={styles.gaugeValue} strokeWidth={SCORE_GAUGE.stroke} pathLength={100} /> : null}
            {shape.notches.map((notch) => (
              <line key={`${notch.x1}-${notch.y1}`} {...notch} className={styles.gaugeNotch} />
            ))}
            <text x={shape.ends.zero[0]} y={shape.ends.zero[1]} className={styles.gaugeEnd}>
              0
            </text>
            <text x={shape.ends.hundred[0]} y={shape.ends.hundred[1]} className={styles.gaugeEnd}>
              100
            </text>
          </svg>
          <p className={styles.gaugeNumber}>
            <Count to={scores.overall} delay={250} duration={1300} className={styles.gaugeValueText} />
            <span className={`${styles.gaugeOf} num`}>/100</span>
          </p>
        </div>
        <div className={styles.cardMeta}>
          <ScoreLabel label={label} />
          {change !== null && first ? <Delta change={change} since={formatMonthName(first.month)} size="sm" /> : null}
        </div>
        <ul className={styles.cardPillars}>
          {PILLARS.map((pillar) => (
            <li key={pillar} className={styles.cardPillar}>
              <PillarIcon pillar={pillar} size={18} />
              <span className={styles.cardPillarName}>{PILLAR_LABELS[pillar]}</span>
              <span className={styles.cardPillarQuestion}>{question(pillar)}</span>
              <span className={styles.bar}>
                <span className={styles.barFill} style={vars({ width: `${scores[pillar]}%`, '--delay': `${TIMING[pillar].bar}ms` })} />
              </span>
              <Count to={scores[pillar]} delay={TIMING[pillar].bar} duration={600} className={styles.cardPillarValue} />
            </li>
          ))}
        </ul>
      </div>
      <figcaption className={styles.cardCaption}>
        <span className="visually-hidden">
          A Drishti Audit of a sample institution: overall score {scores.overall} out of 100, {label}
          {change !== null && first ? `, ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)} since ${formatMonthName(first.month)}` : ''}. Discovered{' '}
          {scores.discovered}, Trusted {scores.trusted}, Chosen {scores.chosen}.{' '}
        </span>
        {HERO.sample}
      </figcaption>
    </figure>
  );
}

export function Hero({ showcase }: { showcase: Showcase }) {
  const { before, words } = HERO.title;
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.container}>
        <h1 id="hero-title" className={styles.heroTitle}>
          {before} <Word pillar="discovered">{words.discovered}</Word>, <Word pillar="trusted">{words.trusted}</Word>,
          <br className={styles.wideBreak} /> and <Word pillar="chosen">{words.chosen}</Word>.
        </h1>
        <div className={styles.heroGrid}>
          <div className={styles.heroText}>
            <p className={styles.heroLede}>
              {HERO.lede} <strong>{HERO.ledeEnd}</strong>
            </p>
            <div className={styles.heroActions}>
              <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight">
                {CTA.primary}
              </ButtonLink>
              <ButtonLink href={CTA.enquiryPath} variant="secondary" size="lg">
                {CTA.secondary}
              </ButtonLink>
            </div>
            <p className={styles.proof}>
              <BrandMark size={20} className={styles.proofMark} />
              {HERO.proof}
            </p>
          </div>
          <PlayWhenSeen>
            <ScoreCard showcase={showcase} />
          </PlayWhenSeen>
        </div>
      </div>
    </section>
  );
}
