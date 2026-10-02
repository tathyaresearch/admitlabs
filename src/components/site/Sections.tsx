// The website's home page after Drishti: who we work with (ivory, set as a staircase), our work
// (hidden until the samples are ready), how we work, Tathya for students, the FAQ, and the final
// call under the same light as the top of the page.

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SITE_SETTINGS } from '@/config/site';
import { appLink } from '@/lib/urls';
import { AUDIENCE, CTA, FAQ, FINAL, HOW, TATHYA, WORK } from '@/site/content';
import { WORK_SAMPLES } from '@/site/work';
import { Frame } from './Frame';
import styles from './sections.module.css';
import site from './site.module.css';

const vars = (values: Record<string, string | number>) => values as CSSProperties;

export function Audience() {
  return (
    <section id="who" className={`${styles.who} ${site.grain}`} data-theme="light" aria-labelledby="who-title">
      <div className={site.container}>
        <div className={styles.whoHead}>
          <h2 id="who-title" className={styles.whoTitle}>
            {AUDIENCE.title}
          </h2>
          <p className={styles.whoPrograms}>{AUDIENCE.programs}</p>
        </div>
        <ul className={styles.whoLines}>
          {AUDIENCE.lines.map((line, index) => (
            <li key={line} className={site.reveal} style={vars({ '--step': index })}>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Built, and shown only once SITE_SETTINGS.showWork is on and the samples are in src/site/work.ts. */
export function OurWork() {
  if (!SITE_SETTINGS.showWork || WORK_SAMPLES.length === 0) return null;
  return (
    <section id="work" className={`${styles.work} ${site.grain}`} data-theme="dark" aria-labelledby="work-title">
      <div className={site.container}>
        <h2 id="work-title" className={`${site.title} ${site.titleLight}`}>
          {WORK.title}
        </h2>
        <ul className={styles.workList}>
          {WORK_SAMPLES.map((sample) => (
            <li key={sample.title} className={`${styles.workItem} ${site.reveal}`}>
              <Image src={sample.image} alt={sample.imageAlt} width={800} height={1000} className={styles.workImage} />
              <p className={styles.workMeta}>
                {sample.service}, {sample.client}
              </p>
              <h3 className={styles.workTitle}>{sample.title}</h3>
              <p className={styles.workResult}>{sample.result}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HowWeWork() {
  const [first, second] = HOW.title;
  return (
    <section id="how" className={`${styles.how} ${site.grain}`} data-theme="dark" aria-labelledby="how-title">
      <div className={`${site.container} ${styles.howGrid}`}>
        <h2 id="how-title" className={`${site.title} ${site.titleLight} ${styles.howTitle}`}>
          {first} <span className={site.titleSoft}>{second}</span>
        </h2>
        <ol className={styles.howSteps}>
          {HOW.steps.map((step) => (
            <li key={step.name} className={styles.howStep}>
              <h3 className={styles.howName}>{step.name}</h3>
              <p className={styles.howLine}>{step.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Tathya() {
  return (
    <section className={styles.tathyaSection} data-theme="dark" aria-labelledby="tathya-title">
      <div className={site.container}>
        <div className={`${styles.tathya} ${site.reveal}`}>
          <span className={styles.corners} aria-hidden="true" />
          <div>
            <p className={styles.forWhom}>{TATHYA.forWhom}</p>
            <h2 id="tathya-title" className={styles.tathyaName}>
              {TATHYA.name}
            </h2>
          </div>
          <div className={styles.tathyaSide}>
            <p className={styles.tathyaLine}>{TATHYA.line}</p>
            {SITE_SETTINGS.tathyaUrl ? (
              <AnchorButton href={SITE_SETTINGS.tathyaUrl} variant="secondary" iconAfter="external" target="_blank" rel="noreferrer" className={site.ghost}>
                {TATHYA.link}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </AnchorButton>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className={`${styles.faq} ${site.grain}`} data-theme="dark" aria-labelledby="faq-title">
      <div className={`${site.container} ${styles.faqGrid}`}>
        <div className={styles.faqHead}>
          <h2 id="faq-title" className={`${site.title} ${site.titleLight}`}>
            {FAQ.title}
          </h2>
          <p className={site.lede}>
            {FAQ.more} <a href={`mailto:${SITE_SETTINGS.email}`}>{SITE_SETTINGS.email}</a>.
          </p>
        </div>
        <div className={styles.faqList}>
          {FAQ.items.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                {item.question}
                <Icon name="plus" size={18} />
              </summary>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCall() {
  return (
    <section className={`${styles.final} ${site.grain}`} data-theme="dark" aria-labelledby="final-title">
      <div className={styles.finalLight} aria-hidden="true" />
      <Frame />
      <div className={`${site.container} ${styles.finalInner}`}>
        <h2 id="final-title" className={styles.finalTitle}>
          {FINAL.title}
        </h2>
        <p className={styles.finalLine}>{FINAL.line}</p>
        <div className={`${site.actions} ${styles.finalActions}`}>
          <ButtonLink href={appLink('/login')} size="lg" iconAfter="arrowRight" className={site.cta}>
            {CTA.primary}
          </ButtonLink>
          <ButtonLink href={CTA.enquiryPath} variant="secondary" size="lg" className={site.ghost}>
            {CTA.secondary}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
