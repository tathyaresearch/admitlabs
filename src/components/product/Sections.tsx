// The product page, /drishti, in the website's Spotlight style: the hero with Home itself, the
// problem (most teams guess, Drishti checks) beside a card of the sample university's answers, the
// three features (each opening with a bar that stays while its pictures pass), how Drishti reads
// you (five places, three words), the rules, how it works and the final call. Plans, clients and
// the FAQ are in ./Offer.tsx; the sample report in ./ReportShowcase.tsx. The header, footer, frame,
// buttons and light are the website's.

import type { CSSProperties, JSX } from 'react';
import { PLACE_ICONS } from '@/components/audit/PlaceBits';
import { Frame } from '@/components/site/Frame';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ResultBar, WordScore } from '@/components/ui/Results';
import { checksForPillar } from '@/domain/checks';
import { formatDate, ordinal } from '@/domain/format';
import { PLACE_LABELS, PLACES } from '@/domain/types';
import { PILLAR_ICONS } from '@/graphics/icons';
import { PLATFORM_NAMES } from '@/graphics/platforms';
import { CTA, FEATURES, FEATURES_HEAD, FINAL, HERO, PROBLEM, PROOF_LINE, READS, REPORT, STEPS, TRUST, type Feature } from '@/product/content';
import { topQuestions, type Showcase } from '@/product/showcase';
import { wayIn } from '@/site/way-in';
import sections from '@/components/site/sections.module.css';
import site from '@/components/site/site.module.css';
import { AppWindow, AuditPicture, DemandPicture, RivalsPicture } from './Previews';
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

/** The five places the Audit looks, as the dashboard's own marks for them. */
function PlaceMarks({ size }: { size: number }) {
  return (
    <>
      {PLACES.map((place) => (
        <Icon key={place} name={PLACE_ICONS[place]} size={size} />
      ))}
    </>
  );
}

/**
 * The problem: most teams guess, Drishti checks. The headline with its line beside it, then one wide
 * Drishti card, dense like the dashboard: a top bar with the sample university and when it was
 * checked, then its answers to the three questions side by side (stacked on a phone), each with
 * where it came from: Discovered, Trusted and Chosen from the Audit's five places; its place among
 * the rivals in its city, from each one's own Audit, with the month's one line; and the questions
 * asked most with their site and count, with the program rising fastest under them, in words.
 */
export function Problem({ showcase }: { showcase: Showcase }) {
  const { card } = PROBLEM;
  const { audit, institution, rivals, demand } = showcase;
  const ranking = rivals.view.ranking;
  const you = ranking.find((row) => row.you);
  const questions = topQuestions(demand.signals, 3);
  const rising = demand.highlight;
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
              {card.checked} {formatDate(showcase.checkedAt)}
            </span>
          </p>

          <div className={styles.cardPanels}>
            <section className={styles.cardPanel} aria-labelledby="card-words">
              <h3 id="card-words" className={styles.cardQuestion}>
                {card.words}
              </h3>
              <ul className={styles.cardWords}>
                {audit.words.map((word) => (
                  <li key={word.pillar} className={styles.cardWord}>
                    <span className={styles.cardWordName}>
                      <Icon name={PILLAR_ICONS[word.pillar]} size={16} />
                      {word.name}
                    </span>
                    <WordScore score={word.score} size="sm" layout="row" />
                  </li>
                ))}
              </ul>
              <p className={`${styles.cardSource} ${styles.cardFoot}`}>
                <span className={styles.cardMarks} aria-hidden="true">
                  <PlaceMarks size={13} />
                </span>
                <span>{card.wordsSource}</span>
              </p>
            </section>

            <section className={styles.cardPanel} aria-labelledby="card-rivals">
              <div className={styles.cardPanelHead}>
                <h3 id="card-rivals" className={styles.cardQuestion}>
                  {card.rivals}
                </h3>
                {you?.place ? (
                  <p className={styles.cardRank}>
                    <span className="num">{ordinal(you.place)}</span> of <span className="num">{ranking.length}</span>
                  </p>
                ) : null}
              </div>
              <ol className={styles.cardLadder}>
                {ranking.map((row) => (
                  <li key={row.id} className={`${styles.cardRung} ${row.you ? styles.cardRungYou : ''}`}>
                    <span className={`${styles.cardRungRank} num`}>{row.place}</span>
                    <span className={styles.cardRungName}>{row.you ? card.you : row.name}</span>
                    <span className={styles.cardTrack} aria-hidden="true">
                      <i style={{ width: `${row.overall ?? 0}%` }} data-fill />
                    </span>
                    <span className={`${styles.cardRungScore} num`}>{row.overall}</span>
                  </li>
                ))}
              </ol>
              <div className={`${styles.cardFoot} ${styles.cardFootStack}`}>
                {rivals.line ? <p className={styles.cardLine}>{rivals.line}</p> : null}
                <p className={styles.cardSource}>{card.rivalsSource}</p>
              </div>
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
                {questions.map((question) => (
                  <li key={question.key} className={styles.cardAsk}>
                    <span className={styles.cardAskText}>{question.text}</span>
                    <span className={styles.cardMeta}>
                      {question.site}
                      <span aria-hidden="true"> · </span>
                      <span className="visually-hidden">, {card.asked} </span>
                      <span className="num">{question.count}</span>
                      <span className="visually-hidden"> {card.times}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {rising ? (
                <p className={`${styles.cardTrend} ${styles.cardFoot}`}>
                  <span>
                    {card.rising} <strong>{rising.text}</strong>
                  </span>
                  <span className={styles.cardMeta}>{PLATFORM_NAMES.search_trends}</span>
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

/**
 * How Drishti reads you, inside the Audit: five places, three words. The three words side by side
 * (stacked on a phone), each with its question, its number out of 100 with its word and a thin bar,
 * and every check behind it, one to a row, with its place and its result (a check made for each
 * program shows its weakest program, as the Audit does). The checks sit in slots of one height, so
 * the rows line up across the words; a word with fewer checks ends in an empty slot. Then, compact,
 * what makes a word Strong, Okay or Weak. No total score.
 */
export function Reads({ showcase }: { showcase: Showcase }) {
  const { audit, institution } = showcase;
  const found = new Map(audit.places.flatMap((place) => place.found).flatMap((row) => (row.checkKey ? [[row.checkKey, row] as const] : [])));
  const parts = READS.words.map((entry) => ({
    ...entry,
    word: audit.words.find((word) => word.pillar === entry.pillar) ?? null,
    checks: checksForPillar(entry.pillar).map((check) => ({ key: check.key, place: PLACE_LABELS[check.place], row: found.get(check.key) ?? null, name: found.get(check.key)?.name ?? check.name })),
  }));
  const slots = Math.max(...parts.map((part) => part.checks.length));
  return (
    <section id="reads" className={styles.score} data-theme="dark" aria-labelledby="reads-title">
      <div className={site.container}>
        <div className={`${styles.scoreHead} ${site.reveal}`}>
          <p className={styles.featureTag}>
            <Icon name="audit" size={15} />
            {READS.label}
          </p>
          <h2 id="reads-title" className={`${site.title} ${site.titleLight} ${styles.heading}`}>
            {READS.title}
          </h2>
          <p className={styles.lede}>{READS.lede}</p>
        </div>

        <p className={`${styles.ledgerCaption} ${site.reveal}`}>
          {institution.name}, a sample. Checked {formatDate(showcase.checkedAt)}.
        </p>
        <div className={`${styles.ledger} ${site.reveal}`}>
          {parts.map((part) => (
            <section key={part.pillar} className={styles.ledgerPart} aria-labelledby={`word-${part.pillar}`}>
              <header className={styles.ledgerHead}>
                <h3 id={`word-${part.pillar}`} className={styles.ledgerName}>
                  <Icon name={PILLAR_ICONS[part.pillar]} size={18} />
                  {part.name}
                </h3>
                <p className={styles.ledgerQuestion}>{part.question}</p>
                {part.word ? (
                  <div className={styles.ledgerWord}>
                    <WordScore score={part.word.score} size="md" />
                  </div>
                ) : null}
              </header>
              <ul className={styles.ledgerRows} aria-label={`${part.name} checks`}>
                {part.checks.map((check) => (
                  <li key={check.key} className={styles.ledgerRow}>
                    <span className={styles.ledgerCheck}>
                      <span className={styles.ledgerCheckName}>{check.name}</span>
                      <span className={styles.ledgerPlace}>{check.place}</span>
                    </span>
                    {check.row?.result ? <ResultBar result={check.row.result} share={check.row.share ?? 0} showPoints={false} size="sm" /> : null}
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
          <h3 className={styles.ledgerKeyTitle}>{READS.keyTitle}</h3>
          <ul className={styles.results}>
            {READS.key.map((band) => (
              <li key={band.word} className={styles.result}>
                <span className={styles.resultWord}>{band.word}</span>
                <span className={styles.resultShare}>
                  <span className="num">{band.min}</span> to <span className="num">{band.max}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.ledgerNote}>{READS.keyNote}</p>
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

/** Four steps on a line that fills as the page moves; under "Drishti checks every place", the five places. */
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
                <p className={styles.stepMarks} aria-hidden="true">
                  <PlaceMarks size={20} />
                </p>
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
