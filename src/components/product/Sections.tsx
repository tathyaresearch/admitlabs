// The story of the product page: the hero, the problem, what Drishti does (a bento grid: the three
// features, the score, the monthly report and public data only), how it works, and the final call.
// Plans, clients and the FAQ are in ./Offer.tsx; the sample report in ./ReportShowcase.tsx.

import type { ReactNode } from 'react';
import { BrandMark } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Highlight } from '@/components/ui/Layout';
import { Mark, PillarIcon } from '@/components/ui/Marks';
import { ResultGauge } from '@/components/ui/Results';
import { SCORING_V1 } from '@/config/scoring.v1';
import { RESULT_LABELS, RESULTS } from '@/domain/types';
import type { IconRef } from '@/graphics/icons';
import { PLATFORM_ICONS } from '@/graphics/platforms';
import { appLink } from '@/lib/urls';
import { CTA, FEATURES, FEATURES_HEAD, FINAL, HERO, PROBLEM, PROOF_LINE, REPORT_TILE, SCORE, STEPS, TRUST_TILE, type Feature } from '@/product/content';
import type { Showcase } from '@/product/showcase';
import { AppWindow, DemandPicture, FixesPicture, LadderPicture, SAMPLE_CAPTION } from './Previews';
import { ThingsPaper } from './ReportShowcase';
import papers from './papers.module.css';
import styles from './product.module.css';

export function Eyebrow({ number, children }: { number?: string; children: string }) {
  return (
    <p className={styles.eyebrow}>
      {number ? <span className={`${styles.eyebrowNumber} num`}>{number}</span> : null}
      <span>{children}</span>
    </p>
  );
}

/** One clear promise, one button, and the product itself. */
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
        </div>
        <p className={styles.trust}>
          <Icon name="check" size={14} />
          {HERO.trust}
        </p>
      </div>
      <div className={`${styles.container} ${styles.stage}`}>
        <AppWindow showcase={showcase} />
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

function Tile({
  id,
  eyebrow,
  number,
  title,
  lede,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  number?: string;
  title: string;
  lede?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={[styles.tile, styles.reveal, className].filter(Boolean).join(' ')} aria-labelledby={id}>
      <div className={styles.tileText}>
        <Eyebrow number={number}>{eyebrow}</Eyebrow>
        <h3 id={id} className={styles.tileTitle}>
          {title}
        </h3>
        {lede ? <p className={styles.tileLede}>{lede}</p> : null}
      </div>
      {children}
    </article>
  );
}

function featureOf(key: Feature['key']): Feature {
  const feature = FEATURES.find((item) => item.key === key);
  if (!feature) throw new Error(`No feature ${key}`);
  return feature;
}

/** "Strong earns every point of a check", from the scoring config. */
function shareText(share: number): string {
  if (share >= 1) return 'Earns every point of the check';
  if (share <= 0) return 'Earns no points yet';
  return `Earns ${Math.round(share * 100)}% of the points`;
}

/** What Drishti does, as one bento grid: the three features with real pictures, then the score, the report and the rules. */
export function Features({ showcase }: { showcase: Showcase }) {
  const audit = featureOf('audit');
  const rivals = featureOf('rivals');
  const demand = featureOf('demand');
  return (
    <section id="features" className={styles.section} data-theme="dark" aria-labelledby="features-title">
      <div className={styles.container}>
        <div className={styles.head}>
          <Eyebrow>{FEATURES_HEAD.eyebrow}</Eyebrow>
          <h2 id="features-title" className={styles.title}>
            {FEATURES_HEAD.title}
          </h2>
        </div>

        <div className={styles.bento}>
          <Tile id="tile-audit" eyebrow={audit.name} number={audit.number} title={audit.question} lede={audit.lede} className={styles.tileWide}>
            <FixesPicture showcase={showcase} />
          </Tile>

          <Tile id="tile-rivals" eyebrow={rivals.name} number={rivals.number} title={rivals.question} lede={rivals.lede}>
            <LadderPicture showcase={showcase} />
          </Tile>

          <Tile id="tile-demand" eyebrow={demand.name} number={demand.number} title={demand.question} lede={demand.lede}>
            <DemandPicture showcase={showcase} />
          </Tile>

          <Tile id="tile-score" eyebrow="The score" title={SCORE.title} lede={SCORE.lede} className={styles.tileWide}>
            <ul className={styles.scorePillars}>
              {SCORE.pillars.map((pillar) => (
                <li key={pillar.pillar} className={styles.scorePillar}>
                  <p className={styles.scorePillarName}>
                    <PillarIcon pillar={pillar.pillar} size={20} />
                    {pillar.name}
                  </p>
                  <p className={styles.scorePillarQuestion}>{pillar.question}</p>
                  <p className={styles.scorePillarText}>{pillar.text}</p>
                  <p className={styles.scorePillarChecks}>
                    <span className="num">{pillar.checks.length}</span> checks
                  </p>
                </li>
              ))}
            </ul>
            <ul className={styles.resultsKey} aria-label="Every check gets one of four results">
              {RESULTS.map((result) => (
                <li key={result} className={styles.resultsKeyItem}>
                  <ResultGauge result={result} />
                  <span className={styles.resultsKeyShare}>
                    <span className="visually-hidden">{RESULT_LABELS[result]}: </span>
                    {shareText(SCORING_V1.resultShares[result])}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>

          <Tile id="tile-report" eyebrow={REPORT_TILE.name} title={REPORT_TILE.title} lede={REPORT_TILE.lede} className={`${styles.tileWideLarge} ${styles.tileReport}`}>
            <a href="#report" className={styles.tileLink}>
              {REPORT_TILE.link}
              <Icon name="arrowDown" size={16} />
            </a>
            <div className={styles.paperCrop} aria-hidden="true" inert>
              <ThingsPaper data={showcase.report} className={papers.single} />
            </div>
          </Tile>

          <Tile id="tile-trust" eyebrow={TRUST_TILE.name} title={TRUST_TILE.title}>
            <ul className={styles.trustList}>
              {TRUST_TILE.points.map((point) => (
                <li key={point} className={styles.trustPoint}>
                  <Icon name="check" size={16} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Tile>
        </div>
        <p className={styles.bentoCaption}>{SAMPLE_CAPTION}</p>
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

export function Steps() {
  return (
    <section id="how" className={styles.section} data-theme="light" aria-labelledby="how-title">
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
              <span className={`${styles.stepNumber} num`} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
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
