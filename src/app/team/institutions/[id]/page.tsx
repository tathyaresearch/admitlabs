import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { overviewView, pointsToGainText } from '@/audit/view';
import { AuditHeader, SectionHead } from '@/components/audit/AuditHeader';
import { SummaryBand } from '@/components/audit/SummaryBand';
import { ActionButton, CopyLink, NoteForm, PaidStartForm } from '@/components/team/InstitutionPanels';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { EmptyState } from '@/components/ui/Feedback';
import { TEAM_RULES } from '@/config/team';
import { formatDate, formatDateTime, hostAndPath, plural } from '@/domain/format';
import { scoreLabel } from '@/domain/scores';
import { effectiveTier, type PlanRecord } from '@/domain/tiers';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadTeamInstitution, type LinkRow } from '@/lib/team/load';
import { APP_URL } from '@/lib/urls';
import { TEAM_STATUS_LABELS, type TeamStatus } from '@/team/filters';
import { planActions, planText } from '@/team/plans';
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const viewer = await getViewer();
  if (!viewer?.teamRole) return { title: 'Page not found' };
  const { id } = await params;
  const institution = UUID.test(id) ? await loadTeamInstitution(id) : null;
  return { title: institution?.name ?? 'Institution' };
}

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
  const scoreCaption = !latest
    ? ''
    : latest.kind === 'team'
      ? `Team Audit, ${formatDate(latest.runAt)}`
      : latest.kind === 'rival'
        ? `Rival Audit, ${formatDate(latest.runAt)}`
        : `Their Audit, ${formatDate(latest.runAt)}`;

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <AuditHeader
          title={institution.name}
          caption={[
            `${INSTITUTION_TYPE_LABELS[institution.type]} in ${institution.city}, ${institution.state}`,
            <a key="site" href={institution.website} target="_blank" rel="noreferrer">
              {hostAndPath(institution.website)}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>,
            TEAM_STATUS_LABELS[status],
            ...(tier ? [planText(plan, now)] : []),
          ]}
          actions={
            <div className={styles.headerActions}>
              {institution.claimed ? (
                <form action={viewAsAction.bind(null, institution.id)}>
                  <Button type="submit" variant="secondary" iconAfter="arrowRight">
                    Open their dashboard
                  </Button>
                </form>
              ) : null}
              <ActionButton
                action={auditNowAction.bind(null, institution.id)}
                label={tier === 'client' ? 'Refresh their Audit' : 'Run a team Audit'}
                icon="refresh"
              />
            </div>
          }
        />
        {view && latest ? (
          <SummaryBand view={view} caption={scoreCaption} />
        ) : (
          <EmptyState icon="audit" title="No Audit yet" headingLevel={2}>
            {institution.claimed ? 'Their first Audit runs when they pick a program.' : 'Run a team Audit to see where they stand. It stays private until you share it.'}
          </EmptyState>
        )}
      </div>

      <div className={styles.split}>
        <div className={styles.stack}>
          {view && !institution.claimed ? (
            <section className={audit.section} aria-labelledby="fixes-title">
              <SectionHead
                id="fixes-title"
                title="What to fix first"
                help={`${plural(view.fixes.length, 'thing', 'things')} to fix. A shared Audit explains the top ${TEAM_RULES.sharedFixesInFull} and says AdmitLabs can fix the rest.`}
              />
              <div className={styles.rows}>
                {view.fixes.slice(0, 5).map((item) => {
                  const detail = item.parts.find((part) => part.detail)?.detail;
                  return (
                    <div key={item.rank} className={styles.item}>
                      <div className={styles.itemHead}>
                        <span className={styles.itemTitle}>
                          {item.rank}. {item.name}
                        </span>
                        <span className={styles.itemMeta}>{pointsToGainText(item.points)}</span>
                      </div>
                      {detail?.finding ? <p className={styles.itemBody}>{detail.finding}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {institution.claimed && institution.teamAudits.length ? (
            <section className={audit.section} aria-labelledby="team-audits-title">
              <SectionHead id="team-audits-title" title="Private team Audits" help="Only the team sees these. Their own Audits follow their plan." />
              <div className={styles.rows}>
                {institution.teamAudits.map((row) => (
                  <div key={row.id} className={styles.item}>
                    <div className={styles.itemHead}>
                      <span className={styles.itemTitle}>{formatDateTime(row.runAt)}</span>
                      <span className={styles.itemMeta}>
                        {row.overall}, {scoreLabel(row.overall)}
                      </span>
                    </div>
                    <p className={styles.itemMeta}>
                      <span>
                        Discovered {row.discovered}, Trusted {row.trusted}, Chosen {row.chosen}
                      </span>
                      {row.topFix ? <span>Top fix: {row.topFix}</span> : null}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {institution.claimed && institution.history.length ? (
            <section className={audit.section} aria-labelledby="history-title">
              <SectionHead id="history-title" title="Their Audits" help="Newest first. Their dashboard shows what their plan includes." />
              <div className={styles.rows}>
                {[...institution.history]
                  .reverse()
                  .slice(0, 6)
                  .map((row) => (
                    <div key={row.id} className={styles.item}>
                      <div className={styles.itemHead}>
                        <span className={styles.itemTitle}>{formatDateTime(row.runAt)}</span>
                        <span className={styles.itemMeta}>
                          {row.overall}, {scoreLabel(row.overall)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          <section className={audit.section} aria-labelledby="programs-title">
            <SectionHead id="programs-title" title="Programs" help={latest ? 'With their score in the latest Audit.' : 'Audited in the next Audit.'} />
            <div className={styles.rows}>
              {institution.programs.map((program) => {
                const score = latest?.programs.find((entry) => entry.programId === program.id);
                return (
                  <div key={program.id} className={styles.item}>
                    <div className={styles.itemHead}>
                      <span className={styles.itemTitle}>
                        {program.name} {program.archived ? <Tag variant="quiet">Removed</Tag> : null}
                      </span>
                      <span className={styles.itemMeta}>{score ? `${score.scores.overall}, ${scoreLabel(score.scores.overall)}` : 'Not in this Audit'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className={styles.stack}>
          {institution.claimed ? (
            <section className={styles.panel} aria-labelledby="plan-title">
              <SectionHead id="plan-title" title="Plan" help={isAdmin ? 'Only an Admin changes plans.' : 'An Admin changes plans.'} />
              <div className={styles.facts}>
                <p className={styles.fact}>
                  <span className={styles.factLabel}>Now</span>
                  <span>{tier ? TIER_LABELS[tier] : 'Free'}</span>
                </p>
                {planText(plan, now) !== (tier ? TIER_LABELS[tier] : 'Free') ? (
                  <p className={styles.fact}>
                    <span className={styles.factLabel}>Plan</span>
                    <span>{planText(plan, now)}</span>
                  </p>
                ) : null}
                {institution.plan?.setBy ? (
                  <p className={styles.fact}>
                    <span className={styles.factLabel}>Set by</span>
                    <span>{institution.plan.setBy}</span>
                  </p>
                ) : null}
              </div>
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
            </section>
          ) : (
            <section className={styles.panel} aria-labelledby="share-title">
              <SectionHead
                id="share-title"
                title="Share this Audit"
                help={`A private link to the team Audit, for ${TEAM_RULES.shareLinkDays} days. How to fix is shown for the top ${TEAM_RULES.sharedFixesInFull} fixes only.`}
              />
              {teamAudit ? (
                <div className={styles.shareActions}>
                  {/* A new or stopped link shows in the list below, so the button starts fresh each time the links change. */}
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
                <p className={styles.empty}>Run a team Audit first. Only a team Audit can be shared.</p>
              )}
              <ShareLinks institutionId={institution.id} links={institution.links} now={now} />
            </section>
          )}

          {institution.claimed && institution.links.length ? (
            <section className={styles.panel} aria-labelledby="links-title">
              <SectionHead id="links-title" title="Shared before they signed up" help="Each link works until it expires or you stop it." />
              <ShareLinks institutionId={institution.id} links={institution.links} now={now} />
            </section>
          ) : null}

          <section className={styles.panel} aria-labelledby="notes-title">
            <SectionHead id="notes-title" title="Private notes" help="Team only. Never shown to the institution." />
            <NoteForm action={addNoteAction.bind(null, institution.id)} />
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
              <p className={styles.empty}>No notes yet.</p>
            )}
          </section>

          {institution.claimed ? (
            <section className={styles.panel} aria-labelledby="people-title">
              <SectionHead id="people-title" title="People" help="The owner adds members in Settings." />
              <div className={styles.rows}>
                {institution.people.map((person) => (
                  <div key={person.email} className={styles.item}>
                    <div className={styles.itemHead}>
                      <span className={styles.itemTitle}>{person.email}</span>
                      <Tag variant={person.role === 'owner' ? 'solid' : 'outline'}>{MEMBERSHIP_ROLE_LABELS[person.role]}</Tag>
                    </div>
                    <p className={styles.itemMeta}>Joined {formatDate(person.joinedAt)}</p>
                  </div>
                ))}
                {institution.invites.map((email) => (
                  <div key={email} className={styles.item}>
                    <div className={styles.itemHead}>
                      <span className={styles.itemTitle}>{email}</span>
                      <Tag variant="quiet">Invited</Tag>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.panel} aria-labelledby="record-title">
            <SectionHead id="record-title" title="About this record" help="Team only." />
            <div className={styles.facts}>
              <p className={styles.fact}>
                <span className={styles.factLabel}>Added</span>
                <span>{formatDate(institution.createdAt)}</span>
              </p>
              {institution.claimedAt ? (
                <p className={styles.fact}>
                  <span className={styles.factLabel}>Signed up</span>
                  <span>{formatDate(institution.claimedAt)}</span>
                </p>
              ) : null}
              <p className={styles.fact}>
                <span className={styles.factLabel}>Tracked as a rival by</span>
                <span>{plural(institution.trackedBy, 'institution', 'institutions')}</span>
              </p>
            </div>
            <p className={styles.formNote}>Institutions never see who tracks them.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

/** The links made to this institution's team Audits, newest first. A live link can be copied or stopped. */
function ShareLinks({ institutionId, links, now }: { institutionId: string; links: readonly LinkRow[]; now: Date }) {
  if (!links.length) return null;
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
