// What each service makes, drawn as the real thing: a program's own page (on a laptop and a
// phone), the official pages' posts, reels and films, and an admission season planned week by
// week. Made up (src/site/scenes.ts) and decorative; the words beside them say it all.

import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/Marks';
import { CITY, CLIPS, INSTITUTION, PROGRAM_PAGE, SEASON, SOCIAL } from '@/site/scenes';
import { LoopVideo } from './LoopVideo';
import styles from './services.module.css';

const vars = (values: Record<string, string | number>) => values as CSSProperties;

/** Program Growth: the program's own page in a browser, and the same page on a phone. */
export function ProgramPicture() {
  return (
    <div className={styles.program} aria-hidden="true">
      <div className={styles.browser}>
        <p className={styles.chrome}>
          <span className={styles.lights}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.address}>
            <Icon name="lock" size={12} />
            {PROGRAM_PAGE.url}
          </span>
        </p>
        <div className={styles.webPage} data-theme="light">
          <p className={styles.webNav}>
            <strong>{INSTITUTION.name}</strong>
            {PROGRAM_PAGE.nav.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <span className={styles.webApply}>{PROGRAM_PAGE.apply}</span>
          </p>
          <div className={styles.webHero}>
            <p className={styles.webKicker}>{PROGRAM_PAGE.kicker}</p>
            <p className={styles.webTitle}>{PROGRAM_PAGE.title}</p>
            <p className={styles.webLine}>{PROGRAM_PAGE.line}</p>
          </div>
          <dl className={styles.webFacts}>
            {PROGRAM_PAGE.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd className="num">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.webBody}>
            <ul className={styles.faculty}>
              {PROGRAM_PAGE.faculty.map((person) => (
                <li key={person.name}>
                  <span className={styles.face}>{person.initials}</span>
                  <span>
                    <strong>{person.name}</strong>
                    {person.role}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.film}>
              <LoopVideo clip={CLIPS.bbaClass} />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.phone}>
        <div className={styles.phoneScreen} data-theme="light">
          <p className={styles.phoneBrand}>{INSTITUTION.name}</p>
          <p className={styles.phoneTitle}>{PROGRAM_PAGE.title}</p>
          <p className={styles.phoneLine}>{PROGRAM_PAGE.kicker}</p>
          <dl className={styles.phoneFacts}>
            {PROGRAM_PAGE.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd className="num">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.phoneApply}>
            {PROGRAM_PAGE.applyNow}
            <Icon name="arrowRight" size={13} />
          </p>
        </div>
      </div>
    </div>
  );
}

/** Institution Branding: the official page's posts, a reel, and a film. */
export function SocialPicture() {
  return (
    <div className={styles.social} aria-hidden="true">
      <div className={`${styles.device} ${styles.profile}`}>
        <p className={styles.appBar}>
          <BrandLogo brand="instagram" size={15} />
          <strong>{SOCIAL.handle}</strong>
        </p>
        <div className={styles.profileHead}>
          <span className={styles.profileMark}>{INSTITUTION.initial}</span>
          <p>
            <span className="num">{SOCIAL.posts}</span>
            <small>posts</small>
          </p>
          <p>
            <span className="num">{SOCIAL.followers}</span>
            <small>followers</small>
          </p>
        </div>
        <p className={styles.bio}>{SOCIAL.bio}</p>
        <ul className={styles.tiles}>
          {SOCIAL.tiles.map((tile) => (
            <li key={tile.small} className={styles[`tile_${tile.kind}`]}>
              {tile.kind === 'figure' ? <strong className="num">{'big' in tile ? tile.big : ''}</strong> : null}
              {tile.kind === 'person' ? <span className={styles.tileFace}>{'initials' in tile ? tile.initials : ''}</span> : null}
              {tile.kind === 'reel' ? <Icon name="video" size={14} /> : null}
              <small>{tile.small}</small>
            </li>
          ))}
        </ul>
      </div>

      <div className={`${styles.device} ${styles.reel}`}>
        <LoopVideo clip={CLIPS.reel} className={styles.reelFilm} />
        <p className={styles.appBar}>
          <BrandLogo brand="instagram" size={15} />
          <strong>{SOCIAL.reel.label}</strong>
        </p>
        <p className={styles.reelTitle}>{SOCIAL.reel.title}</p>
        <div className={styles.reelFoot}>
          <p className={styles.reelWho}>
            <span className={styles.profileMarkSmall}>{INSTITUTION.initial}</span>
            {SOCIAL.handle}
          </p>
          <p className={styles.reelCaption}>{SOCIAL.reel.caption}</p>
          <p className={styles.reelMeta}>
            <span className="num">{SOCIAL.reel.likes}</span> likes
          </p>
          <span className={styles.progress}>
            <span />
          </span>
        </div>
      </div>

      <div className={`${styles.device} ${styles.tube}`}>
        <div className={styles.player}>
          <LoopVideo clip={CLIPS.placements} className={styles.playerFilm} />
          <BrandLogo brand="youtube" size={40} />
          <span className={`${styles.length} num`}>{SOCIAL.film.length}</span>
        </div>
        <p className={styles.filmTitle}>{SOCIAL.film.title}</p>
        <p className={styles.filmMeta}>
          {SOCIAL.film.channel} · {SOCIAL.film.views}
        </p>
        <p className={styles.channel}>
          <span className={styles.profileMarkSmall}>{INSTITUTION.initial}</span>
          {INSTITUTION.name}, {CITY}
        </p>
      </div>
    </div>
  );
}

/** Admit Campaign: the season planned week by week, busiest when students decide. */
export function SeasonPicture() {
  return (
    <div className={styles.season} data-theme="light" aria-hidden="true">
      <div className={styles.seasonHead}>
        <p className={styles.seasonTitle}>{SEASON.title}</p>
        <p className={styles.seasonKey}>
          {SEASON.legend}
          <span className={styles.keyScale}>
            {[1, 2, 3, 4].map((level) => (
              <i key={level} style={vars({ '--level': level })} />
            ))}
          </span>
        </p>
      </div>
      <div className={styles.calendar}>
        <div className={styles.weeks}>
          {SEASON.weeks.map((level, week) => (
            <span key={week} className={styles.week} style={vars({ '--i': week })}>
              {[0, 1, 2, 3, 4].map((day) => (
                <i key={day} className={day <= level ? styles.on : undefined} style={vars({ '--level': level })} />
              ))}
            </span>
          ))}
          {SEASON.marks.map((mark) => (
            <span key={mark.label} className={`${styles.flag} ${mark.week > SEASON.weeks.length / 2 ? styles.flagEnd : ''}`} style={vars({ '--at': mark.week })}>
              {mark.label}
            </span>
          ))}
        </div>
        <p className={styles.months}>
          {SEASON.months.map((month) => (
            <span key={month}>{month}</span>
          ))}
        </p>
      </div>
      <div className={styles.plan}>
        <p className={styles.planTitle}>{SEASON.thisWeek}</p>
        <ul>
          {SEASON.plan.map((item) => (
            <li key={item.day}>
              <span className={styles.planDay}>{item.day}</span>
              <BrandLogo brand={item.brand} size={15} />
              <span className={styles.planKind}>{item.kind}</span>
              <strong>{item.title}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
