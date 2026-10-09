// The shared Audit page: a prospect's team Audit, opened from a private link with no sign in. It
// answers "How does <name> look to students?" the way the Audit does (spec section 13): the three
// words, the top 3 fixes explained in full (the database sends how to fix for these only), the
// free Audit, then the five places as tabs, each with what was found, its link and date, what's
// good and what to fix, and one line saying AdmitLabs can fix any of them. Read only: nothing to
// mark or ask.

import { FixDetails } from '@/components/audit/FixPanel';
import { PlaceTab } from '@/components/audit/PlacesAudit';
import { SectionTitle, WordsMeaning, WordTiles } from '@/components/audit/PlaceBits';
import { ProductLockup } from '@/components/ui/Brand';
import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { PageHead } from '@/components/ui/Layout';
import { Tabs } from '@/components/ui/Tabs';
import { ADMITLABS_EMAIL } from '@/config/team';
import { formatDate, hostAndPath } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS, PLACE_LABELS } from '@/domain/types';
import { ADMITLABS_CAN_FIX, sharedPlaces, type SharedAudit } from '@/team/share';
import places from '@/components/audit/places.module.css';
import styles from './share.module.css';

export function SharedAuditView({ shared, pdfHref }: { shared: SharedAudit; pdfHref: string }) {
  const view = sharedPlaces(shared);
  const { institution } = shared;
  const more = view.fixes.length > view.topFixes.length;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <ProductLockup size="sm" motion="blink" />
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

        <section className={places.block} aria-label="Discovered, Trusted and Chosen">
          <WordTiles words={view.words} compact />
          <WordsMeaning />
        </section>

        {view.topFixes.length ? (
          <section className={places.block} aria-labelledby="fix-first-title">
            <SectionTitle id="fix-first-title" icon="wrench" title="What to fix first" help="The three changes with the most impact, from every place, each with how to make it." />
            <ol className={styles.topFixes}>
              {view.topFixes.map((fix, index) => (
                <li key={fix.id} className={places.card}>
                  <div className={styles.topFixHead}>
                    <span className={`${styles.topFixIndex} num`}>{index + 1}</span>
                    <span className={styles.topFixText}>
                      <span className={styles.topFixTitle}>{fix.title}</span>
                      <span className={styles.topFixWhere}>
                        {PLACE_LABELS[fix.place]}, {fix.label}
                      </span>
                    </span>
                  </div>
                  <FixDetails entry={fix} ownDetails={false} />
                </li>
              ))}
            </ol>
          </section>
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
            <ButtonLink href="/signup" iconAfter="arrowRight">
              Get your free Audit
            </ButtonLink>
            <AnchorButton href={pdfHref} variant="secondary" icon="download">
              Download PDF
            </AnchorButton>
          </div>
        </section>

        <section className={places.block} aria-labelledby="places-title">
          <SectionTitle id="places-title" icon="globe" title="What the internet says, place by place" help="Each place: what we found, with the link and date; what’s good; and what to fix. Public pages only." />
          <Tabs
            label="Places"
            items={view.places.map((place) => ({
              id: place.key,
              label: place.name,
              count: place.fixes.length,
              content: <PlaceTab place={place} free={false} links={false} fixNote={more ? ADMITLABS_CAN_FIX : undefined} />,
            }))}
          />
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
        <ProductLockup size="md" motion="blink" />
        <h1 className={styles.expiredTitle}>This link has expired</h1>
        <p className={styles.muted}>Shared Audits stay open for a while, then close. You can see where you stand today with your own free Audit.</p>
        <ButtonLink href="/signup" iconAfter="arrowRight">
          Get your free Audit
        </ButtonLink>
      </div>
    </main>
  );
}
