// Version 2 mock (Step 2, development only): Home and the Audit, with their options, the fix
// panel, Free's Audit and a thin What people say.

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { Tabs } from '@/components/ui/Tabs';
import { FixActions, FixList, FoundList, GoodList, ImpactTags, Moved, PlaceHead, ProgramPills, ProofLine, ReadyFixView, SectionTitle, Tag, ThinState, WordTiles, WordsInline, fmt } from './Bits';
import { OpenPanel } from './Client';
import { CLIENT_DEMAND, DEMAND, ENQUIRY_CARD, type HomeThing, type Idea, type MockRivals } from './data-more';
import type { Fix, MockAudit, Place } from './model';
import styles from './mock.module.css';

// Home ------------------------------------------------------------------------------------------

function ideaFor(client: boolean): Idea {
  return client ? CLIENT_DEMAND.idea : DEMAND.three[0];
}

function homeThings(audit: MockAudit, rivals: MockRivals, client: boolean): HomeThing[] {
  const fix = audit.topFixes[0];
  const lesson = rivals.lessons[0];
  const idea = ideaFor(client);
  return [
    ...(fix ? [{ source: 'Audit' as const, title: fix.title, label: `${placeName(fix)} · ${fix.label}`, programs: fix.programs, weight: '', impact: fix.impact, effort: fix.effort, fix: !client }] : []),
    ...(lesson ? [{ source: 'Rivals' as const, title: lesson.title, label: `Learned from ${lesson.rival}`, programs: [], weight: '', impact: 'Medium' as const, effort: lesson.effort, fix: false }] : []),
    { source: 'Make these 3' as const, title: idea.title, label: `${idea.format} · ${idea.program}`, programs: [], weight: idea.why.split('.')[0] ?? '', impact: null, effort: 'easy' as const, fix: false },
  ];
}

/** "up from Weak in June": the moved line inside a sentence, its words kept as they are. */
function movedInLine(moved: string): string {
  return moved.charAt(0).toLowerCase() + moved.slice(1);
}

function placeName(fix: Fix): string {
  return { website: 'Website', google: 'Google', social: 'Social media', people: 'What people say', other: 'Other places' }[fix.place];
}

function ThingRow({ thing, index }: { thing: HomeThing; index: number }) {
  return (
    <li className={styles.thing}>
      <span className={`${styles.fixIndex} num`}>{index}</span>
      <span className={styles.thingBody}>
        <span className={styles.fixLabel}>
          <span className={styles.thingSource}>{thing.source === 'Audit' ? 'From your Audit' : thing.source === 'Rivals' ? 'From your rivals' : 'Make these 3'}</span>
          {thing.label}
        </span>
        <span className={styles.fixTitle}>{thing.title}</span>
        <span className={styles.tags}>
          {thing.weight ? <span className={styles.weight}>{thing.weight}</span> : null}
          <ImpactTags impact={thing.impact} effort={thing.effort} programs={thing.programs} />
        </span>
      </span>
      <span className={styles.fixActions}>
        <Button variant="secondary" size="sm" icon="check">
          {thing.source === 'Make these 3' ? 'Mark as made' : 'Mark as done'}
        </Button>
        {thing.fix ? (
          <Button variant="quiet" size="sm" icon="wrench">
            Let AdmitLabs fix this
          </Button>
        ) : null}
      </span>
    </li>
  );
}

function Things({ things, compact = false }: { things: readonly HomeThing[]; compact?: boolean }) {
  return (
    <section className={styles.block} aria-labelledby="things-title">
      <SectionTitle id="things-title" icon="check" title="Do these 3 things this month" help={compact ? undefined : 'Ordered by impact. Mark one done when it is done: your next Audit checks it.'} />
      <ol className={[styles.things, compact ? styles.thingsCompact : ''].join(' ')}>
        {things.map((thing, index) => (
          <ThingRow key={thing.title} thing={thing} index={index + 1} />
        ))}
      </ol>
    </section>
  );
}

function WhatChanged({ audit, rivals, client }: { audit: MockAudit; rivals: MockRivals; client: boolean }) {
  const movedWords = audit.words.filter((word) => word.moved);
  return (
    <section className={styles.block} aria-labelledby="changed-title">
      <SectionTitle id="changed-title" icon="refresh" title={`What changed since ${audit.previousAt ? fmt(audit.previousAt) : 'your last Audit'}`} />
      <div className={styles.card}>
        <div className={styles.changedGrid}>
          <div>
            <p className={styles.miniTitle}>Your three words</p>
            {movedWords.length ? (
              <ul className={styles.plainList}>
                {movedWords.map((word) => (
                  <li key={word.pillar}>
                    <span className={styles.strongText}>
                      {word.name} {word.word}
                    </span>
                    , {word.moved ? movedInLine(word.moved) : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>No word moved. {audit.words.map((word) => `${word.name} ${word.word}`).join(', ')}.</p>
            )}
          </div>
          <div>
            <p className={styles.miniTitle}>Checks that moved</p>
            {audit.moved.length ? (
              <ul className={styles.plainList}>
                {audit.moved.slice(0, 4).map((check) => (
                  <li key={check.name} className={styles.movedRow}>
                    <span>{check.name}</span>
                    <Moved before={check.before} after={check.after} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>Every check held its result.</p>
            )}
          </div>
          <div>
            <p className={styles.miniTitle}>Your rivals</p>
            <ul className={styles.plainList}>
              {rivals.alerts.slice(0, 2).map((alert) => (
                <li key={alert.id}>
                  <span className={styles.strongText}>{alert.rival}</span>: {alert.text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.miniTitle}>What students search</p>
            {client ? (
              <p className={styles.quiet}>{CLIENT_DEMAND.rising}</p>
            ) : (
              <p className={styles.quiet}>
                <span className={styles.strongText}>BBA in Business Analytics</span> is rising fast in Guwahati. You don’t offer it yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RivalsLine({ rivals }: { rivals: MockRivals }) {
  const alert = rivals.alerts[0];
  return (
    <section className={styles.card} aria-labelledby="rivals-line-title">
      <div className={styles.cardHead}>
        <h2 id="rivals-line-title" className={styles.cardTitle}>
          <Icon name="rivals" size={18} />
          Your rivals in {rivals.city}
        </h2>
        <Link href="/mock/rivals" className={styles.headLink}>
          Open Rivals <Icon name="arrowRight" size={16} />
        </Link>
      </div>
      <p className={styles.oneLine}>{rivals.line}</p>
      {alert ? (
        <p className={styles.quiet}>
          Latest: <span className={styles.strongText}>{alert.rival}</span> {alert.kind.toLowerCase()}, {fmt(alert.day)}.
        </p>
      ) : null}
    </section>
  );
}

function DemandHighlight({ idea }: { idea: Idea }) {
  return (
    <section className={styles.card} aria-labelledby="demand-line-title">
      <div className={styles.cardHead}>
        <h2 id="demand-line-title" className={styles.cardTitle}>
          <Icon name="demand" size={18} />
          Make these 3
        </h2>
        <Link href="/mock/demand" className={styles.headLink}>
          Open Demand <Icon name="arrowRight" size={16} />
        </Link>
      </div>
      <p className={styles.oneLine}>{idea.title}</p>
      <p className={styles.quiet}>
        {idea.format} for {idea.program}. {idea.why}
      </p>
    </section>
  );
}

function ClientCards() {
  return (
    <div className={styles.pair}>
      <section className={styles.card} aria-labelledby="team-card-title">
        <div className={styles.cardHead}>
          <h2 id="team-card-title" className={styles.cardTitle}>
            <Icon name="team" size={18} />
            Your AdmitLabs team
          </h2>
          <Link href="/mock/home" className={styles.headLink}>
            See all work <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        <ul className={styles.workList}>
          <li>
            <span className={styles.workKind}>Done</span>
            <span>Shot and posted the Data Analytics placements reel</span>
            <span className={styles.workDay}>12 Sep</span>
          </li>
          <li>
            <span className={styles.workKind}>Done</span>
            <span>Rewrote the Hotel Management page with fees and dates</span>
            <span className={styles.workDay}>5 Sep</span>
          </li>
          <li>
            <span className={styles.workKind}>Next</span>
            <span>Campus tour, part 2, for YouTube</span>
            <span className={styles.workDay}>8 Oct</span>
          </li>
        </ul>
      </section>
      <section className={styles.card} aria-labelledby="enquiries-card-title">
        <div className={styles.cardHead}>
          <h2 id="enquiries-card-title" className={styles.cardTitle}>
            <Icon name="enquiry" size={18} />
            Enquiries this month
          </h2>
          <Link href="/mock/leads" className={styles.headLink}>
            See all leads <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        <p className={styles.kpiLine}>
          <span className={`${styles.kpiValue} num`}>{ENQUIRY_CARD.thisMonth}</span>
          <span className={styles.kpiNote}>
            <Icon name="arrowUp" size={14} />
            <span className="num">{ENQUIRY_CARD.change}</span> more than August
          </span>
        </p>
        <p className={styles.quiet}>
          Most from <span className={styles.strongText}>{ENQUIRY_CARD.topLink}</span>: <span className="num">{ENQUIRY_CARD.topCount}</span>
        </p>
      </section>
    </div>
  );
}

export function HomeView({ audit, rivals, option, client = false }: { audit: MockAudit; rivals: MockRivals; option: 1 | 2; client?: boolean }) {
  const things = homeThings(audit, rivals, client);
  const plan = client ? 'Client' : audit.tier === 'paid' ? 'Paid plan, ends 15 Oct' : 'Free plan';
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="Home" question="How are we doing this month?" caption={[`Audit checked ${fmt(audit.checkedAt)}`, plan]} />
        {option === 1 ? <p className={styles.answer}>{audit.verdict}</p> : null}
      </div>
      {option === 1 ? (
        <>
          <WordTiles words={audit.words} />
          {client ? <ClientCards /> : null}
          <Things things={things} />
        </>
      ) : (
        <>
          <section className={`invert ${styles.band}`} aria-label="This month">
            <div className={styles.bandWords}>
              <p className={styles.bandAnswer}>{audit.verdict}</p>
              <WordsInline words={audit.words} />
              <Link href="/mock/audit" className={styles.headLink}>
                Open Audit <Icon name="arrowRight" size={16} />
              </Link>
            </div>
            <div className={styles.bandThings}>
              <p className={styles.bandLabel}>Do these 3 things this month</p>
              <ol className={styles.bandList}>
                {things.map((thing, index) => (
                  <li key={thing.title}>
                    <span className={`${styles.bandIndex} num`}>{index + 1}</span>
                    <span>
                      <span className={styles.bandThing}>{thing.title}</span>
                      <span className={styles.bandMeta}>
                        {thing.source === 'Make these 3' ? `${thing.label} · ${thing.weight}` : `${thing.label}${thing.impact ? ` · Impact ${thing.impact}` : ''}`}
                      </span>
                      <span className={styles.bandActions}>
                        <button type="button" className={styles.linkButton}>
                          <Icon name="check" size={14} />
                          {thing.source === 'Make these 3' ? 'Mark as made' : 'Mark as done'}
                        </button>
                        {thing.fix ? (
                          <button type="button" className={styles.linkButton}>
                            <Icon name="wrench" size={14} />
                            Let AdmitLabs fix this
                          </button>
                        ) : null}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
          {client ? <ClientCards /> : null}
        </>
      )}
      <WhatChanged audit={audit} rivals={rivals} client={client} />
      <div className={styles.pair}>
        <RivalsLine rivals={rivals} />
        <DemandHighlight idea={ideaFor(client)} />
      </div>
    </div>
  );
}

// Audit -----------------------------------------------------------------------------------------

function PlaceColumns({ place, open }: { place: Place; open?: ReadonlySet<string> | null }) {
  return (
    <div className={styles.columns}>
      <div className={styles.column}>
        <p className={styles.columnTitle}>What we found</p>
        {place.thin ? <ThinState thin={place.thin} /> : null}
        <FoundList rows={place.found} open={open} />
      </div>
      <div className={styles.column}>
        <p className={styles.columnTitle}>What’s good</p>
        <GoodList items={place.good} empty={place.info.scored ? undefined : 'Nothing good found here yet.'} />
      </div>
      <div className={styles.column}>
        <p className={styles.columnTitle}>What to fix</p>
        <FixList fixes={place.fixes} href="/mock/audit/fix" />
      </div>
    </div>
  );
}

function PlaceStacked({ place }: { place: Place }) {
  return (
    <section id={`place-${place.info.key}`} className={styles.placeSection} aria-labelledby={`place-${place.info.key}-title`}>
      <PlaceHead place={place} id={`place-${place.info.key}-title`} />
      <div className={styles.card}>
        <p className={styles.columnTitle}>What we found</p>
        {place.thin ? <ThinState thin={place.thin} /> : null}
        <FoundList rows={place.found} wide />
      </div>
      <div className={styles.twoUp}>
        <div className={styles.card}>
          <p className={styles.columnTitle}>What’s good</p>
          <GoodList items={place.good} empty={place.info.scored ? undefined : 'Nothing good found here yet.'} />
        </div>
        <div className={styles.card}>
          <p className={styles.columnTitle}>What to fix</p>
          <FixList fixes={place.fixes} href="/mock/audit/fix" />
        </div>
      </div>
    </section>
  );
}

function AuditTop({ audit, held, free }: { audit: MockAudit; held?: boolean; free?: boolean }) {
  return (
    <div className={styles.top}>
      <PageHead
        title="Audit"
        question="What does the internet say about us?"
        caption={free ? [`Checked ${fmt(audit.checkedAt)}`, `Free covers ${audit.programs[0]}`, 'Next free Audit 10 Dec 2026'] : [`Checked ${fmt(audit.checkedAt)}`, `${audit.programs.length} programs`, 'Next Audit 15 Oct 2026']}
        actions={
          audit.tier === 'paid' ? (
            <Button variant="secondary" size="sm" icon="refresh">
              Refresh once this month
            </Button>
          ) : undefined
        }
      />
      {held ? (
        <Notice icon="stopwatch" title="Your new Audit is being checked by the AdmitLabs team.">
          Until it is ready you see the Audit of {fmt(audit.checkedAt)}. It will show in Notifications when it is ready.
        </Notice>
      ) : null}
      {audit.programs.length > 1 ? <ProgramPills programs={audit.programs} /> : free ? <ProgramPills programs={audit.programs} all={null} locked /> : null}
    </div>
  );
}

function Words({ audit }: { audit: MockAudit }) {
  return (
    <section className={styles.block} aria-label="Visibility, Trust and Chosen">
      <WordTiles words={audit.words} compact />
      <Link href="/mock/audit" className={styles.headLink}>
        <Icon name="info" size={16} />
        What do these mean?
      </Link>
    </section>
  );
}

function TopFixes({ fixes, free }: { fixes: readonly Fix[]; free?: boolean }) {
  return (
    <section className={styles.block} aria-labelledby="top-fixes-title">
      <SectionTitle id="top-fixes-title" icon="wrench" title="Fix these first" help="The fixes with the most impact, from every place. Open one to see how, with a ready fix to copy." />
      <div className={styles.card}>
        <FixList fixes={fixes} href="/mock/audit/fix" numbered actions={free ? (fix) => <FixActions fix={fix} /> : undefined} />
      </div>
    </section>
  );
}

export function AuditView({ audit, option, held = false }: { audit: MockAudit; option: 1 | 2; held?: boolean }) {
  return (
    <div className={styles.page}>
      <AuditTop audit={audit} held={held} />
      <Words audit={audit} />
      <TopFixes fixes={audit.topFixes} />
      {option === 1 ? (
        <section className={styles.block} aria-labelledby="places-title">
          <SectionTitle id="places-title" icon="globe" title="What the internet says, place by place" help="Each place: what we found, with the link and date; what’s good; and what to fix." />
          <Tabs
            label="Places"
            items={audit.places.map((place) => ({
              id: place.info.key,
              label: place.info.name,
              count: place.fixes.length,
              content: (
                <div className={styles.tabPlace}>
                  <PlaceHead place={place} />
                  <PlaceColumns place={place} />
                </div>
              ),
            }))}
          />
        </section>
      ) : (
        <section className={styles.block} aria-labelledby="places-title">
          <SectionTitle id="places-title" icon="globe" title="What the internet says, place by place" />
          <nav className={styles.jump} aria-label="Places">
            {audit.places.map((place) => (
              <a key={place.info.key} href={`#place-${place.info.key}`} className={styles.jumpLink}>
                <Icon name={place.info.icon} size={16} />
                {place.info.name}
                <span className={`${styles.jumpCount} num`}>{place.fixes.length}</span>
              </a>
            ))}
          </nav>
          {audit.places.map((place) => (
            <PlaceStacked key={place.info.key} place={place} />
          ))}
        </section>
      )}
    </div>
  );
}

/** The fix panel, open over the Audit (option 1 behind it). */
export function FixPanelView({ audit }: { audit: MockAudit }) {
  const fix = audit.places.flatMap((place) => place.fixes).find((item) => item.checkKey === 'fees_shown') ?? audit.topFixes[0];
  return (
    <>
      <AuditView audit={audit} option={1} />
      {fix ? (
        <OpenPanel
          title={fix.title}
          description={`${placeName(fix)} · ${fix.label}`}
          footer={
            <div className={styles.panelFooter}>
              <div className={styles.panelButtons}>
                <Button icon="check">Mark as done</Button>
                <Button variant="secondary" icon="wrench">
                  Let AdmitLabs fix this
                </Button>
              </div>
              <p className={styles.quiet}>Your next Audit checks a fix marked done. Asking AdmitLabs sends one request to the team; they write back.</p>
            </div>
          }
        >
          <div className={styles.panel}>
            <ImpactTags impact={fix.impact} effort={fix.effort} programs={fix.programs} />
            <section className={styles.panelPart}>
              <h3 className={styles.panelTitle}>
                <span className="num">1</span> What we found
              </h3>
              <ul className={styles.panelProofs}>
                {fix.found.map((proof, index) => (
                  <li key={index}>
                    <ProofLine proof={proof} />
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.panelPart}>
              <h3 className={styles.panelTitle}>
                <span className="num">2</span> Why it matters
              </h3>
              <p className={styles.panelText}>{fix.why}</p>
            </section>
            <section className={styles.panelPart}>
              <h3 className={styles.panelTitle}>
                <span className="num">3</span> How to fix it
              </h3>
              <ol className={styles.steps}>
                {fix.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
            <section className={styles.panelPart}>
              <h3 className={styles.panelTitle}>
                <span className="num">4</span> Ready to copy
              </h3>
              <ReadyFixView ready={fix.ready} />
            </section>
            <p className={styles.added}>
              <Tag>Added by you</Tag> B.Sc Nursing is 4 years, 60 seats. Used in the ready fix for B.Sc Nursing, never in the words.
            </p>
          </div>
        </OpenPanel>
      ) : null}
    </>
  );
}

/** Free: the three words, the top 3 fixes in full, every place's results, the rest a preview. */
export function FreeAuditView({ audit }: { audit: MockAudit }) {
  const top = new Set(audit.topFixes.map((fix) => fix.id));
  const open = new Set(audit.places.flatMap((place) => place.found.filter((row) => row.key && top.has(`fix-${row.key}`)).map((row) => row.id)));
  return (
    <div className={styles.page}>
      <AuditTop audit={audit} free />
      <Words audit={audit} />
      <TopFixes fixes={audit.topFixes} free />
      <section className={styles.unlock} aria-labelledby="unlock-title">
        <div>
          <h2 id="unlock-title" className={styles.unlockTitle}>
            Paid shows the full picture
          </h2>
          <ul className={styles.unlockList}>
            <li>
              <Icon name="lock" size={14} />
              Every fix, ranked, each with a ready fix to copy
            </li>
            <li>
              <Icon name="lock" size={14} />
              What Drishti found for every check, with its link and date
            </li>
            <li>
              <Icon name="lock" size={14} />
              What people say about you, and the other places you show up
            </li>
            <li>
              <Icon name="lock" size={14} />
              Your other programs, and your progress month by month
            </li>
          </ul>
        </div>
        <div className={styles.unlockAction}>
          <Button icon="arrowUpRight">Ask for Paid</Button>
          <p className={styles.quiet}>₹24,999 + GST for 6 months. The team writes back; nothing is paid here.</p>
        </div>
      </section>
      <section className={styles.block} aria-labelledby="places-title">
        <SectionTitle id="places-title" icon="globe" title="What the internet says, place by place" />
        <Tabs
          label="Places"
          items={audit.places.map((place) => ({
            id: place.info.key,
            label: place.info.name,
            count: place.info.scored ? place.fixes.length : undefined,
            content: place.info.scored ? (
              <div className={styles.tabPlace}>
                <PlaceHead place={place} />
                <div className={styles.columns}>
                  <div className={styles.column}>
                    <p className={styles.columnTitle}>What we found</p>
                    <FoundList rows={place.found} open={open} />
                  </div>
                  <div className={styles.column}>
                    <p className={styles.columnTitle}>What’s good</p>
                    <GoodList items={place.good.slice(0, 3)} />
                  </div>
                  <div className={styles.column}>
                    <p className={styles.columnTitle}>What to fix</p>
                    <FixList fixes={place.fixes.filter((fix) => top.has(fix.id))} href="/mock/audit/fix" />
                    {place.fixes.filter((fix) => !top.has(fix.id)).length ? (
                      <div className={styles.preview} aria-hidden="true">
                        <p className={styles.previewRow}>Make your program page easier to find</p>
                        <p className={styles.previewRow}>Show your results with the year</p>
                      </div>
                    ) : null}
                    {place.fixes.filter((fix) => !top.has(fix.id)).length ? (
                      <p className={styles.quiet}>
                        <span className="num">{place.fixes.filter((fix) => !top.has(fix.id)).length}</span> more {place.fixes.filter((fix) => !top.has(fix.id)).length === 1 ? 'fix' : 'fixes'} here come with Paid.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.tabPlace}>
                <PlaceHead place={place} />
                <div className={styles.preview} aria-hidden="true">
                  <p className={styles.previewRow}>A student asks about the fees for this course</p>
                  <p className={styles.previewRow}>A thread compares two colleges in the city</p>
                  <p className={styles.previewRow}>A question about hostels has no answer yet</p>
                </div>
                <p className={styles.quiet}>Paid shows what people say about you on Reddit, Quora and forums, and where else you show up, each with its link and date.</p>
              </div>
            ),
          }))}
        />
      </section>
    </div>
  );
}

/** A Client with little said about it: What people say and Other places, as they read then. */
export function ThinView({ audit }: { audit: MockAudit }) {
  const unscored = audit.places.filter((place) => !place.info.scored);
  return (
    <div className={styles.page}>
      <AuditTop audit={audit} />
      <Words audit={audit} />
      {unscored.map((place) => (
        <PlaceStacked key={place.info.key} place={place} />
      ))}
    </div>
  );
}
