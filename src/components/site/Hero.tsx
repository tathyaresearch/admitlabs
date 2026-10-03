// The website's hero, Spotlight: one idea on black. The promise in two lines under a soft cone of
// light, the two buttons, and a quiet proof line, inside a fine frame with small crosses.

import { ButtonLink } from '@/components/ui/Button';
import { CTA, HERO } from '@/site/content';
import { wayIn } from '@/site/way-in';
import { Frame } from './Frame';
import styles from './hero.module.css';
import site from './site.module.css';

/** "Get your free Audit", or while Drishti is not open yet, "Talk to us" (src/site/way-in.ts). */
const START = wayIn(CTA.primary);

export function Hero() {
  const { before, words } = HERO.title;
  return (
    <section className={`${styles.hero} ${site.grain}`} data-theme="dark" aria-labelledby="hero-title">
      <div className={styles.beam} aria-hidden="true" />
      <div className={styles.dots} aria-hidden="true" />
      <Frame draw />
      <div className={`${site.container} ${styles.content}`}>
        <h1 id="hero-title" className={styles.title}>
          {before} {words.discovered}, {words.trusted},<br /> and {words.chosen}.
        </h1>
        <p className={styles.lede}>
          {HERO.lede} <strong>{HERO.ledeEnd}</strong>
        </p>
        <div className={styles.actions}>
          <ButtonLink href={START.href} size="lg" iconAfter="arrowRight" className={site.cta}>
            {START.label}
          </ButtonLink>
          <ButtonLink href={CTA.enquiryPath} variant="secondary" size="lg" className={site.ghost}>
            {CTA.secondary}
          </ButtonLink>
        </div>
        <p className={styles.proof}>{HERO.proof}</p>
      </div>
    </section>
  );
}
