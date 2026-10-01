// The shared Audit page: a prospect's team Audit, opened from a private link with no sign in. It
// answers "How does <name> look to students?": the score and pillars, the top 3 fixes with how to
// make them (the database sends how to fix for these only), the free Audit, then the rest folded:
// what's working, more to fix (one line says AdmitLabs can fix any of them) and every check with
// what was found, the source and the date.

import type { ReactNode } from 'react';
import type { ItemPart, ListItem } from '@/audit/view';
import { fixStep } from '@/components/audit/AuditScreen';
import { PartResults } from '@/components/audit/Parts';
import { HomeSummary } from '@/components/home/HomeSummary';
import { NextSteps, type NextStep } from '@/components/home/NextSteps';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { PointsValue, ResultMeter } from '@/components/ui/Results';
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
    <span className={styles.source}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {hostAndPath(url)}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      ) : null}
      <span>Checked {formatDate(part.checkedAt)}</span>
    </span>
  );
}

/** One of the top 3 fixes: what was found, how to fix it and where it was found. */
function topStep(item: ListItem): NextStep {
  const part = mainPart(item);
  return {
    ...fixStep(item, null),
    detail: part?.detail?.finding ?? '',
    extra: part ? (
      <>
        {part.detail?.howToFix ? (
          <span className={styles.howTo}>
            <span className={styles.label}>How to fix </span>
            {part.detail.howToFix}
          </span>
        ) : null}
        <Source part={part} />
      </>
    ) : null,
  };
}

/** A section folded away, opened by its title. */
function Fold({ id, title, meta, children }: { id: string; title: string; meta: string; children: ReactNode }) {
  return (
    <details className={styles.fold} aria-labelledby={`${id}-title`}>
      <summary className={styles.foldSummary}>
        <span className={styles.foldText}>
          <span id={`${id}-title`} className={styles.foldTitle}>
            {title}
          </span>
          <span className={styles.foldMeta}>{meta}</span>
        </span>
        <Icon name="chevronDown" size={18} className={styles.foldIcon} />
      </summary>
      <div className={styles.foldBody}>{children}</div>
    </details>
  );
}

export function SharedAuditView({ shared, pdfHref }: { shared: SharedAudit; pdfHref: string }) {
  const { view, topFixes, moreFixes, working } = sharedView(shared);
  const topKeys = new Set(topFixes.map((item) => item.key));
  const { institution } = shared;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <ProductLockup size="sm" />
          <p className={styles.topLabel}>Audit, shared by AdmitLabs</p>
        </div>
      </header>

      <main className={styles.main}>
        <PageHead
          title={institution.name}
          question={`How does ${institution.name} look to students?`}
          caption={[
            `${INSTITUTION_TYPE_LABELS[institution.type]} in ${institution.city}, ${institution.state}`,
            <a key="site" href={institution.website} target="_blank" rel="noreferrer">
              {hostAndPath(institution.website)}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>,
            `Checked ${formatDate(shared.audit.runAt)}`,
          ]}
        />

        <HomeSummary view={view} checkedAt={shared.audit.runAt} showChange={false} />

        {topFixes.length ? (
          <NextSteps
            id="fix-first"
            title="What to fix first"
            description="The three changes that could add the most to the score, with how to make them."
            steps={topFixes.map(topStep)}
          />
        ) : null}

        <section className={`invert ${styles.closing}`} aria-labelledby="closing-title">
          <div className={styles.closingText}>
            <h2 id="closing-title" className={styles.closingTitle}>
              Want AdmitLabs to fix this for you?
            </h2>
            <p>
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

        <div className={styles.folds}>
          {working.length ? (
            <Fold id="working" title="What's working" meta="The things doing the most for the score.">
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
                        <span className={styles.rowValue}>
                          <PointsValue kind="earned" points={item.points} />
                        </span>
                      </div>
                      {part?.detail?.finding ? <p className={styles.text}>{part.detail.finding}</p> : null}
                    </div>
                  );
                })}
              </div>
            </Fold>
          ) : null}

          {moreFixes.length ? (
            <Fold id="more" title="More to fix" meta={`${plural(moreFixes.length, 'more thing', 'more things')} to fix, with what was found for each.`}>
              <p className={styles.canFix}>{ADMITLABS_CAN_FIX}</p>
              <div className={styles.rows}>
                {moreFixes.map((item) => {
                  const part = mainPart(item);
                  return (
                    <div key={item.rank} className={styles.row}>
                      <div className={styles.rowHead}>
                        <span className={styles.rowName}>
                          <span>
                            <span className="num">{item.rank}</span> {item.name}
                          </span>
                          <PartResults parts={item.parts} showNames={item.parts.length > 1} />
                        </span>
                        <span className={styles.rowValue}>
                          <PointsValue kind="gain" points={item.points} />
                        </span>
                      </div>
                      {part?.detail?.finding ? <p className={styles.text}>{part.detail.finding}</p> : null}
                    </div>
                  );
                })}
              </div>
            </Fold>
          ) : null}

          <Fold id="checked" title="Everything we checked" meta="Every check, with what was found, where and when. Public pages only.">
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
                          {topKeys.has(row.key) ? <span className={styles.rowNote}>In the top 3 fixes</span> : null}
                        </div>
                        {row.parts.map((part) => (
                          <div key={part.checkId} className={styles.part}>
                            <span className={styles.partResult}>
                              {part.programName ? <span className={styles.partProgram}>{part.programName}</span> : null}
                              <ResultMeter result={part.result} size="sm" />
                            </span>
                            <span className={styles.partText}>
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
          </Fold>
        </div>
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
