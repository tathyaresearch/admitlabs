// The product page, /drishti, in the website's Spotlight style: the hero with Home itself, the
// problem, the three features with the product's own pictures, the score, the rules, how it works
// and the final call. Plans, clients and the FAQ are in ./Offer.tsx; the sample report in
// ./ReportShowcase.tsx. The header, footer, frame, buttons and light are the website's.

import type { CSSProperties, JSX } from 'react';
import { Frame } from '@/components/site/Frame';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Mark, PillarIcon } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { resultShareText } from '@/domain/scores';
import { RESULTS } from '@/domain/types';
import type { IconRef } from '@/graphics/icons';
import { PLATFORM_ICONS } from '@/graphics/platforms';
import { appLink } from '@/lib/urls';
import { CTA, FEATURES, FEATURES_HEAD, FINAL, HERO, PROBLEM, PROOF_LINE, REPORT, SCORE, STEPS, TRUST, type Feature } from '@/product/content';
import type { Showcase } from '@/product/showcase';
import sections from '@/components/site/sections.module.css';
import site from '@/components/site/site.module.css';
import { AppWindow, AuditPicture, DemandPicture, RivalsPicture } from './Previews';
import styles from './product.module.css';

export const vars = (values: Record<string, string | number>) => values as CSSProperties;

/** A section title in two lines, the second in a quieter tone, as on the website. `light` on black. */
export function Title({ id, lines, light = true, className }: { id: string; lines: readonly [string, string]; light?: boolean; className?: string }) {
  const [first, second] = lines;
  return (
    <h2 id={id} className={[site.title, light ? site.titleLight : '', className].filter(Boolean).join(' ')}>
      {first} <span className={site.titleSoft}>{second}</span>
    </h2>
  );
}

/** "Drishti checks ... Every month." with the last two words set apart, as on the website. */
function lede(text: string) {
  const end = 'Every month.';
  return text.endsWith(end) ? (
    <>
      {text.slice(0, -end.length)}
      <strong>{end}</strong>
    </>
  ) : (
    text
  );
}

/** The promise under the light, the two ways in, then Home itself. */
export function Hero({ showcase }: { showcase: Showcase }) {
  return (
    <section className={`${styles.hero} ${site.grain}`} data-theme="dark" aria-labelledby="hero-title">
      <div className={styles.beam} aria-hidden="true" />
      <div className={styles.dots} aria-hidden="true" />
      <Frame draw />
      <div className={`${site.container} ${styles.heroContent}`}>
        <ProductLockup size="lg" className={styles.lockup} />
        <h1 id="hero-title" className={styles.heroTitle}>
          {HERO.title} <span className={styles.highlight}>{HERO.highlight}</span>
        </h1>
        <p className={styles.heroLede}>{lede(HERO.lede)}</p>
        <div className={styles.heroActions}>
          <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight" className={site.cta}>
            {CTA.primary}
          </ButtonLink>
          <AnchorButton href="#report" variant="secondary" size="lg" iconAfter="arrowDown" className={site.ghost}>
            {REPORT.see}
          </AnchorButton>
        </div>
        <ul className={styles.assurances}>
          <li>
            <Icon name="check" size={16} />
            {HERO.trust}
          </li>
          <li>{PROOF_LINE}</li>
        </ul>
      </div>
      <div className={`${site.container} ${styles.heroStage}`}>
        <div className={styles.tilt}>
          <AppWindow showcase={showcase} />
        </div>
      </div>
    </section>
  );
}

export function Problem() {
  return (
    <section className={styles.problem} data-theme="light" aria-labelledby="problem-title">
      <div className={site.container}>
        <div className={`${styles.problemHead} ${site.reveal}`}>
          <h2 id="problem-title" className={styles.problemTitle}>
            {PROBLEM.title}
          </h2>
          <p className={styles.problemLede}>{PROBLEM.lede}</p>
        </div>
        <ul className={styles.guesses}>
          {PROBLEM.items.map((item) => (
            <li key={item.guess} className={`${styles.guess} ${site.reveal}`}>
              <p className={styles.guessText}>{item.guess}</p>
              <p className={styles.guessAnswer}>{item.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PICTURES: Record<Feature['key'], ({ showcase }: { showcase: Showcase }) => JSX.Element | null> = {
  audit: AuditPicture,
  rivals: RivalsPicture,
  demand: DemandPicture,
};

/** Three questions, each laid out its own way around the product's answer: the Audit on a dark stage, Rivals on ivory, Demand centred. */
export function Features({ showcase }: { showcase: Showcase }) {
  return (
    <section id="features" className={`${styles.features} ${site.grain}`} data-theme="dark" aria-labelledby="features-title">
      <Frame bottom={false} rails={false} />
      <div className={site.container}>
        <Title id="features-title" lines={FEATURES_HEAD.title} className={`${styles.featuresTitle} ${site.reveal}`} />
        {FEATURES.map((feature) => {
          const Picture = PICTURES[feature.key];
          return (
            <article key={feature.key} className={`${styles.chapter} ${styles[feature.key]}`} aria-labelledby={`feature-${feature.key}`}>
              <div className={`${styles.words} ${site.reveal}`}>
                <div className={styles.featureHead}>
                  <h3 id={`feature-${feature.key}`} className={styles.question}>
                    {feature.question}
                  </h3>
                  <p className={styles.featureName}>{feature.name}</p>
                </div>
                <p className={styles.featureLede}>{feature.lede}</p>
              </div>
              <div className={`${styles.pictureStage} ${feature.key === 'rivals' ? styles.ivoryStage : styles.darkStage} ${site.reveal}`}>
                <Picture showcase={showcase} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** One score from three questions: each pillar with its checks by name, then what each result earns. */
export function Score() {
  return (
    <section id="score" className={styles.score} data-theme="dark" aria-labelledby="score-title">
      <div className={`${site.container} ${styles.scoreGrid}`}>
        <div className={`${styles.scoreHead} ${site.reveal}`}>
          <Title id="score-title" lines={SCORE.title} />
          <p className={site.lede}>{SCORE.lede}</p>
        </div>
        <ul className={styles.pillars}>
          {SCORE.pillars.map((pillar) => (
            <li key={pillar.pillar} className={`${styles.pillar} ${site.reveal}`}>
              <div className={styles.pillarHead}>
                <PillarIcon pillar={pillar.pillar} size={22} />
                <h3 className={styles.pillarName}>{pillar.name}</h3>
                <p className={styles.pillarCount}>
                  <span className="num">{pillar.checks.length}</span> checks
                </p>
              </div>
              <p className={styles.pillarQuestion}>{pillar.question}</p>
              <ul className={styles.pillarChecks} aria-label={`${pillar.name} checks`}>
                {pillar.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      <div className={`${site.container} ${styles.resultsRow} ${site.reveal}`}>
        <h3 className={styles.resultsTitle}>{SCORE.resultsTitle}</h3>
        <ul className={styles.results}>
          {RESULTS.map((result, index) => (
            <li key={result} className={styles.result} style={vars({ '--order': index })}>
              <ResultBar result={result} size="lg" />
              <span className={styles.resultShare}>{resultShareText(result)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The rules every result follows, as one band with a cross at each corner. */
export function Trust() {
  return (
    <section className={styles.trustSection} data-theme="dark" aria-labelledby="trust-title">
      <div className={site.container}>
        <div className={`${styles.trust} ${site.reveal}`}>
          <span className={sections.corners} aria-hidden="true" />
          <div>
            <h2 id="trust-title" className={styles.trustTitle}>
              {TRUST.title}
            </h2>
            <p className={styles.trustName}>{TRUST.name}</p>
          </div>
          <ul className={styles.trustPoints}>
            {TRUST.points.map((point) => (
              <li key={point}>
                <Icon name="check" size={16} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** What "Drishti checks everything" names, as marks: Google, your website, social media, reviews and AI answers. */
const CHECKED_MARKS: ReadonlyArray<{ key: string; icon: IconRef }> = [
  { key: 'google', icon: PLATFORM_ICONS.google },
  { key: 'website', icon: PLATFORM_ICONS.website },
  { key: 'instagram', icon: PLATFORM_ICONS.instagram },
  { key: 'youtube', icon: PLATFORM_ICONS.youtube },
  { key: 'reviews', icon: { kind: 'line', name: 'star' } },
  { key: 'ai', icon: PLATFORM_ICONS.ai_assistants },
];

/** Four steps on a line that fills as the page moves. */
export function Steps() {
  return (
    <section id="how" className={`${styles.steps} ${site.grain}`} data-theme="dark" aria-labelledby="how-title">
      <div className={site.container}>
        <Title id="how-title" lines={STEPS.title} className={site.reveal} />
        <ol className={styles.stepList}>
          {STEPS.items.map((step, index) => (
            <li key={step.title} className={`${styles.step} ${site.reveal}`} style={vars({ '--order': index })}>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
              {index === 1 ? (
                <ul className={styles.stepMarks} aria-hidden="true">
                  {CHECKED_MARKS.map((mark) => (
                    <li key={mark.key}>
                      <Mark icon={mark.icon} size={20} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The last word, under the same light as the top of the page: the website's final call. */
export function FinalCall() {
  return (
    <section className={`${sections.final} ${site.grain}`} data-theme="dark" aria-labelledby="final-title">
      <div className={sections.finalLight} aria-hidden="true" />
      <Frame />
      <div className={`${site.container} ${sections.finalInner}`}>
        <h2 id="final-title" className={`${sections.finalTitle} ${site.reveal}`}>
          {FINAL.title}
        </h2>
        <p className={`${sections.finalLine} ${site.reveal}`} style={vars({ '--order': 1 })}>
          {FINAL.text}
        </p>
        <div className={`${site.actions} ${sections.finalActions} ${site.reveal}`} style={vars({ '--order': 2 })}>
          <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight" className={site.cta}>
            {CTA.primary}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
