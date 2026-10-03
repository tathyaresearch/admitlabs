// The product page, /drishti, in the website's Spotlight style: the hero with Home itself, the
// problem (most teams guess, Drishti checks) beside a card of the sample university's answers, the
// three features (each opening with a bar that stays while its pictures pass), the score as a table
// of its three parts, the rules, how it works and the final call. Plans, clients and the FAQ are in
// ./Offer.tsx; the sample report in ./ReportShowcase.tsx. The header, footer, frame, buttons and
// light are the website's.

import type { CSSProperties, JSX } from 'react';
import { Frame } from '@/components/site/Frame';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Mark, PillarIcon } from '@/components/ui/Marks';
import { ResultBar, ScoreLabel } from '@/components/ui/Results';
import { pillarChecks } from '@/audit/view';
import { SCORING_V1 } from '@/config/scoring.v1';
import { CHECKS } from '@/domain/checks';
import { formatDate, ordinal, plural } from '@/domain/format';
import { scoreLabel } from '@/domain/scores';
import { PILLAR_LABELS, RESULTS, type CheckResult, type Pillar } from '@/domain/types';
import type { IconRef } from '@/graphics/icons';
import { PLATFORM_ICONS, PLATFORM_NAMES } from '@/graphics/platforms';
import { CTA, FEATURES, FEATURES_HEAD, FINAL, HERO, PROBLEM, PROOF_LINE, REPORT, SCORE, STEPS, TRUST, type Feature } from '@/product/content';
import type { Showcase } from '@/product/showcase';
import { wayIn } from '@/site/way-in';
import sections from '@/components/site/sections.module.css';
import site from '@/components/site/site.module.css';
import { AppWindow, askedOn, AuditPicture, DemandPicture, RivalsPicture } from './Previews';
import styles from './product.module.css';

/** "Get your free Audit", or while Drishti is not open yet, "Talk to us" (src/site/way-in.ts). */
const START = wayIn(CTA.primary);

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
          <ButtonLink href={START.href} size="lg" iconAfter="arrowRight" className={site.cta}>
            {START.label}
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

/** Where the Audit looks, as marks: Google, your website, social media, reviews and AI answers. */
const CHECKED_MARKS: ReadonlyArray<{ key: string; icon: IconRef }> = [
  { key: 'google', icon: PLATFORM_ICONS.google },
  { key: 'website', icon: PLATFORM_ICONS.website },
  { key: 'instagram', icon: PLATFORM_ICONS.instagram },
  { key: 'youtube', icon: PLATFORM_ICONS.youtube },
  { key: 'reviews', icon: { kind: 'line', name: 'star' } },
  { key: 'ai', icon: PLATFORM_ICONS.ai_assistants },
];

/**
 * The problem: most teams guess, Drishti checks. The headline with its line beside it, then one wide
 * Drishti card, dense like the dashboard: a top bar with the sample university and when it was
 * checked, then its answers to the three questions side by side (stacked on a phone), each with
 * where it came from: its score from the Audit's checks of public pages, its place among its rivals
 * from each one's own Audit, and the questions asked most with their site and count, with the
 * search rising fastest under them.
 */
export function Problem({ showcase }: { showcase: Showcase }) {
  const { card } = PROBLEM;
  const { audit, institution, rivals, demand } = showcase;
  const score = audit.scores.overall;
  const you = rivals.rows.find((row) => row.you);
  const top = demand.view.topTrend;
  return (
    <section className={styles.problem} data-theme="light" aria-labelledby="problem-title">
      <div className={site.container}>
        <div className={`${styles.problemHead} ${site.reveal}`}>
          <h2 id="problem-title" className={`${site.title} ${styles.heading}`}>
            {PROBLEM.title}
          </h2>
          <p className={`${styles.lede} ${styles.problemLede}`}>{PROBLEM.lede}</p>
        </div>

        <div className={`${styles.card} ${site.reveal}`} data-theme="dark">
          <p className={styles.cardBar}>
            <span>
              <strong>{institution.name}</strong>, {institution.city}
            </span>
            <span>
              {card.checked} {formatDate(showcase.home.checkedAt)}
            </span>
          </p>

          <div className={styles.cardPanels}>
            <section className={styles.cardPanel} aria-labelledby="card-score">
              <h3 id="card-score" className={styles.cardQuestion}>
                {card.score}
              </h3>
              <div className={styles.cardScore}>
                <p className={styles.cardScoreLine}>
                  <span className={styles.cardScoreNumber}>
                    <span className="num">{score}</span>
                    <small className="num">/100</small>
                  </span>
                  <span className={styles.cardWord}>{scoreLabel(score)}</span>
                </p>
                <span className={styles.cardTrack} aria-hidden="true">
                  <i style={{ width: `${score}%` }} data-fill />
                </span>
              </div>
              <p className={`${styles.cardSource} ${styles.cardFoot}`}>
                <span className={styles.cardMarks} aria-hidden="true">
                  {CHECKED_MARKS.map((mark) => (
                    <Mark key={mark.key} icon={mark.icon} size={13} />
                  ))}
                </span>
                <span>
                  <span className="num">{CHECKS.length}</span> {card.scoreSource}
                </span>
              </p>
            </section>

            <section className={styles.cardPanel} aria-labelledby="card-rivals">
              <div className={styles.cardPanelHead}>
                <h3 id="card-rivals" className={styles.cardQuestion}>
                  {card.rivals}
                </h3>
                {you?.rank ? (
                  <p className={styles.cardRank}>
                    <span className="num">{ordinal(you.rank)}</span> of <span className="num">{rivals.rows.length}</span>
                  </p>
                ) : null}
              </div>
              <ol className={styles.cardLadder}>
                {rivals.rows.map((row) => (
                  <li key={row.id} className={`${styles.cardRung} ${row.you ? styles.cardRungYou : ''}`}>
                    <span className={`${styles.cardRungRank} num`}>{row.rank}</span>
                    <span className={styles.cardRungName}>{row.you ? card.you : row.name}</span>
                    <span className={styles.cardTrack} aria-hidden="true">
                      <i style={{ width: `${row.overall ?? 0}%` }} data-fill />
                    </span>
                    <span className={`${styles.cardRungScore} num`}>{row.overall}</span>
                  </li>
                ))}
              </ol>
              <p className={`${styles.cardSource} ${styles.cardFoot}`}>{card.rivalsSource}</p>
            </section>

            <section className={styles.cardPanel} aria-labelledby="card-demand">
              <div className={styles.cardPanelHead}>
                <h3 id="card-demand" className={styles.cardQuestion}>
                  {card.demand}
                </h3>
                <p className={styles.cardSource}>
                  {card.demandSource} {demand.place}
                </p>
              </div>
              <ol className={styles.cardAsked}>
                {demand.view.questions.slice(0, 3).map((question) => (
                  <li key={question.id} className={styles.cardAsk}>
                    <span className={styles.cardAskText}>{question.text}</span>
                    <span className={styles.cardMeta}>
                      {PLATFORM_NAMES[askedOn(question)]}
                      <span aria-hidden="true"> · </span>
                      <span className="visually-hidden">, {card.asked} </span>
                      <span className="num">{question.count}</span>
                      <span className="visually-hidden"> {card.times}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {top ? (
                <p className={`${styles.cardTrend} ${styles.cardFoot}`}>
                  <span>
                    {card.rising} <strong>{top.text}</strong>, about {plural(top.count, 'search', 'searches')}
                  </span>
                  <span className={styles.cardMeta}>
                    {PLATFORM_NAMES.search_trends}
                    <span aria-hidden="true"> · </span>
                    <span className="num">+{Math.round(top.changePct ?? 0)}%</span>
                  </span>
                </p>
              ) : null}
            </section>
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

/** What a result earns, from the scoring settings: a share (a number, in Inter), or words. */
function Earns({ result }: { result: CheckResult }) {
  const share = SCORING_V1.resultShares[result];
  if (share >= 1) return <>every point</>;
  if (share <= 0) return <>none yet</>;
  return <span className="num">{Math.round(share * 100)}%</span>;
}

/**
 * One score, inside the Audit: the words and the sample's total, then a table of the three parts
 * side by side (stacked on a phone), each with its question, its score on a thin bar and every
 * check's result, then what each result earns. The checks sit in slots of one height, so the rows
 * line up across the parts; a part with fewer checks ends in an empty slot. A check made for each
 * program shows its weakest program, as the Audit's own grid of checks does. The only numbers are
 * the total and the three part scores.
 */
export function Score({ showcase }: { showcase: Showcase }) {
  const { audit, institution } = showcase;
  const parts = pillarChecks(audit);
  const slots = Math.max(...parts.map((part) => part.checks.length));
  return (
    <section id="score" className={styles.score} data-theme="dark" aria-labelledby="score-title">
      <div className={site.container}>
        <div className={styles.scoreTop}>
          <div className={`${styles.scoreHead} ${site.reveal}`}>
            <p className={styles.featureTag}>
              <Icon name="audit" size={15} />
              {SCORE.label}
            </p>
            <h2 id="score-title" className={`${site.title} ${site.titleLight} ${styles.heading}`}>
              {SCORE.title}
            </h2>
            <p className={styles.lede}>{SCORE.lede}</p>
          </div>
          <div className={`${styles.total} ${site.reveal}`}>
            <p className={styles.totalCaption}>
              {institution.name}, a sample. Checked {formatDate(showcase.home.checkedAt)}.
            </p>
            <p className={styles.totalLabel}>{SCORE.total}</p>
            <p className={styles.totalLine}>
              <span className={styles.totalScore}>
                <span className="num">{audit.scores.overall}</span>
                <small className="num">/100</small>
              </span>
              <ScoreLabel score={audit.scores.overall} />
            </p>
            <span className={styles.totalTrack} aria-hidden="true">
              <i style={{ width: `${audit.scores.overall}%` }} data-fill />
            </span>
            <p className={styles.totalHow}>{SCORE.totalHow}</p>
          </div>
        </div>

        <div className={`${styles.ledger} ${site.reveal}`}>
          {parts.map((part) => (
            <section key={part.pillar} className={styles.ledgerPart} aria-labelledby={`part-${part.pillar}`}>
              <header className={styles.ledgerHead}>
                <h3 id={`part-${part.pillar}`} className={styles.ledgerName}>
                  <PillarIcon pillar={part.pillar} size={18} />
                  {PILLAR_LABELS[part.pillar]}
                </h3>
                <p className={styles.ledgerQuestion}>{QUESTIONS[part.pillar]}</p>
                <p className={styles.ledgerScore}>
                  <span className="num">{audit.scores[part.pillar]}</span>
                  <small className="num">/100</small>
                </p>
                <span className={styles.ledgerTrack} aria-hidden="true">
                  <i style={{ width: `${audit.scores[part.pillar]}%` }} data-fill />
                </span>
              </header>
              <ul className={styles.ledgerRows} aria-label={`${PILLAR_LABELS[part.pillar]} checks`}>
                {part.checks.map((check) => (
                  <li key={check.key} className={styles.ledgerRow}>
                    <span className={styles.ledgerCheck}>{check.name}</span>
                    <ResultBar result={check.result} points={check.points} max={check.maxPoints} showPoints={false} size="sm" />
                  </li>
                ))}
                {Array.from({ length: slots - part.checks.length }, (_, index) => (
                  <li key={`empty-${index}`} className={styles.ledgerEmpty} aria-hidden="true" />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className={`${styles.ledgerKey} ${site.reveal}`}>
          <h3 className={styles.ledgerKeyTitle}>{SCORE.resultsTitle}</h3>
          <ul className={styles.results}>
            {RESULTS.map((result, index) => (
              <li key={result} className={styles.result} style={vars({ '--order': index })}>
                <ResultBar result={result} size="sm" />
                <span className={styles.resultShare}>
                  <Earns result={result} />
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.ledgerNote}>{SCORE.perProgram}</p>
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

/** Four steps on a line that fills as the page moves; under "Drishti checks everything", where it looks. */
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
          <ButtonLink href={START.href} size="lg" iconAfter="arrowRight" className={site.cta}>
            {START.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
