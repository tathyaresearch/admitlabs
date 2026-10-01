// The shared Audit page: a prospect's team Audit, opened from a private link with no sign in.
// Every check with its result, what was found, the source and the date. How to fix for the top 3
// fixes only (the database sends nothing more); the other fixes say AdmitLabs can fix them.

import type { ItemPart, ListItem } from '@/audit/view';
import { PartResults } from '@/components/audit/Parts';
import { SectionHead } from '@/components/audit/AuditHeader';
import { SummaryBand } from '@/components/audit/SummaryBand';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Difficulty, PointsValue, ResultMeter } from '@/components/ui/Results';
import { ADMITLABS_EMAIL } from '@/config/team';
import { formatDate, hostAndPath, plural } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS, PILLAR_LABELS } from '@/domain/types';
import { ADMITLABS_CAN_FIX, sharedView, type SharedAudit } from '@/team/share';
import styles from './share.module.css';

function share(part: ItemPart): number {
  return part.maxPoints > 0 ? part.points / part.maxPoints : 0;
}

/** The part with the most to gain: its finding and advice speak for the item. */
function mainPart(item: ListItem): ItemPart | undefined {
  return [...item.parts].sort((a, b) => share(a) - share(b))[0];
}

function Source({ part }: { part: ItemPart }) {
  const url = part.detail?.sourceUrl;
  return (
    <p className={styles.source}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {hostAndPath(url)}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      ) : null}
      <span>Checked {formatDate(part.checkedAt)}</span>
    </p>
  );
}

function TopFix({ item }: { item: ListItem }) {
  const part = mainPart(item);
  return (
    <li className={styles.card}>
      <span className={styles.cardTop}>
        <span className={`${styles.number} num`}>{item.rank}</span>
        {item.difficulty ? <Difficulty value={item.difficulty} /> : null}
      </span>
      <span className={styles.cardTitle}>{item.name}</span>
      <PartResults parts={item.parts} showNames={item.parts.length > 1} />
      {part?.detail?.finding ? (
        <p className={styles.text}>
          <span className={styles.label}>Found </span>
          {part.detail.finding}
        </p>
      ) : null}
      {part?.detail?.howToFix ? (
        <p className={styles.text}>
          <span className={styles.label}>How to fix </span>
          {part.detail.howToFix}
        </p>
      ) : null}
      {part ? <Source part={part} /> : null}
      <p className={styles.gain}>
        <PointsValue kind="gain" points={item.points} />
      </p>
    </li>
  );
}

function MoreFix({ item }: { item: ListItem }) {
  const part = mainPart(item);
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <span className={styles.rowName}>
          <span>
            <span className="num">{item.rank}.</span> {item.name}
          </span>
          <PartResults parts={item.parts} showNames={item.parts.length > 1} />
        </span>
        <span className={styles.muted}>
          <PointsValue kind="gain" points={item.points} />
        </span>
      </div>
      {part?.detail?.finding ? <p className={styles.text}>{part.detail.finding}</p> : null}
      <p className={styles.canFix}>{ADMITLABS_CAN_FIX}</p>
    </div>
  );
}

export function SharedAuditView({ shared, pdfHref }: { shared: SharedAudit; pdfHref: string }) {
  const { view, topFixes, moreFixes, working } = sharedView(shared);
  const topKeys = new Set(topFixes.map((item) => item.key));
  const fixKeys = new Set(view.fixes.map((item) => item.key));
  const { institution } = shared;

  return (
    <div className={styles.page}>
      <header className={`invert ${styles.hero}`}>
        <div className={styles.heroInner}>
          <div className={styles.heroTop}>
            <ProductLockup size="sm" />
            <p className={styles.heroLabel}>Audit, shared by AdmitLabs</p>
          </div>
          <div className={styles.heroBody}>
            <h1 className={styles.heroTitle}>{institution.name}</h1>
            <p className={styles.heroCaption}>
              <span>
                {INSTITUTION_TYPE_LABELS[institution.type]} in {institution.city}, {institution.state}
              </span>
              <a href={institution.website} target="_blank" rel="noreferrer">
                {hostAndPath(institution.website)}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span>Checked {formatDate(shared.audit.runAt)}</span>
            </p>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <SummaryBand view={view} caption="Overall score" showChange={false} />

        {topFixes.length ? (
          <section className={styles.section} aria-labelledby="fix-first-title">
            <SectionHead id="fix-first-title" title="What to fix first" help="The three changes that could add the most to the score, with how to make them." />
            <ol className={styles.cards}>
              {topFixes.map((item) => (
                <TopFix key={item.rank} item={item} />
              ))}
            </ol>
          </section>
        ) : null}

        {moreFixes.length ? (
          <section className={styles.section} aria-labelledby="more-title">
            <SectionHead id="more-title" title="More to fix" help={`${plural(moreFixes.length, 'more thing', 'more things')} to fix, with what was found for each.`} />
            <div className={styles.rows}>
              {moreFixes.map((item) => (
                <MoreFix key={item.rank} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {working.length ? (
          <section className={styles.section} aria-labelledby="working-title">
            <SectionHead id="working-title" title="What's working" help="The things doing the most for the score." />
            <div className={styles.rows}>
              {working.map((item) => {
                const part = item.parts.find((entry) => entry.detail);
                return (
                  <div key={item.rank} className={styles.row}>
                    <div className={styles.rowHead}>
                      <span className={styles.rowName}>
                        {item.name}
                        <ResultMeter result={item.strength ?? 'okay'} size="sm" />
                      </span>
                      <span className={styles.muted}>
                        <PointsValue kind="earned" points={item.points} />
                      </span>
                    </div>
                    {part?.detail?.finding ? <p className={styles.text}>{part.detail.finding}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="checked-title">
          <SectionHead id="checked-title" title="Everything we checked" help="Every check, with what was found, where and when. Public pages only." />
          {view.areas.map((area) => (
            <div key={area.pillar} className={styles.pillar}>
              <h3 className={styles.pillarTitle}>{PILLAR_LABELS[area.pillar]}</h3>
              <div className={styles.rows}>
                {area.rows
                  .filter((row) => row.parts.length)
                  .map((row) => (
                    <div key={row.key} className={styles.row}>
                      <div className={styles.rowHead}>
                        <span className={styles.rowName}>{row.name}</span>
                        {topKeys.has(row.key) ? <span className={styles.canFix}>In the top 3 fixes</span> : fixKeys.has(row.key) ? <span className={styles.canFix}>{ADMITLABS_CAN_FIX}</span> : null}
                      </div>
                      {row.parts.map((part) => (
                        <div key={part.checkId} className={styles.part}>
                          <span className={styles.partResult}>
                            {part.programName ? <span className={styles.partProgram}>{part.programName}</span> : null}
                            <ResultMeter result={part.result} size="sm" />
                          </span>
                          <span>
                            {part.detail?.finding ? <span className={styles.text}>{part.detail.finding}</span> : null}
                            <Source part={part} />
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>

        <section className={`invert ${styles.closing}`} aria-labelledby="closing-title">
          <div>
            <h2 id="closing-title" className={styles.closingTitle}>
              Want AdmitLabs to fix this for you?
            </h2>
            <p className={styles.closingText}>
              Write to <a href={`mailto:${ADMITLABS_EMAIL}`}>{ADMITLABS_EMAIL}</a>. Or see where you stand every month, with your own free Audit.
            </p>
          </div>
          <div className={styles.closingActions}>
            <ButtonLink href="/login" iconAfter="arrowRight">
              Get your free Audit
            </ButtonLink>
            <AnchorButton href={pdfHref} variant="secondary" icon="download">
              Download PDF
            </AnchorButton>
          </div>
        </section>
      </main>

      <footer className={styles.foot}>
        <div className={styles.footInner}>
          <p>Shared privately by the AdmitLabs team. This link works until {formatDate(shared.expiresAt)}.</p>
          <p>Public data only. Every result shows its source and the date it was checked.</p>
        </div>
      </footer>
    </div>
  );
}

export function ExpiredLink() {
  return (
    <main className={styles.expired}>
      <div className={styles.expiredCard}>
        <ProductLockup size="md" />
        <h1 className={styles.expiredTitle}>This link has expired</h1>
        <p className={styles.muted}>Shared Audits stay open for a while, then close. You can see where you stand today with your own free Audit.</p>
        <ButtonLink href="/login" iconAfter="arrowRight">
          Get your free Audit
        </ButtonLink>
      </div>
    </main>
  );
}
