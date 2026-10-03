// Drishti on the website, on black: what it is and its three numbers, then its three questions
// as a short editorial list beside the product itself, a made-up institution's Home in an app
// window (src/site/scenes.ts, never the product's own sample data). Then the way in.

import type { CSSProperties } from 'react';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { EyeName } from '@/components/ui/Eye';
import { EyeMotion } from '@/components/ui/EyeMotion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { appLink } from '@/lib/urls';
import { FEATURES } from '@/product/content';
import { CTA, DRISHTI } from '@/site/content';
import { DASHBOARD } from '@/site/scenes';
import { Frame } from './Frame';
import styles from './drishti.module.css';
import site from './site.module.css';

const NAV_ICONS: readonly IconName[] = ['home', 'audit', 'rivals', 'demand', 'reports'];
const vars = (values: Record<string, string | number>) => values as CSSProperties;

/** The title is the product's name: "Drishti", then the rest. */
const [TITLE_NAME, ...TITLE_REST] = DRISHTI.title.split(' ');

function DashboardPicture() {
  const { score, pillars, fixes, rivals, demand } = DASHBOARD;
  const top = Math.max(...demand.months.map((entry) => entry.value));
  return (
    <div className={styles.window} aria-hidden="true">
      <p className={styles.chrome}>
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.address}>{DASHBOARD.address}</span>
      </p>
      <div className={styles.app}>
        <div className={styles.side}>
          <ProductLockup size="sm" />
          <ul>
            {DASHBOARD.nav.map((item, index) => (
              <li key={item} className={index === 0 ? styles.current : undefined}>
                <Icon name={NAV_ICONS[index] ?? 'home'} size={15} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.main}>
          <p className={styles.appTitle}>{DASHBOARD.title}</p>
          <p className={styles.appQuestion}>{DASHBOARD.question}</p>
          <div className={styles.panels}>
            <div className={styles.panel}>
              <p className={styles.panelLabel}>{score.title}</p>
              <p className={styles.score}>
                <span className="num">{score.overall}</span>
                <small className="num">/100</small>
              </p>
              <p className={styles.scoreMeta}>
                <span className={styles.chip}>{score.label}</span>
                <span>
                  <Icon name="arrowUp" size={12} />
                  {score.change} since {score.since}
                </span>
              </p>
              <ul className={styles.pillars}>
                {pillars.map((pillar) => (
                  <li key={pillar.name}>
                    <span>{pillar.name}</span>
                    <span className={styles.bar}>
                      <i style={vars({ width: `${pillar.value}%` })} />
                    </span>
                    <span className="num">{pillar.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.panel}>
              <p className={styles.panelLabel}>{fixes.title}</p>
              <ol className={styles.fixes}>
                {fixes.items.map((fix, index) => (
                  <li key={fix.name}>
                    <span className={`${styles.fixRank} num`}>{index + 1}</span>
                    {fix.name}
                    <span className={styles.points}>
                      <span className="num">+{fix.points}</span> {fixes.unit}
                    </span>
                  </li>
                ))}
              </ol>
              <p className={styles.panelNote}>{fixes.note}</p>
            </div>
            <div className={`${styles.panel} ${styles.wideOnly}`}>
              <p className={styles.panelLabel}>
                {rivals.title}
                <span>
                  <strong className="num">{rivals.rank}</strong> of <span className="num">{rivals.of}</span>
                </span>
              </p>
              <ul className={styles.ladder}>
                {rivals.rows.map((row) => (
                  <li key={row.name} className={row.you ? styles.you : undefined}>
                    <span>{row.name}</span>
                    <span className={styles.bar}>
                      <i style={vars({ width: `${row.score}%` })} />
                    </span>
                    <span className="num">{row.score}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.panelNote}>{rivals.note}</p>
            </div>
            <div className={`${styles.panel} ${styles.wideOnly}`}>
              <p className={styles.panelLabel}>{demand.title}</p>
              <p className={styles.rise}>
                <Icon name="arrowUp" size={14} />
                <span className="num">{demand.change}%</span>
              </p>
              <p className={styles.topic}>{demand.topic}</p>
              <ul className={styles.months}>
                {demand.months.map((entry, index) => (
                  <li key={entry.month} className={index === demand.months.length - 1 ? styles.latest : undefined}>
                    <i style={vars({ '--h': Math.round((entry.value / top) * 100) })} />
                    <span>{entry.month}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DrishtiSection() {
  return (
    <section id="drishti" className={`${styles.drishti} ${site.grain}`} data-theme="dark" aria-labelledby="drishti-title">
      <Frame bottom={false} rails={false} />
      <div className={site.container}>
        <div className={styles.head}>
          <div className={site.reveal}>
            <p className={styles.eyebrow}>{DRISHTI.eyebrow}</p>
            {/* The Drishti eye before the name: it rises from behind the word once, when the title
                comes into view, then follows the pointer. */}
            <EyeMotion intro>
              <h2 id="drishti-title" className={`${site.title} ${site.titleLight} ${styles.drishtiTitle}`} data-eye="rise">
                <EyeName lashes className={styles.titleName}>
                  <span>{TITLE_NAME}</span>
                </EyeName>{' '}
                {/* "by AdmitLabs." stays together: on a phone the title breaks after the name. */}
                {TITLE_REST.join(' ')}
              </h2>
            </EyeMotion>
            <p className={`${site.lede} ${styles.lede}`}>{DRISHTI.lede}</p>
          </div>
          <ul className={styles.figures}>
            {DRISHTI.stats.map((stat, index) => (
              <li key={stat.label} className={site.reveal} style={vars({ '--order': index })}>
                <span className={`${styles.figure} num`}>{stat.value}</span>
                <span className={styles.figureLabel}>{stat.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.body}>
          <ul className={styles.questions}>
            {FEATURES.map((feature) => (
              <li key={feature.key} className={site.reveal}>
                <div className={styles.featureHead}>
                  <h3 className={styles.question}>{feature.question}</h3>
                  <p className={styles.featureName}>{feature.name}</p>
                </div>
                <p className={styles.featureLede}>{feature.lede}</p>
              </li>
            ))}
          </ul>
          <div className={`${styles.picture} ${site.reveal}`}>
            <DashboardPicture />
          </div>
        </div>

        <div className={`${styles.foot} ${site.reveal}`}>
          <p className={styles.free}>{DRISHTI.free}</p>
          <div className={site.actions}>
            <ButtonLink href={appLink('/signup')} size="lg" iconAfter="arrowRight" className={site.cta}>
              {CTA.primary}
            </ButtonLink>
            {/* A full page load: the product page arrives with its own styles, exactly as it loads anywhere. */}
            <AnchorButton href={DRISHTI.explorePath} variant="secondary" size="lg" className={site.ghost}>
              {DRISHTI.explore}
            </AnchorButton>
          </div>
        </div>
      </div>
    </section>
  );
}
