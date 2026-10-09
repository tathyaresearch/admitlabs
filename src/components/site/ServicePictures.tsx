// What each service makes, drawn as the real thing: a program's own page on a laptop and its own
// account on a phone, the official pages' posts, reels and films, and an admission season planned week by
// week. Made up (src/site/scenes.ts) and decorative; the words beside them say it all. The posts
// and the season's busiest weeks carry photos, loaded only as they come close to the screen.

import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/Marks';
import { CITY, CLIPS, INSTITUTION, PROGRAM_ACCOUNT, PROGRAM_PAGE, SEASON, SEASON_DAYS, SEASON_PHOTOS, SOCIAL } from '@/site/scenes';
import { LarkmoorMark } from './LarkmoorMark';
import { LoopVideo } from './LoopVideo';
import { NearScreen } from './NearScreen';
import styles from './services.module.css';

const vars = (values: Record<string, string | number>) => values as CSSProperties;
const classes = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ') || undefined;

/** Program Growth: the program's own page in a browser, and the program's own account on a phone. */
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
            <strong className={styles.webBrand}>
              <LarkmoorMark className={styles.brandMark} />
              {INSTITUTION.name}
            </strong>
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
        <NearScreen className={styles.phoneScreen} data-theme="light">
          <p className={styles.statusBar}>
            <span className="num">{PROGRAM_ACCOUNT.time}</span>
            <i className={styles.island} />
            <i className={styles.battery} />
          </p>
          <p className={styles.accountBar}>
            <BrandLogo brand="instagram" size={13} />
            <strong>{PROGRAM_ACCOUNT.handle}</strong>
          </p>
          <div className={styles.accountHead}>
            <span className={styles.accountAvatar}>
              <LarkmoorMark className={styles.avatarMark} />
            </span>
            {PROGRAM_ACCOUNT.stats.map((stat) => (
              <p key={stat.label}>
                <span className="num">{stat.value}</span>
                <small>{stat.label}</small>
              </p>
            ))}
          </div>
          <p className={styles.accountBio}>
            <strong>{PROGRAM_ACCOUNT.name}</strong>
            {PROGRAM_ACCOUNT.bio.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <p className={styles.accountActions}>
            <span className={styles.accountFollow}>{PROGRAM_ACCOUNT.follow}</span>
            <span className={styles.accountMessage}>{PROGRAM_ACCOUNT.message}</span>
          </p>
          <ul className={styles.highlights}>
            {PROGRAM_ACCOUNT.highlights.map((highlight) => (
              <li key={highlight.label}>
                <i style={vars({ '--photo': `url(${highlight.photo})` })} />
                <small>{highlight.label}</small>
              </li>
            ))}
          </ul>
          <p className={styles.accountTabs}>
            <span className={styles.tabOn}>
              <Icon name="grid" size={14} />
            </span>
            <span>
              <Icon name="video" size={14} />
            </span>
            <span>
              <Icon name="user" size={14} />
            </span>
          </p>
          <ul className={styles.accountPosts}>
            {PROGRAM_ACCOUNT.posts.map((post) =>
              post.kind === 'text' ? (
                <li key={post.title} className={post.tone === 'dark' ? styles.postDark : styles.postLight}>
                  <strong>{post.title}</strong>
                </li>
              ) : (
                <li key={post.photo} className={styles.postPhoto} style={vars({ '--photo': `url(${post.photo})` })}>
                  {post.reel ? <Icon name="video" size={12} /> : null}
                </li>
              ),
            )}
          </ul>
        </NearScreen>
      </div>
    </div>
  );
}

/** Institution Branding: the official page's posts, a reel, and a film. */
export function SocialPicture() {
  return (
    <div className={styles.social} aria-hidden="true">
      <NearScreen className={`${styles.device} ${styles.profile}`}>
        <p className={styles.appBar}>
          <BrandLogo brand="instagram" size={15} />
          <strong>{SOCIAL.handle}</strong>
        </p>
        <div className={styles.profileHead}>
          <span className={styles.profileMark}>
            <LarkmoorMark className={styles.avatarMark} />
          </span>
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
            <li
              key={tile.small}
              className={classes(styles[`tile_${tile.kind}`], 'photo' in tile && styles.photo)}
              style={'photo' in tile ? vars({ '--photo': `url(${tile.photo})` }) : undefined}
            >
              {tile.kind === 'figure' ? <strong className="num">{'big' in tile ? tile.big : ''}</strong> : null}
              {tile.kind === 'reel' ? <Icon name="video" size={14} /> : null}
              <small>{tile.small}</small>
            </li>
          ))}
        </ul>
      </NearScreen>

      <div className={`${styles.device} ${styles.reel}`}>
        <LoopVideo clip={CLIPS.reel} className={styles.reelFilm} />
        <p className={styles.appBar}>
          <BrandLogo brand="instagram" size={15} />
          <strong>{SOCIAL.reel.label}</strong>
        </p>
        <p className={styles.reelTitle}>{SOCIAL.reel.title}</p>
        <div className={styles.reelFoot}>
          <p className={styles.reelWho}>
            <span className={styles.profileMarkSmall}>
              <LarkmoorMark className={styles.avatarMark} />
            </span>
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
          <span className={styles.profileMarkSmall}>
            <LarkmoorMark className={styles.avatarMark} />
          </span>
          {INSTITUTION.name}, {CITY}
        </p>
      </div>
    </div>
  );
}

/** Admit Campaign: the season planned week by week, busiest when students decide. */
export function SeasonPicture() {
  return (
    <NearScreen className={styles.season} data-theme="light" aria-hidden="true">
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
              {Array.from({ length: SEASON_DAYS }, (_, day) => {
                const photo = SEASON_PHOTOS[week]?.[day];
                return (
                  <i
                    key={day}
                    className={classes(day <= level && styles.on, photo !== undefined && styles.peak)}
                    style={vars({ '--level': level })}
                    data-photo={photo === undefined ? undefined : photo + 1}
                  />
                );
              })}
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
    </NearScreen>
  );
}
