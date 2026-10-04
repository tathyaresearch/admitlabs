import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { overviewView, scoresByMonth, type ListItem } from '@/audit/view';
import { PartResults } from '@/components/audit/Parts';
import { AddedTag } from '@/components/details/Added';
import { HomeSummary } from '@/components/home/HomeSummary';
import { NextSteps, type NextStep } from '@/components/home/NextSteps';
import { Tag } from '@/components/audit/PlaceBits';
import { ActionButton, CopyLink, LeadLinkForm, NoteForm, PaidStartForm, ReviewFirstSetting, WorkForm } from '@/components/team/InstitutionPanels';
import { AnchorButton, Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { KpiCard, KpiNote, KpiNumber, KpiWord } from '@/components/ui/Kpi';
import { FactList, PageHead } from '@/components/ui/Layout';
import { CheckIcon } from '@/components/ui/Marks';
import { PointsValue } from '@/components/ui/Results';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { TEAM_RULES } from '@/config/team';
import { istParts, monthKey } from '@/domain/dates';
import { EMPTY_PROGRAM_DETAILS as EMPTY_PROGRAM, institutionDetailLines, programDetailLines } from '@/domain/details';
import { formatDate, formatDateTime, formatMonth, hostAndPath, plural } from '@/domain/format';
import { scoreLabel } from '@/domain/scores';
import { effectiveTier, type PlanRecord } from '@/domain/tiers';
import { EFFORT_LABELS, INSTITUTION_TYPE_LABELS, LEAD_SOURCE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS, type InstitutionType } from '@/domain/types';
import { byLink, type LinkCount } from '@/leads/summary';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadAddedDetails, type AddedDetails } from '@/lib/details/load';
import { loadLinkCounts } from '@/lib/leads/load';
import { loadTeamInstitution, type LinkRow, type TeamInstitution, type WorkRow } from '@/lib/team/load';
import { APP_URL, SITE_URL } from '@/lib/urls';
import { fixThing } from '@/report/things';
import { TEAM_STATUS_LABELS, type TeamStatus } from '@/team/filters';
import { planActions, planDetail } from '@/team/plans';
import { linkState, linkStateText, sharePath } from '@/team/share';
import { isOverdue, workByMonth } from '@/team/work';
import { viewAsAction } from '../../view-as-actions';
import {
  archiveLeadLinkAction,
  createLeadLinkAction,
  addNoteAction,
  auditNowAction,
  endPlanAction,
  makeClientAction,
  markWorkDoneAction,
  removeNoteAction,
  removeWorkAction,
  addWorkAction,
  setReviewFirstAction,
  shareAuditAction,
  startPaidAction,
  stopLinkAction,
} from './actions';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Their own Audits listed under Audits, newest first. */
const OWN_AUDITS_SHOWN = 6;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return { title: 'Page not found' };
  const { id } = await params;
  const institution = UUID.test(id) ? await loadTeamInstitution(id) : null;
  return { title: institution?.name ?? 'Institution' };
}

// One institution answers "Where do they stand, and what's their plan?": the score and pillars,
// the plan (or, before they sign up, sharing the Audit), what to fix first, then the rest in tabs.
export default async function TeamInstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireTeamViewer();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const institution = await loadTeamInstitution(id);
  if (!institution) notFound();
  const [added, leadLinks] = institution.claimed ? await Promise.all([loadAddedDetails(institution.id), loadLinkCounts(institution.id)]) : [null, [] as LinkCount[]];

  const now = new Date();
  const plan: PlanRecord | null = institution.plan
    ? { tier: institution.plan.tier, startsAt: new Date(institution.plan.startsAt), endsAt: institution.plan.endsAt ? new Date(institution.plan.endsAt) : null }
    : null;
  const tier = institution.claimed ? effectiveTier(plan, now) : null;
  const status: TeamStatus = institution.claimed ? 'signed_up' : institution.isProspect ? 'prospect' : 'rival_record';
  const isAdmin = viewer.teamRole === 'admin';
  const latest = institution.audit;
  const view = latest ? overviewView(latest, { institutionType: institution.type, programNames: institution.programNames }) : null;
  const teamAudit = latest?.kind === 'team' ? latest : null;
  const actions = isAdmin ? planActions(plan, institution.claimed, now) : [];

  // The score's history, from the same kind of Audit as the score itself.
  const trendRows = latest?.kind === 'team' ? institution.teamAudits : latest && latest.kind !== 'rival' ? institution.history : [];
  const trend = scoresByMonth(
    trendRows.map((row) => ({ runAt: row.runAt, scores: { overall: row.overall, discovered: row.discovered, trusted: row.trusted, chosen: row.chosen } })),
    (runAt) => monthKey(new Date(runAt)),
  );
  const scoreName = !latest ? '' : latest.kind === 'team' ? 'Team Audit score' : latest.kind === 'rival' ? 'Rival Audit score' : 'Their score';
  // A new prospect: nothing to look at until the first team Audit, so that comes first.
  const firstStep = !institution.claimed && !(view && latest);

  // A Client's work log comes first: it is what the team does for them every month.
  const client = tier === 'client';
  const tabs: TabItem[] = [
    ...(client || institution.work.length
      ? [{ id: 'work', label: 'Work log', count: institution.work.length, content: <WorkTab institution={institution} client={client} now={now} /> }]
      : []),
    ...(client || leadLinks.length
      ? [{ id: 'leads', label: 'Leads links', count: leadLinks.length, content: <LeadLinksTab institution={institution} links={leadLinks} client={client} /> }]
      : []),
    { id: 'audits', label: 'Audits', count: institution.teamAudits.length + Math.min(institution.history.length, OWN_AUDITS_SHOWN), content: <AuditsTab institution={institution} /> },
    { id: 'programs', label: 'Programs', count: institution.programs.length, content: <ProgramsTab institution={institution} /> },
    ...(institution.claimed
      ? [
          { id: 'people', label: 'People', count: institution.people.length + institution.invites.length, content: <PeopleTab institution={institution} /> },
          ...(added ? [{ id: 'about', label: 'About', content: <AboutTab institution={institution} added={added} /> }] : []),
        ]
      : []),
    {
      id: 'notes',
      label: 'Notes',
      count: institution.notes.length,
      content: (
        <div className={styles.tabStack}>
          <p className={styles.formNote}>Team only. Never shown to the institution.</p>
          <div className={styles.noteCard}>
            <NoteForm action={addNoteAction.bind(null, institution.id)} />
          </div>
          {institution.notes.length ? (
            <div className={styles.rows}>
              {institution.notes.map((note) => (
                <div key={note.id} className={styles.item}>
                  <p className={styles.itemBody}>{note.body}</p>
                  <p className={styles.itemMeta}>
                    <span>{note.author}</span>
                    <span>{formatDate(note.createdAt)}</span>
                  </p>
                  {note.authorId === viewer.userId || isAdmin ? (
                    <form action={removeNoteAction.bind(null, institution.id, note.id)} className={styles.itemActions}>
                      <Button type="submit" size="sm" variant="quiet">
                        Remove
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No notes yet. Add what you hear on calls and in emails, so the whole team knows.</p>
          )}
        </div>
      ),
    },
    {
      id: 'links',
      label: 'Share links',
      count: institution.links.length,
      content: (
        <div className={styles.tabStack}>
          <p className={styles.formNote}>
            {institution.claimed
              ? 'Links made before they signed up. Each one works until it expires or you stop it.'
              : `Each link opens the team Audit for ${TEAM_RULES.shareLinkDays} days, until it expires or you stop it.`}
          </p>
          {institution.links.length ? (
            <ShareLinks institutionId={institution.id} links={institution.links} now={now} />
          ) : (
            <p className={styles.empty}>
              {institution.claimed ? 'No links were made before they signed up.' : teamAudit ? 'No links yet. Create one in Share this Audit, above.' : 'No links yet. Run a team Audit first, then create one in Share this Audit.'}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={audit.page}>
      <PageHead
        back={{ href: '/team', label: 'Institutions' }}
        title={institution.name}
        question="Where do they stand, and what's their plan?"
        caption={[
          `${INSTITUTION_TYPE_LABELS[institution.type]} in ${institution.city}, ${institution.state}`,
          <a key="site" href={institution.website} target="_blank" rel="noreferrer">
            {hostAndPath(institution.website)}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>,
          institution.claimedAt ? `Signed up ${formatDate(institution.claimedAt)}` : `${TEAM_STATUS_LABELS[status]}, added ${formatDate(institution.createdAt)}`,
        ]}
        actions={
          <>
            {institution.claimed ? (
              <form action={viewAsAction.bind(null, institution.id)}>
                <Button type="submit" variant="secondary" iconAfter="arrowRight">
                  Open their dashboard
                </Button>
              </form>
            ) : null}
            {firstStep ? null : <ActionButton action={auditNowAction.bind(null, institution.id)} label={tier === 'client' ? 'Refresh their Audit' : 'Run a team Audit'} icon="refresh" size="md" />}
          </>
        }
      />

      {view && latest ? (
        <HomeSummary view={view} checkedAt={latest.runAt} trend={trend} scoreLabel={scoreName} historyLabel={`${scoreName} by month`} verdict={false} />
      ) : (
        <EmptyState
          icon="audit"
          title={institution.claimed ? 'No Audit yet' : 'Start with a team Audit'}
          headingLevel={2}
          action={firstStep ? <ActionButton action={auditNowAction.bind(null, institution.id)} label="Run a team Audit" icon="refresh" size="md" /> : undefined}
        >
          {institution.claimed ? (
            'Their first Audit runs when they pick a program.'
          ) : (
            <ol className={styles.firstSteps}>
              <li>Run a team Audit. Drishti checks their public pages and scores them. It stays private.</li>
              <li>See what they should fix first, here on this page.</li>
              <li>Share it with them: a private link for {TEAM_RULES.shareLinkDays} days, or the PDF.</li>
            </ol>
          )}
        </EmptyState>
      )}

      <section className={styles.planRow} aria-label={institution.claimed ? 'Plan' : 'Share this Audit'}>
        {institution.claimed ? (
          <KpiCard label="Plan" aside={institution.plan?.setBy ? `Set by ${institution.plan.setBy}` : undefined}>
            <div className={styles.planBody}>
              <div className={styles.planNow}>
                <KpiWord>{tier ? TIER_LABELS[tier] : 'Free'}</KpiWord>
                {planDetail(plan, now) ? <KpiNote>{planDetail(plan, now)}</KpiNote> : null}
              </div>
              {isAdmin ? (
                <div className={styles.planActions}>
                  {actions.includes('start_paid') ? <PaidStartForm action={startPaidAction.bind(null, institution.id)} now={now.toISOString()} /> : null}
                  {actions.includes('make_client') ? (
                    <ActionButton
                      action={makeClientAction.bind(null, institution.id)}
                      label="Make them a Client"
                      variant="secondary"
                      confirm="They get everything Paid has, while the AdmitLabs service is active. Their first Client Audit runs now."
                    />
                  ) : null}
                  {actions.includes('end_plan') ? (
                    <ActionButton
                      action={endPlanAction.bind(null, institution.id)}
                      label="End the plan now"
                      variant="quiet"
                      confirm="They move to Free today. They keep their last Audit score and their past reports."
                    />
                  ) : null}
                </div>
              ) : (
                <p className={styles.formNote}>An Admin changes plans.</p>
              )}
            </div>
          </KpiCard>
        ) : (
          <KpiCard label="Share this Audit">
            <p className={styles.planText}>
              A private link to the team Audit, for {TEAM_RULES.shareLinkDays} days. It shows how to fix the top {TEAM_RULES.sharedFixesInFull} fixes.
            </p>
            {teamAudit ? (
              <div className={styles.shareActions}>
                {/* A new or stopped link shows under Share links, so the button starts fresh each time the links change. */}
                <ActionButton
                  key={institution.links.map((link) => `${link.token}:${link.stoppedAt ?? ''}`).join(' ') || 'none'}
                  action={shareAuditAction.bind(null, institution.id, teamAudit.id)}
                  label="Create a link"
                  icon="plus"
                />
                <AnchorButton href={`/team/institutions/${institution.id}/pdf`} size="sm" variant="secondary" icon="download">
                  Download PDF
                </AnchorButton>
              </div>
            ) : (
              <p className={styles.formNote}>Run a team Audit first. Only a team Audit can be shared.</p>
            )}
          </KpiCard>
        )}
        <KpiCard label="Tracked as a rival by">
          <KpiNumber value={institution.trackedBy} suffix={institution.trackedBy === 1 ? 'institution' : 'institutions'} />
          <KpiNote>Institutions never see who tracks them.</KpiNote>
        </KpiCard>
      </section>

      {institution.claimed ? (
        <KpiCard
          label="How new Audits and summaries go out"
          aside={
            institution.waitingAuditId ? (
              <ButtonLink href={`/team/review/${institution.waitingAuditId}`} size="sm" variant="secondary" iconAfter="arrowRight">
                Review the waiting Audit
              </ButtonLink>
            ) : undefined
          }
        >
          <ReviewFirstSetting name={institution.name} on={institution.reviewFirst} action={setReviewFirstAction.bind(null, institution.id)} />
        </KpiCard>
      ) : null}

      {view && !institution.claimed ? (
        <NextSteps
          id="fixes"
          icon="wrench"
          title="What to fix first"
          description={`The biggest gains first. A shared Audit explains the top ${TEAM_RULES.sharedFixesInFull} and says AdmitLabs can fix the rest.`}
          steps={view.fixes.slice(0, 5).map((item) => fixStep(item, institution.type))}
          empty={<p className={audit.quietNote}>Every check is Strong.</p>}
        />
      ) : null}

      <section className={audit.section} aria-labelledby="record-title">
        <h2 id="record-title" className="visually-hidden">
          {client ? 'Work log, audits, programs, people, notes and share links' : 'Audits, programs, people, notes and share links'}
        </h2>
        <Tabs label={`About ${institution.name}`} items={tabs} />
      </section>
    </div>
  );
}

/** One of a prospect's fixes for the team: the check and its results, what was found, the points it could add and the effort. */
function fixStep(item: ListItem, institutionType: InstitutionType): NextStep {
  const finding = item.parts.find((part) => part.detail)?.detail?.finding ?? '';
  return {
    key: item.key,
    kicker: (
      <span className={audit.fixKicker}>
        <span className={audit.fixCheck}>
          <CheckIcon check={item.key} size={14} />
          {item.name}
        </span>
        <PartResults parts={item.parts} showNames={item.parts.length > 1} />
      </span>
    ),
    title: fixThing(item, institutionType).title,
    detail: finding,
    aside: (
      <span className={audit.fixAside}>
        <PointsValue kind="gain" points={item.points} />
        {item.difficulty ? <span className={audit.fixDifficulty}>Effort {EFFORT_LABELS[item.difficulty]}</span> : null}
      </span>
    ),
    href: null,
  };
}

/** A Client's work log: add what the team did or does next, then the log as they see it, Next first. */
function WorkTab({ institution, client, now }: { institution: TeamInstitution; client: boolean; now: Date }) {
  const { next, months } = workByMonth(institution.work);
  const { year, month, day } = istParts(now);
  const today = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return (
    <div className={styles.tabStack}>
      <p className={styles.formNote}>
        {client
          ? 'They see this on their Home and in their work list, so write it for them, in plain words.'
          : 'Their AdmitLabs service has ended, so they no longer see this log.'}
      </p>
      {client ? (
        <div className={styles.noteCard}>
          <WorkForm action={addWorkAction.bind(null, institution.id)} today={today} />
        </div>
      ) : null}
      {institution.work.length ? (
        <>
          {next.length ? (
            <div className={styles.workGroup}>
              <h3 className={styles.workGroupTitle}>Next</h3>
              <div className={styles.rows}>
                {next.map((row) => (
                  <WorkItem key={row.id} institutionId={institution.id} row={row} now={now} />
                ))}
              </div>
            </div>
          ) : null}
          {months.map((group) => (
            <div key={group.month} className={styles.workGroup}>
              <h3 className={styles.workGroupTitle}>Done in {formatMonth(group.month)}</h3>
              <div className={styles.rows}>
                {group.entries.map((row) => (
                  <WorkItem key={row.id} institutionId={institution.id} row={row} now={now} />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <p className={styles.empty}>Nothing logged yet. Add each piece of work as it is done, so they see what the service does for them.</p>
      )}
    </div>
  );
}

/** A Client's tracking links (spec section 23): make one, copy it, see what each brought, archive it. Counts only. */
function LeadLinksTab({ institution, links, client }: { institution: TeamInstitution; links: readonly LinkCount[]; client: boolean }) {
  const programs = institution.programs.filter((program) => !program.archived);
  return (
    <div className={styles.tabStack}>
      <p className={styles.formNote}>
        {client
          ? `Each link opens a short form for ${institution.name} and one of its programs. Enquiries go to ${institution.name} only: the team sees counts, never a student’s details.`
          : 'Their AdmitLabs service has ended, so their forms are closed. Counts only.'}
      </p>
      {client ? (
        <div className={styles.noteCard}>
          <LeadLinkForm action={createLeadLinkAction.bind(null, institution.id)} programs={programs} />
        </div>
      ) : null}
      {links.length ? (
        <div className={styles.rows}>
          {byLink(links).map((link) => {
            const url = `${SITE_URL}/enquire/${link.code}`;
            return (
              <div key={link.id} className={`${styles.item} ${styles.workItem}`}>
                <div className={styles.workMain}>
                  <p className={styles.itemBody}>
                    {link.name} {link.archivedAt ? <Tag>Closed</Tag> : null}
                  </p>
                  <p className={styles.itemMeta}>
                    <span>{LEAD_SOURCE_LABELS[link.usedOn]}</span>
                    <span>{link.programName}</span>
                    <span>Since {formatDate(link.createdAt)}</span>
                    <span>
                      {plural(link.thisMonth, 'enquiry', 'enquiries')} this month, {link.total} in all
                    </span>
                  </p>
                  <p className={styles.itemMeta}>
                    <span>{hostAndPath(url)}</span>
                  </p>
                </div>
                {link.archivedAt ? null : (
                  <div className={styles.workActions}>
                    <CopyLink url={url} />
                    <form action={archiveLeadLinkAction.bind(null, institution.id, link.id)}>
                      <Button type="submit" size="sm" variant="quiet">
                        Archive
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>No links yet. Make one for each place their content goes: the Instagram bio, a reel, a YouTube video.</p>
      )}
    </div>
  );
}

function WorkItem({ institutionId, row, now }: { institutionId: string; row: WorkRow; now: Date }) {
  return (
    <div className={`${styles.item} ${styles.workItem}`}>
      <div className={styles.workMain}>
        <p className={styles.itemBody}>{row.text}</p>
        <p className={styles.itemMeta}>
          <span>{row.kind === 'done' ? `Done ${formatDate(row.on)}` : isOverdue(row, now) ? `Was due ${formatDate(row.on)}` : `By ${formatDate(row.on)}`}</span>
          {row.link ? (
            <a href={row.link} className={styles.link} target="_blank" rel="noreferrer">
              {hostAndPath(row.link)}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : null}
          <span>Added by {row.addedBy}</span>
        </p>
      </div>
      <div className={styles.workActions}>
        {row.kind === 'next' ? (
          <form action={markWorkDoneAction.bind(null, institutionId, row.id)}>
            <Button type="submit" size="sm" variant="secondary" icon="check">
              Mark as done
            </Button>
          </form>
        ) : null}
        <form action={removeWorkAction.bind(null, institutionId, row.id)}>
          <Button type="submit" size="sm" variant="quiet">
            Remove
          </Button>
        </form>
      </div>
    </div>
  );
}

function AuditRow({ when, overall, children }: { when: string; overall: number; children?: ReactNode }) {
  return (
    <div className={styles.item}>
      <div className={styles.itemHead}>
        <span className={styles.itemTitle}>{formatDateTime(when)}</span>
        <span className={styles.itemScore}>
          <span className="num">{overall}</span>
          <span className={styles.itemScoreLabel}>{scoreLabel(overall)}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

/** Private team Audits, then their own Audits, newest first. */
function AuditsTab({ institution }: { institution: TeamInstitution }) {
  const own = [...institution.history].reverse().slice(0, OWN_AUDITS_SHOWN);
  if (!institution.teamAudits.length && !own.length) return <p className={styles.empty}>No Audits yet.</p>;
  return (
    <div className={styles.tabStack}>
      {institution.teamAudits.length ? (
        <>
          <p className={styles.formNote}>{institution.claimed ? 'Private team Audits. Only the team sees these.' : 'Team Audits, newest first. Private until shared.'}</p>
          <div className={styles.rows}>
            {institution.teamAudits.map((row) => (
              <AuditRow key={row.id} when={row.runAt} overall={row.overall}>
                <p className={styles.itemMeta}>
                  <span>
                    Discovered <span className="num">{row.discovered}</span>, Trusted <span className="num">{row.trusted}</span>, Chosen{' '}
                    <span className="num">{row.chosen}</span>
                  </span>
                  {row.topFix ? <span>Top fix: {row.topFix}</span> : null}
                </p>
              </AuditRow>
            ))}
          </div>
        </>
      ) : null}
      {own.length ? (
        <>
          <p className={styles.formNote}>Their own Audits, newest first. Their dashboard shows what their plan includes.</p>
          <div className={styles.rows}>
            {own.map((row) => (
              <AuditRow key={row.id} when={row.runAt} overall={row.overall} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProgramsTab({ institution }: { institution: TeamInstitution }) {
  const latest = institution.audit;
  return (
    <div className={styles.tabStack}>
      {institution.programs.length ? <p className={styles.formNote}>{latest ? 'With their score in the latest Audit.' : 'Audited in the next Audit.'}</p> : null}
      {institution.programs.length ? null : (
        <p className={styles.empty}>{institution.claimed ? 'No programs added yet. They add them in Settings.' : 'No programs on record yet. They come from a bulk Audit list, or from their own sign-up.'}</p>
      )}
      <div className={styles.rows}>
        {institution.programs.map((program) => {
          const score = latest?.programs.find((entry) => entry.programId === program.id);
          return (
            <div key={program.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemTitle}>
                  {program.name}
                  {program.archived ? <span className={styles.itemQuiet}> (removed)</span> : null}
                </span>
                {score ? (
                  <span className={styles.itemScore}>
                    <span className="num">{score.scores.overall}</span>
                    <span className={styles.itemScoreLabel}>{scoreLabel(score.scores.overall)}</span>
                  </span>
                ) : (
                  <span className={styles.itemMeta}>Not in this Audit</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeopleTab({ institution }: { institution: TeamInstitution }) {
  return (
    <div className={styles.tabStack}>
      <p className={styles.formNote}>The owner adds members in Settings.</p>
      <div className={styles.rows}>
        {institution.people.map((person) => (
          <div key={person.email} className={styles.item}>
            <div className={styles.itemHead}>
              <span className={styles.itemTitle}>{person.email}</span>
              <span className={styles.itemMeta}>{MEMBERSHIP_ROLE_LABELS[person.role]}</span>
            </div>
            <p className={styles.itemMeta}>Joined {formatDate(person.joinedAt)}</p>
          </div>
        ))}
        {institution.invites.map((email) => (
          <div key={email} className={styles.item}>
            <div className={styles.itemHead}>
              <span className={styles.itemTitle}>{email}</span>
              <span className={styles.itemMeta}>Invited</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** What the institution added about itself and its programs in Settings. Never part of the score. */
function AboutTab({ institution, added }: { institution: TeamInstitution; added: AddedDetails }) {
  const lines = institutionDetailLines(added.institution, institution.type);
  const programs = institution.programs
    .filter((program) => !program.archived)
    .map((program) => ({ program, lines: programDetailLines(added.programs.get(program.id) ?? { ...EMPTY_PROGRAM }) }))
    .filter((entry) => entry.lines.length);
  return (
    <div className={styles.tabStack}>
      <div className={styles.aboutNote}>
        <AddedTag label="Added by them" />
        <p className={styles.formNote}>From their Settings. Shown to them as added by you. Never part of the score.</p>
      </div>
      {lines.length || programs.length ? (
        <>
          {lines.length ? (
            <div className={styles.rows}>
              <FactList items={lines} />
            </div>
          ) : null}
          {programs.map(({ program, lines: programLines }) => (
            <div key={program.id} className={styles.rows}>
              <p className={styles.itemTitle}>{program.name}</p>
              <FactList items={programLines} />
            </div>
          ))}
        </>
      ) : (
        <p className={styles.empty}>Nothing added yet.</p>
      )}
    </div>
  );
}

/** The links made to this institution's team Audits, newest first. A live link can be copied or stopped. */
function ShareLinks({ institutionId, links, now }: { institutionId: string; links: readonly LinkRow[]; now: Date }) {
  return (
    <div className={styles.rows}>
      {links.map((link) => {
        const url = `${APP_URL}${sharePath(link.token)}`;
        return (
          <div key={link.token} className={styles.item}>
            <div className={styles.itemHead}>
              <a href={sharePath(link.token)} className={styles.link} target="_blank" rel="noreferrer">
                {hostAndPath(url)}
              </a>
            </div>
            <p className={styles.itemMeta}>
              <span>{linkStateText(link, now)}</span>
              <span>
                Made {formatDate(link.createdAt)} by {link.createdBy}
              </span>
            </p>
            {linkState(link, now) === 'live' ? (
              <div className={styles.itemActions}>
                <CopyLink url={url} />
                <form action={stopLinkAction.bind(null, institutionId, link.token)}>
                  <Button type="submit" size="sm" variant="quiet">
                    Stop sharing
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
