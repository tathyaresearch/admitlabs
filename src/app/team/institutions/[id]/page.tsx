import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { historyByMonth, overviewView } from '@/audit/view';
import { fixStep } from '@/components/audit/AuditScreen';
import { HomeSummary } from '@/components/home/HomeSummary';
import { NextSteps } from '@/components/home/NextSteps';
import { ActionButton, CopyLink, NoteForm, PaidStartForm } from '@/components/team/InstitutionPanels';
import { AnchorButton, Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { KpiCard, KpiNote, KpiNumber, KpiWord } from '@/components/ui/Kpi';
import { PageHead } from '@/components/ui/Layout';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { TEAM_RULES } from '@/config/team';
import { monthKey } from '@/domain/dates';
import { formatDate, formatDateTime, hostAndPath } from '@/domain/format';
import { scoreLabel } from '@/domain/scores';
import { effectiveTier, type PlanRecord } from '@/domain/tiers';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadTeamInstitution, type LinkRow, type TeamInstitution } from '@/lib/team/load';
import { APP_URL } from '@/lib/urls';
import { TEAM_STATUS_LABELS, type TeamStatus } from '@/team/filters';
import { planActions, planDetail } from '@/team/plans';
import { linkState, linkStateText, sharePath } from '@/team/share';
import { viewAsAction } from '../../view-as-actions';
import {
  addNoteAction,
  auditNowAction,
  endPlanAction,
  makeClientAction,
  removeNoteAction,
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
  const trend = { points: historyByMonth(trendRows.map((row) => ({ runAt: row.runAt, scores: { overall: row.overall } })), (runAt) => monthKey(new Date(runAt))) };
  const scoreName = !latest ? '' : latest.kind === 'team' ? 'Team Audit score' : latest.kind === 'rival' ? 'Rival Audit score' : 'Their score';

  const tabs: TabItem[] = [
    { id: 'audits', label: 'Audits', count: institution.teamAudits.length + Math.min(institution.history.length, OWN_AUDITS_SHOWN), content: <AuditsTab institution={institution} /> },
    { id: 'programs', label: 'Programs', count: institution.programs.length, content: <ProgramsTab institution={institution} /> },
    ...(institution.claimed
      ? [{ id: 'people', label: 'People', count: institution.people.length + institution.invites.length, content: <PeopleTab institution={institution} /> }]
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
          ) : null}
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
          {institution.links.length ? <ShareLinks institutionId={institution.id} links={institution.links} now={now} /> : <p className={styles.empty}>No links yet.</p>}
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
            <ActionButton action={auditNowAction.bind(null, institution.id)} label={tier === 'client' ? 'Refresh their Audit' : 'Run a team Audit'} icon="refresh" size="md" />
          </>
        }
      />

      {view && latest ? (
        <HomeSummary view={view} checkedAt={latest.runAt} trend={trend} scoreLabel={scoreName} historyLabel={`${scoreName} by month`} verdict={false} />
      ) : (
        <EmptyState icon="audit" title="No Audit yet" headingLevel={2}>
          {institution.claimed ? 'Their first Audit runs when they pick a program.' : 'Run a team Audit to see where they stand. It stays private until you share it.'}
        </EmptyState>
      )}

      <section className={styles.planRow} aria-label={institution.claimed ? 'Plan' : 'Share this Audit'}>
        {institution.claimed ? (
          <KpiCard label="Plan" aside={institution.plan?.setBy ? `Set by ${institution.plan.setBy}` : undefined} className={styles.planCard}>
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
          <KpiCard label="Share this Audit" className={styles.planCard}>
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

      {view && !institution.claimed ? (
        <NextSteps
          id="fixes"
          title="What to fix first"
          description={`The biggest gains first. A shared Audit explains the top ${TEAM_RULES.sharedFixesInFull} and says AdmitLabs can fix the rest.`}
          steps={view.fixes.slice(0, 5).map((item) => fixStep(item, null))}
          empty={<p className={audit.quietNote}>Every check is Strong.</p>}
        />
      ) : null}

      <section className={audit.section} aria-labelledby="record-title">
        <h2 id="record-title" className="visually-hidden">
          Audits, programs, people, notes and share links
        </h2>
        <Tabs label={`About ${institution.name}`} items={tabs} />
      </section>
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
      <p className={styles.formNote}>{latest ? 'With their score in the latest Audit.' : 'Audited in the next Audit.'}</p>
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
