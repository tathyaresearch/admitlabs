// The story of the product page, in spec order: the hero, the problem, the three features, the
// score, how it works, and the final call. Plans, clients and the FAQ are in ./Offer.tsx; the
// sample report in ./ReportShowcase.tsx.

import type { ComponentType } from 'react';
import { BrandMark } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Highlight } from '@/components/ui/Layout';
import { ResultMeter } from '@/components/ui/Results';
import { SCORING_V1 } from '@/config/scoring.v1';
import { RESULT_LABELS, RESULTS } from '@/domain/types';
import { appLink } from '@/lib/urls';
import { CTA, FEATURES, FINAL, HERO, PROBLEM, PROOF_LINE, SCORE, STEPS, type Feature } from '@/product/content';
import type { Showcase } from '@/product/showcase';
import { AuditSummaryPreview, DemandPreview, FixesPreview, RivalsPreview } from './Previews';
import styles from './product.module.css';

export function Eyebrow({ number, children }: { number?: string; children: string }) {
  return (
    <p className={styles.eyebrow}>
      {number ? <span className={styles.eyebrowNumber}>{number}</span> : null}
      <span>{children}</span>
    </p>
  );
}

export function Hero({ showcase }: { showcase: Showcase }) {
  return (
    <section className={`${styles.section} ${styles.hero}`} data-theme="dark" aria-labelledby="hero-title">
      <div className={`${styles.container} ${styles.heroInner}`}>
        <p className={styles.proof}>
          <BrandMark size={20} className={styles.proofMark} />
          {PROOF_LINE}
        </p>
        <h1 id="hero-title" className={styles.heroTitle}>
          {HERO.title} <Highlight>{HERO.highlight}</Highlight>
        </h1>
        <p className={styles.heroLede}>{HERO.lede}</p>
        <div className={styles.actions}>
          <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight">
            {CTA.primary}
          </ButtonLink>
          <AnchorButton href="#how" size="lg" variant="secondary">
            {CTA.how}
          </AnchorButton>
        </div>
        <p className={styles.trust}>
          <Icon name="check" size={14} />
          {HERO.trust}
        </p>
      </div>
      <div className={`${styles.container} ${styles.stage}`}>
        <AuditSummaryPreview showcase={showcase} />
      </div>
    </section>
  );
}

export function Problem() {
  return (
    <section className={`${styles.section} ${styles.underStage}`} data-theme="light" aria-labelledby="problem-title">
      <div className={`${styles.container} ${styles.problemGrid}`}>
        <div className={styles.head}>
          <Eyebrow>The problem</Eyebrow>
          <h2 id="problem-title" className={styles.title}>
            {PROBLEM.title}
          </h2>
          <p className={styles.lede}>{PROBLEM.lede}</p>
        </div>
        <ul className={styles.guesses}>
          {PROBLEM.items.map((item) => (
            <li key={item.guess} className={`${styles.guess} ${styles.reveal}`}>
              <p className={styles.guessText}>{item.guess}</p>
              <p className={styles.answer}>{item.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PREVIEWS: Readonly<Record<Feature['key'], ComponentType<{ showcase: Showcase }>>> = {
  audit: FixesPreview,
  rivals: RivalsPreview,
  demand: DemandPreview,
};

export function Features({ showcase }: { showcase: Showcase }) {
  return (
    <section id="features" className={styles.section} data-theme="dark" aria-labelledby="features-title">
      <div className={styles.container}>
        <div className={styles.head}>
          <Eyebrow>What Drishti does</Eyebrow>
          <h2 id="features-title" className={styles.title}>
            Three questions. Answered every month.
          </h2>
        </div>
        {FEATURES.map((feature) => {
          const FeaturePreview = PREVIEWS[feature.key];
          return (
            <article key={feature.key} className={styles.feature} aria-labelledby={`feature-${feature.key}`}>
              <div className={`${styles.featureText} ${styles.reveal}`}>
                <div className={styles.featureLead}>
                  <Eyebrow number={feature.number}>{feature.name}</Eyebrow>
                  <h3 id={`feature-${feature.key}`} className={styles.featureQuestion}>
                    {feature.question}
                  </h3>
                  <p className={styles.lede}>{feature.lede}</p>
                </div>
                <div className={styles.featureBody}>
                  <ul className={styles.points}>
                    {feature.points.map((point) => (
                      <li key={point} className={styles.point}>
                        <Icon name="check" size={16} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.note}>{feature.note}</p>
                </div>
              </div>
              <div className={styles.reveal}>
                <FeaturePreview showcase={showcase} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** "Strong earns every point of a check", from the scoring config. */
function shareText(share: number): string {
  if (share >= 1) return 'Earns every point of the check';
  if (share <= 0) return 'Earns no points yet';
  return `Earns ${Math.round(share * 100)}% of the points`;
}

export function ScoreSection() {
  return (
    <section id="score" className={styles.section} data-theme="light" aria-labelledby="score-title">
      <div className={styles.container}>
        <div className={styles.head}>
          <Eyebrow>The score</Eyebrow>
          <h2 id="score-title" className={styles.title}>
            {SCORE.title}
          </h2>
          <p className={styles.lede}>{SCORE.lede}</p>
        </div>
        <ul className={styles.pillars}>
          {SCORE.pillars.map((pillar) => (
            <li key={pillar.pillar} className={`${styles.pillar} ${styles.reveal}`}>
              <h3 className={styles.pillarName}>{pillar.name}</h3>
              <p className={styles.pillarQuestion}>{pillar.question}</p>
              <p className={styles.pillarText}>{pillar.text}</p>
              <ul className={styles.chips} aria-label={`What ${pillar.name} checks`}>
                {pillar.checks.map((check) => (
                  <li key={check} className={styles.chip}>
                    {check}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <div className={`${styles.key} ${styles.reveal}`} data-theme="dark">
          <p className={styles.keyTitle}>Every check gets one of four results.</p>
          <ul className={styles.keyItems}>
            {RESULTS.map((result) => (
              <li key={result} className={styles.keyItem}>
                <ResultMeter result={result} />
                <span className={styles.keyShare}>
                  <span className="visually-hidden">{RESULT_LABELS[result]}: </span>
                  {shareText(SCORING_V1.resultShares[result])}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Steps() {
  return (
    <section id="how" className={styles.section} data-theme="dark" aria-labelledby="how-title">
      <div className={styles.container}>
        <div className={styles.head}>
          <Eyebrow>How it works</Eyebrow>
          <h2 id="how-title" className={styles.title}>
            {STEPS.title}
          </h2>
        </div>
        <ol className={styles.steps}>
          {STEPS.items.map((step, index) => (
            <li key={step.title} className={`${styles.step} ${styles.reveal}`}>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FinalCall() {
  return (
    <section className={`${styles.section} ${styles.final}`} data-theme="light" aria-labelledby="final-title">
      <div className={`${styles.container} ${styles.finalInner}`}>
        <h2 id="final-title" className={styles.finalTitle}>
          {FINAL.title}
        </h2>
        <p className={styles.lede}>{FINAL.text}</p>
        <div className={styles.actions}>
          <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight">
            {CTA.primary}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
