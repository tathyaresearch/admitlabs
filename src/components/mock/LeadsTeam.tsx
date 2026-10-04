// Version 2 mock (Step 2, development only): Leads for a Client, the team's tracking links, the
// review before sending (To review, one review) and the college's waiting state.

import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { CheckIcon, PlatformMark } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { RESULTS, RESULT_LABELS } from '@/domain/types';
import type { Platform } from '@/graphics/platforms';
import { CopyButton } from './Client';
import { Moved, ProofLine, SectionTitle, Tag, fmt } from './Bits';
import { LEAD_LINKS, LEADS, LEADS_SUMMARY, REVIEW_EDIT, REVIEW_QUEUE, USED_ON_LABELS, type UsedOn } from './data-more';
import type { MockAudit } from './model';
import styles from './mock.module.css';

const PLATFORM_OF: Partial<Record<UsedOn, Platform>> = { instagram: 'instagram', youtube: 'youtube', facebook: 'facebook' };

function UsedOnMark({ usedOn }: { usedOn: UsedOn }) {
  const platform = PLATFORM_OF[usedOn];
  return platform ? <PlatformMark platform={platform} /> : <span>{USED_ON_LABELS[usedOn]}</span>;
}

// Leads, as the Client sees them -----------------------------------------------------------------

export function LeadsView() {
  const top = [...LEAD_LINKS].sort((a, b) => b.thisMonth - a.thisMonth)[0];
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead
          title="Leads"
          question="What did our content bring in?"
          caption={['September 2026', `${LEAD_LINKS.length} links`, `Kept for ${LEADS_SUMMARY.keepMonths} months`]}
          actions={
            <Button variant="secondary" size="sm" icon="download">
              Download CSV
            </Button>
          }
        />
      </div>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Enquiries this month</p>
          <p className={`${styles.kpiBig} num`}>{LEADS_SUMMARY.thisMonth}</p>
          <p className={styles.kpiNote}>
            <Icon name="arrowUp" size={14} />
            <span>
              <span className="num">{LEADS_SUMMARY.thisMonth - LEADS_SUMMARY.lastMonth}</span> more than August, when there were <span className="num">{LEADS_SUMMARY.lastMonth}</span>
            </span>
          </p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Brought the most</p>
          <p className={styles.kpiText}>{top?.name}</p>
          <p className={styles.kpiNote}>
            <span className="num">{top?.thisMonth}</span> enquiries this month
          </p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Since July</p>
          <p className={`${styles.kpiBig} num`}>{LEADS_SUMMARY.total}</p>
          <p className={styles.kpiNote}>From {LEAD_LINKS.length} links the AdmitLabs team made</p>
        </div>
      </div>

      <section className={styles.block} aria-labelledby="links-title">
        <SectionTitle id="links-title" icon="share" title="By link" help="Each link the AdmitLabs team made for your content, and what it brought." />
        <div className={styles.card}>
          <div className={styles.gridScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Link</th>
                  <th scope="col">Used on</th>
                  <th scope="col">Program</th>
                  <th scope="col" className={styles.num}>
                    This month
                  </th>
                  <th scope="col" className={styles.num}>
                    August
                  </th>
                  <th scope="col" className={styles.num}>
                    In all
                  </th>
                </tr>
              </thead>
              <tbody>
                {LEAD_LINKS.map((link) => (
                  <tr key={link.id}>
                    <th scope="row">{link.name}</th>
                    <td>
                      <UsedOnMark usedOn={link.usedOn} />
                    </td>
                    <td>{link.program}</td>
                    <td className={styles.num}>
                      <span className={styles.countBar}>
                        <span className={styles.countTrack} aria-hidden="true">
                          <span style={{ width: `${(link.thisMonth / 9) * 100}%` }} />
                        </span>
                        <span className="num">{link.thisMonth}</span>
                      </span>
                    </td>
                    <td className={`${styles.num} num`}>{link.lastMonth}</td>
                    <td className={`${styles.num} num`}>{link.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="list-title">
        <SectionTitle
          id="list-title"
          icon="enquiry"
          title="Every enquiry"
          help="Newest first. Each student agreed to be contacted by Brightpath Skills Academy about admission."
          action={
            <button type="button" className={styles.linkButton}>
              <Icon name="close" size={14} />
              Delete a student’s data
            </button>
          }
        />
        <div className={styles.card}>
          <div className={styles.gridScroll}>
            <table className={[styles.table, styles.leadTable].join(' ')}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Course</th>
                  <th scope="col">From</th>
                  <th scope="col">Date</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col">City</th>
                </tr>
              </thead>
              <tbody>
                {LEADS.slice(0, 9).map((lead) => (
                  <tr key={lead.id}>
                    <th scope="row">{lead.name}</th>
                    <td>{lead.course}</td>
                    <td>{lead.link}</td>
                    <td className={styles.nowrap}>{fmt(lead.day)}</td>
                    <td className={`${styles.nowrap} num`}>{lead.phone}</td>
                    <td>{lead.email}</td>
                    <td>{lead.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.quiet}>
            Showing <span className="num">9</span> of <span className="num">23</span> this month. <span className={styles.underline}>Show all</span>
          </p>
        </div>
        <p className={styles.quiet}>
          New enquiries go by email to {LEADS_SUMMARY.alertTo.join(', ')} as they arrive. Drishti keeps them for {LEADS_SUMMARY.keepMonths} months, then deletes them. Change both in Settings, Leads.
        </p>
      </section>
    </div>
  );
}

// The team's view of a Client: tracking links -----------------------------------------------------

export function TeamLinksView() {
  const tabs = ['Work log', 'Leads links', 'Audits', 'Programs', 'People', 'Notes', 'Share links'];
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead
          back={{ href: '/mock/team/institutions', label: 'Institutions' }}
          title="Brightpath Skills Academy"
          question="Where do they stand, and what’s their plan?"
          caption={['Client', 'Skilling institute', 'Guwahati']}
        />
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>
            <Icon name="checkCircle" size={18} />
            How new Audits and summaries go out
          </h2>
        </div>
        <div className={styles.segment} role="radiogroup" aria-label="How new Audits and summaries go out">
          <span className={styles.segmentItem} role="radio" aria-checked="false">
            Review first
          </span>
          <span className={[styles.segmentItem, styles.segmentOn].join(' ')} role="radio" aria-checked="true">
            Send automatically
          </span>
        </div>
        <p className={styles.quiet}>Brightpath’s Audits and monthly summaries reach them straight away. With Review first, each waits in To review until the team approves it.</p>
      </div>
      <div className={styles.tabStrip} role="tablist" aria-label="Brightpath Skills Academy">
        {tabs.map((tab) => (
          <span key={tab} className={[styles.tabItem, tab === 'Leads links' ? styles.tabItemOn : ''].join(' ')} role="tab" aria-selected={tab === 'Leads links'}>
            {tab}
            {tab === 'Leads links' ? <span className={`${styles.tabCount} num`}>4</span> : null}
          </span>
        ))}
      </div>
      <section className={styles.card} aria-labelledby="make-link">
        <h2 id="make-link" className={styles.cardTitle}>
          <Icon name="plus" size={18} />
          Make a tracking link
        </h2>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <span className={styles.input}>Reel: Hotel Management first day</span>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Used on</span>
            <span className={styles.input}>
              Instagram <Icon name="chevronDown" size={16} />
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Program</span>
            <span className={styles.input}>
              Hotel Management <Icon name="chevronDown" size={16} />
            </span>
          </label>
          <Button icon="plus">Make the link</Button>
        </div>
        <p className={styles.quiet}>Each link opens a short form for that program with Brightpath’s name. Enquiries go to Brightpath only.</p>
      </section>
      <section className={styles.card} aria-labelledby="links-list">
        <div className={styles.cardHead}>
          <h2 id="links-list" className={styles.cardTitle}>
            <Icon name="share" size={18} />
            Links
          </h2>
          <span className={styles.quiet}>Counts only. The team never sees a student’s details.</span>
        </div>
        <ul className={styles.linkList}>
          {LEAD_LINKS.map((link) => (
            <li key={link.id} className={styles.linkRow}>
              <span className={styles.linkMain}>
                <span className={styles.strongText}>{link.name}</span>
                <span className={styles.linkMeta}>
                  <UsedOnMark usedOn={link.usedOn} />
                  <span>{link.program}</span>
                  <span>Since {link.since}</span>
                </span>
                <span className={styles.linkUrl}>admitlabs.in/enquire/{link.code}</span>
              </span>
              <span className={styles.linkCounts}>
                <span>
                  <span className={`${styles.linkCount} num`}>{link.thisMonth}</span> this month
                </span>
                <span>
                  <span className="num">{link.total}</span> in all
                </span>
              </span>
              <span className={styles.linkActions}>
                <CopyButton text={`https://admitlabs.in/enquire/${link.code}`} label="Copy link" />
                <Button variant="quiet" size="sm">
                  Archive
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// Review before sending ----------------------------------------------------------------------------

export function ReviewListView() {
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="To review" question="What needs a look before it goes out?" caption={[`${REVIEW_QUEUE.length} waiting`, 'Oldest first', 'Brightpath Skills Academy sends automatically']} />
      </div>
      <div className={styles.card}>
        <ul className={styles.reviewList}>
          {REVIEW_QUEUE.map((item) => (
            <li key={item.id} className={styles.reviewRow}>
              <span className={styles.reviewMain}>
                <span className={styles.reviewCollege}>{item.college}</span>
                <span className={styles.reviewWhat}>
                  <Tag strong={item.what.startsWith('First')}>{item.what}</Tag>
                  <span>{item.plan}</span>
                </span>
                <span className={styles.quiet}>{item.line}</span>
              </span>
              <span className={styles.reviewWait}>
                <Icon name="stopwatch" size={14} />
                Waiting {item.waiting}
              </span>
              <ButtonLink href={item.href} variant={item.id === 'r2' ? 'primary' : 'secondary'} size="sm" iconAfter="arrowRight">
                Review
              </ButtonLink>
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.quiet}>Nothing here reaches the college until the team approves it: not the Audit, its alerts or its email. Lead alerts never wait.</p>
    </div>
  );
}

export function ReviewItemView({ audit }: { audit: MockAudit }) {
  const edited = REVIEW_EDIT;
  const scored = audit.places.filter((place) => place.info.scored);
  const people = audit.places.find((place) => place.info.key === 'people');
  return (
    <div className={[styles.page, styles.withBar].join(' ')}>
      <div className={styles.top}>
        <PageHead
          back={{ href: '/mock/team/review', label: 'To review' }}
          title={audit.name}
          question="Is this right before it goes out?"
          caption={[`New Audit, ${fmt(audit.checkedAt)}`, `Free: ${audit.programs[0]}`, 'Waiting 1 day', 'Review first']}
        />
      </div>

      <section className={styles.block} aria-labelledby="since-title">
        <SectionTitle id="since-title" icon="refresh" title={`What changed since the last approved Audit, ${audit.previousAt ? fmt(audit.previousAt) : ''}`} />
        <div className={styles.card}>
          <div className={styles.changedGrid}>
            <div>
              <p className={styles.miniTitle}>Words</p>
              <ul className={styles.plainList}>
                {audit.words.map((word) => (
                  <li key={word.pillar}>
                    <span className={styles.strongText}>{word.name}</span> {word.word}
                    {word.moved ? <span className={styles.quiet}>, {word.moved.charAt(0).toLowerCase() + word.moved.slice(1)}</span> : <span className={styles.quiet}>, no change</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={styles.miniTitle}>Checks that moved</p>
              <ul className={styles.plainList}>
                {audit.moved.map((check) => (
                  <li key={check.name} className={styles.movedRow}>
                    <span>{check.name}</span>
                    <Moved before={check.before} after={check.after} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={styles.miniTitle}>Findings</p>
              <ul className={styles.plainList}>
                <li>1 new: an unanswered question on Quora</li>
                <li className={styles.quiet}>None gone</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="edit-title">
        <SectionTitle id="edit-title" icon="wrench" title="The Audit, place by place" help="Fix a result or a line where the reader got it wrong. The words update straight away. Every change is kept." />
        {scored.map((place) => (
          <div key={place.info.key} className={styles.card}>
            <p className={styles.columnTitle}>
              <Icon name={place.info.icon} size={16} /> {place.info.name}
            </p>
            <ul className={styles.editList}>
              {place.found.map((row) => {
                const isEdited = row.name === edited.check;
                const result = isEdited ? edited.after : row.result;
                return (
                  <li key={row.id} className={[styles.editRow, isEdited ? styles.editRowOn : ''].join(' ')}>
                    <span className={styles.editName}>
                      {row.key ? <CheckIcon check={row.key} size={15} /> : null}
                      {row.name}
                      {row.weakestProgram ? <span className={styles.foundWeakest}>{row.weakestProgram}</span> : null}
                    </span>
                    <span className={styles.editResult}>
                      <span className={styles.select}>
                        {result ? RESULT_LABELS[result] : ''}
                        <Icon name="chevronDown" size={14} />
                      </span>
                      {result ? <ResultBar result={result} showPoints={false} size="sm" /> : null}
                    </span>
                    <span className={styles.editLine}>
                      {isEdited ? (
                        <>
                          <ProofLine proof={{ ...row.proof, program: null, line: 'The BBA page shows a yearly fee range, ₹68,000 to ₹74,000.', byTeam: true }} compact />
                          <span className={styles.editNote}>
                            Changed by {edited.by}: <Moved before={edited.before} after={edited.after} />. “{edited.reason}”
                          </span>
                        </>
                      ) : (
                        <ProofLine proof={row.proof} compact />
                      )}
                    </span>
                    <span className={styles.editActions}>
                      <button type="button" className={styles.linkButton}>
                        Edit line
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {people ? (
          <div className={styles.card}>
            <p className={styles.columnTitle}>
              <Icon name={people.info.icon} size={16} /> {people.info.name}
            </p>
            <ul className={styles.editList}>
              {people.found.map((row) => (
                <li key={row.id} className={styles.editRow}>
                  <span className={styles.editName}>
                    <Icon name="forum" size={15} /> {row.source}
                  </span>
                  <span className={styles.editResult}>
                    <Tag strong>New</Tag>
                  </span>
                  <span className={styles.editLine}>
                    <ProofLine proof={row.proof} compact />
                  </span>
                  <span className={styles.editActions}>
                    <button type="button" className={styles.linkButton}>
                      Edit line
                    </button>
                    <button type="button" className={styles.linkButton}>
                      Take out
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className={styles.quiet}>Results to choose from: {RESULTS.map((result) => RESULT_LABELS[result]).join(', ')}. A changed result keeps its link, shows the day the team checked it, and reads “Checked by the AdmitLabs team”.</p>
      </section>

      <div className={styles.approveBar}>
        <span className={styles.approveText}>
          <span className={styles.strongText}>1 change.</span> Visibility {audit.words[0]?.word}, Trust {audit.words[1]?.word}, Chosen Okay. Approving sends the Audit ready email to the owner.
        </span>
        <Button icon="check">Approve and send</Button>
      </div>
    </div>
  );
}

/** The college's Home while its first Audit waits for the team. */
export function WaitingView() {
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="Home" question="How are we doing this month?" caption={['Signed up today', 'Free plan']} />
      </div>
      <section className={`invert ${styles.waiting}`} aria-labelledby="waiting-title">
        <Icon name="stopwatch" size={28} />
        <h2 id="waiting-title" className={styles.waitingTitle}>
          Your Audit is being checked by the AdmitLabs team.
        </h2>
        <p className={styles.waitingText}>Drishti finished checking what students see at 11:20 today. Someone from AdmitLabs looks it over before you see it, usually within one working day.</p>
        <p className={styles.waitingText}>We will email owner@loomcraft-skills.example when it is ready.</p>
      </section>
      <div className={styles.twoUp}>
        <section className={styles.card} aria-labelledby="see-title">
          <h2 id="see-title" className={styles.cardTitle}>
            <Icon name="audit" size={18} />
            What you will see
          </h2>
          <ul className={styles.plainList}>
            <li>Visibility, Trust and Chosen: can students find you, believe you and pick you</li>
            <li>What the internet says about you, place by place, with links and dates</li>
            <li>Your first three fixes, each with a ready fix to copy</li>
          </ul>
        </section>
        <section className={styles.card} aria-labelledby="meanwhile-title">
          <h2 id="meanwhile-title" className={styles.cardTitle}>
            <Icon name="rivals" size={18} />
            While you wait
          </h2>
          <p className={styles.quiet}>Pick 3 to 5 rivals. Drishti checks each one, so your first Audit can show who’s ahead in Tezpur.</p>
          <div>
            <ButtonLink href="/mock/rivals/choose" variant="secondary" size="sm" iconAfter="arrowRight">
              Pick your rivals
            </ButtonLink>
          </div>
        </section>
      </div>
      <p className={styles.quiet}>
        <Link href="/mock/audit?opt=1&held=1" className={styles.underline}>
          Later Audits
        </Link>{' '}
        work the same way: you keep seeing your last Audit, with one line at the top, until the new one is ready.
      </p>
    </div>
  );
}
