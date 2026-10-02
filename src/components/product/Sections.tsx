// The product page, /drishti, in the website's Spotlight style: the hero with Home itself, the
// problem as a Drishti card with nothing in it, the three features (each opening with a bar that
// stays while its pictures pass), the score as a ledger of every check, the rules, how it works and
// the final call. Plans, clients and the FAQ are in ./Offer.tsx; the sample report in
// ./ReportShowcase.tsx. The header, footer, frame, buttons and light are the website's.

import type { CSSProperties, JSX } from 'react';
import { Frame } from '@/components/site/Frame';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CheckIcon, Mark, PillarIcon } from '@/components/ui/Marks';
import { Delta, ResultBar, ScoreLabel } from '@/components/ui/Results';
import { pillarChecks } from '@/audit/view';
import { SCORING_V1 } from '@/config/scoring.v1';
import { formatDate } from '@/domain/format';
import { PILLAR_LABELS, RESULTS, type CheckResult, type Pillar } from '@/domain/types';
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
    <h2 id={id} className={[site.title, light ? site.titleLight : '', styles.heading, className].filter(Boolean).join(' ')}>
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

/** The headline in two lines on a wide screen: "See where you stand, who’s ahead," then "and what students want." */
function heroLines(title: string): readonly [string, string] {
  const cut = title.lastIndexOf(', ');
  return cut < 0 ? [title, ''] : [title.slice(0, cut + 1), title.slice(cut + 2)];
}

/** The promise under the light, the two ways in, then Home itself. */
export function Hero({ showcase }: { showcase: Showcase }) {
  const [first, rest] = heroLines(HERO.title);
  return (
    <section className={`${styles.hero} ${site.grain}`} data-theme="dark" aria-labelledby="hero-title">
      <div className={styles.beam} aria-hidden="true" />
      <div className={styles.dots} aria-hidden="true" />
      <Frame draw />
      <div className={`${site.container} ${styles.heroContent}`}>
        <ProductLockup size="lg" motion="rise" className={styles.lockup} />
        <h1 id="hero-title" className={styles.heroTitle}>
          <span className={styles.heroLine}>{first}</span>{' '}
          <span className={styles.heroLine}>
            {rest} <span className={styles.highlight}>{HERO.highlight}</span>
          </span>
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

/** A value no one knows yet: a question mark where a number would be. */
function Unknown() {
  return <span className={styles.unknown}>?</span>;
}

/**
 * The problem, shown: the three questions as a Drishti card with nothing in it. Dashed bars are how
 * the product marks what it could not find; the soft bars stand in for names no one has checked.
 * A screen reader hears one sentence instead of the picture.
 */
export function Problem({ rivalCount }: { rivalCount: number }) {
  const { card } = PROBLEM;
  return (
    <section className={styles.problem} data-theme="light" aria-labelledby="problem-title">
      <div className={`${site.container} ${styles.blankGrid}`}>
        <div className={`${styles.blankWords} ${site.reveal}`}>
          <h2 id="problem-title" className={`${site.title} ${styles.heading}`}>
            {PROBLEM.title}
          </h2>
          <p className={styles.lede}>{PROBLEM.lede}</p>
        </div>
        <div className={`${styles.blankCard} ${site.reveal}`} data-theme="dark" role="img" aria-label={PROBLEM.summary}>
          <p className={styles.blankHead}>
            <strong>{card.who}</strong>
            <span>{card.checked}</span>
          </p>
          <div className={styles.blankRow}>
            <p className={styles.blankQuestion}>{card.score}</p>
            <div className={styles.blankScore}>
              <span className={styles.blankBig}>
                <Unknown />
                <small className="num">/100</small>
              </span>
              <span className={styles.dashBar} />
              <span className={styles.blankWord}>{card.unknown}</span>
            </div>
          </div>
          <div className={styles.blankRow}>
            <p className={styles.blankQuestion}>{card.rivals}</p>
            <div className={styles.ghostLadder}>
              {Array.from({ length: rivalCount }, (_, index) => (
                <span key={index} className={styles.ghostRow}>
                  <span className="num">{index + 1}</span>
                  {index === 1 ? <span className={styles.ghostYou}>{card.you}</span> : <i className={styles.ghostName} />}
                  <span className={styles.dashBar} />
                  <Unknown />
                </span>
              ))}
            </div>
            <p className={styles.blankMeta}>
              {card.rank} <Unknown /> of <span className="num">{rivalCount}</span>
            </p>
          </div>
          <div className={styles.blankRow}>
            <p className={styles.blankQuestion}>{card.demand}</p>
            <div className={styles.ghostLines}>
              <i />
              <i />
              <i />
            </div>
            <p className={styles.blankMeta}>
              <Unknown /> {card.searches}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const PICTURES: Record<Feature['key'], ({ showcase }: { showcase: Showcase }) => JSX.Element | null> = {
  audit: AuditPicture,
  rivals: RivalsPicture,
  demand: DemandPicture,
};

/** Each feature's icon, as the dashboard's own menu has it. */
const FEATURE_ICONS: Readonly<Record<Feature['key'], IconName>> = { audit: 'audit', rivals: 'rivals', demand: 'demand' };

/**
 * The three features, each in the same frame: a bar with its name, its question and its place in
 * the three, which stays at the top while its pictures pass; one short line; then the product
 * itself across the full width.
 */
export function Features({ showcase }: { showcase: Showcase }) {
  return (
    <section id="features" className={`${styles.features} ${site.grain}`} data-theme="dark" aria-labelledby="features-title">
      <Frame bottom={false} rails={false} />
      <div className={site.container}>
        <h2 id="features-title" className="visually-hidden">
          {FEATURES_HEAD.title.join(' ')}
        </h2>
        {FEATURES.map((feature, index) => {
          const Picture = PICTURES[feature.key];
          return (
            <article key={feature.key} className={`${styles.chapter} ${styles[feature.key]}`} aria-labelledby={`feature-name-${feature.key} feature-${feature.key}`}>
              <header className={styles.featureBar}>
                <p id={`feature-name-${feature.key}`} className={styles.featureName}>
                  <Icon name={FEATURE_ICONS[feature.key]} size={22} />
                  {feature.name}
                </p>
                <h3 id={`feature-${feature.key}`} className={styles.featureQuestion}>
                  {feature.question}
                </h3>
                <p className={styles.featureCount}>
                  <span className={styles.featureTicks} aria-hidden="true">
                    {FEATURES.map((each, at) => (
                      <i key={each.key} data-on={at === index ? '' : undefined} />
                    ))}
                  </span>
                  <span>
                    <span className="num">{index + 1}</span> of <span className="num">{FEATURES.length}</span>
                  </span>
                </p>
              </header>
              <p className={`${styles.lede} ${styles.featureLine} ${site.reveal}`}>{feature.line}</p>
              <div className={`${styles.pictureStage} ${styles.darkStage} ${site.reveal}`}>
                <Picture showcase={showcase} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const QUESTIONS = Object.fromEntries(SCORE.pillars.map((part) => [part.pillar, part.question])) as Readonly<Record<Pillar, string>>;

/** What a result earns, short enough for one line on a phone: from the scoring settings. */
function earns(result: CheckResult): string {
  const share = SCORING_V1.resultShares[result];
  if (share >= 1) return 'Every point';
  if (share <= 0) return 'No points yet';
  return `${Math.round(share * 100)}% of the points`;
}

/**
 * One score, inside the Audit, as a ledger: the score held on the left; on the right every check
 * by part (Discovered, Trusted, Chosen), each part's score and question, each check's result, then
 * what each result earns. A check made for each program shows its weakest program, as the Audit's
 * own grid of checks does.
 */
export function Score({ showcase }: { showcase: Showcase }) {
  const { audit, institution } = showcase;
  const parts = pillarChecks(audit);
  return (
    <section id="score" className={styles.score} data-theme="dark" aria-labelledby="score-title">
      <div className={`${site.container} ${styles.scoreGrid}`}>
        <div className={`${styles.scoreHead} ${site.reveal}`}>
          <p className={styles.featureTag}>
            <Icon name="audit" size={15} />
            {SCORE.label}
          </p>
          <h2 id="score-title" className={`${site.title} ${site.titleLight} ${styles.heading}`}>
            {SCORE.title}
          </h2>
          <p className={styles.lede}>{SCORE.lede}</p>
          <div className={styles.total}>
            <p className={styles.totalNote}>
              {institution.name}, a sample. Checked {formatDate(showcase.home.checkedAt)}.
            </p>
            <p className={styles.totalScore}>
              <span className="num">{audit.scores.overall}</span>
              <small className="num">/100</small>
            </p>
            <span className={styles.totalTrack} aria-hidden="true">
              <i style={{ width: `${audit.scores.overall}%` }} data-fill />
            </span>
            <p className={styles.totalMeta}>
              <ScoreLabel score={audit.scores.overall} />
              <Delta change={audit.changes.overall} since="last Audit" size="sm" />
            </p>
          </div>
        </div>
        <div className={`${styles.ledger} ${site.reveal}`}>
          {parts.map((part) => (
            <section key={part.pillar} className={styles.ledgerPart} aria-labelledby={`part-${part.pillar}`}>
              <header className={styles.ledgerHead}>
                <PillarIcon pillar={part.pillar} size={18} />
                <h3 id={`part-${part.pillar}`} className={styles.ledgerName}>
                  {PILLAR_LABELS[part.pillar]}
                </h3>
                <p className={styles.ledgerScore}>
                  <span className="num">{audit.scores[part.pillar]}</span>
                  <span className="visually-hidden"> out of 100</span>
                </p>
                <p className={styles.ledgerQuestion}>{QUESTIONS[part.pillar]}</p>
              </header>
              <ul className={styles.ledgerRows} aria-label={`${PILLAR_LABELS[part.pillar]} checks`}>
                {part.checks.map((check) => (
                  <li key={check.key} className={styles.ledgerRow}>
                    <span className={styles.ledgerCheck}>
                      <CheckIcon check={check.key} size={15} />
                      {check.name}
                    </span>
                    <ResultBar result={check.result} points={check.points} max={check.maxPoints} showPoints={false} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className={styles.ledgerKey}>
            <h3 className={styles.ledgerKeyTitle}>{SCORE.resultsTitle}</h3>
            <ul className={styles.results}>
              {RESULTS.map((result, index) => (
                <li key={result} className={styles.result} style={vars({ '--order': index })}>
                  <ResultBar result={result} size="sm" />
                  <span className={styles.resultShare}>{earns(result)}</span>
                </li>
              ))}
            </ul>
            <p className={styles.ledgerNote}>{SCORE.perProgram}</p>
          </div>
        </div>
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
            <h2 id="trust-title" className={`${styles.trustTitle} ${styles.heading}`}>
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
        <h2 id="final-title" className={`${sections.finalTitle} ${styles.heading} ${site.reveal}`}>
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
