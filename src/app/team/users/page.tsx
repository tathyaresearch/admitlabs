import type { Metadata } from 'next';
import { AuditHeader, SectionHead } from '@/components/audit/AuditHeader';
import { ActionButton } from '@/components/team/InstitutionPanels';
import { TeamUserForm } from '@/components/team/TeamUserForm';
import { Tag } from '@/components/ui/Data';
import { formatDate, plural } from '@/domain/format';
import { TEAM_ROLE_LABELS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadTeamPeople } from '@/lib/team/load';
import { addTeamUserAction, removeTeamInviteAction, removeTeamUserAction, setTeamRoleAction } from './actions';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Team users' : 'Page not found' };
}

export default async function TeamUsersPage() {
  const viewer = await requireTeamViewer();
  const isAdmin = viewer.teamRole === 'admin';
  const people = await loadTeamPeople();
  const members = people.filter((person) => !person.pending);
  const waiting = people.filter((person) => person.pending);
  const admins = members.filter((person) => person.role === 'admin').length;

  return (
    <div className={audit.page}>
      <AuditHeader
        title="Team users"
        caption={[plural(members.length, 'person', 'people') + ' on the team', plural(admins, 'Admin', 'Admins'), isAdmin ? 'You are an Admin' : 'An Admin adds and removes people']}
      />
      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="team-title">
          <SectionHead id="team-title" title="The team" help="Everyone who can open the team area." />
          <div className={styles.rows}>
            {members.map((person) => {
              const self = person.userId === viewer.userId;
              const lastAdmin = person.role === 'admin' && admins === 1;
              return (
                <div key={person.email} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemTitle}>{person.email}</span>
                    <span className={styles.tags}>
                      {self ? <Tag variant="quiet">You</Tag> : null}
                      <Tag variant={person.role === 'admin' ? 'solid' : 'outline'}>{TEAM_ROLE_LABELS[person.role]}</Tag>
                    </span>
                  </div>
                  <p className={styles.itemMeta}>On the team since {formatDate(person.since)}</p>
                  {isAdmin && person.userId && !self ? (
                    lastAdmin ? (
                      <p className={styles.formNote}>The only Admin. Make someone else an Admin to change this.</p>
                    ) : (
                      <div className={styles.itemActions}>
                        {person.role === 'team' ? (
                          <ActionButton
                            action={setTeamRoleAction.bind(null, person.userId, 'admin')}
                            label="Make them an Admin"
                            variant="secondary"
                            confirm="Admins also change plans and team users."
                          />
                        ) : (
                          <ActionButton
                            action={setTeamRoleAction.bind(null, person.userId, 'team')}
                            label="Make them Team"
                            variant="secondary"
                            confirm="They keep the team area, without plans and team users."
                          />
                        )}
                        <ActionButton
                          action={removeTeamUserAction.bind(null, person.userId)}
                          label="Remove from the team"
                          variant="quiet"
                          confirm="They lose the team area at once. Their notes stay."
                        />
                      </div>
                    )
                  ) : null}
                  {isAdmin && self ? <p className={styles.formNote}>Another Admin can change your role.</p> : null}
                </div>
              );
            })}
            {waiting.map((person) => (
              <div key={person.email} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.itemTitle}>{person.email}</span>
                  <span className={styles.tags}>
                    <Tag variant="quiet">Not signed in yet</Tag>
                    <Tag variant={person.role === 'admin' ? 'solid' : 'outline'}>{TEAM_ROLE_LABELS[person.role]}</Tag>
                  </span>
                </div>
                <p className={styles.itemMeta}>Added {formatDate(person.since)}. Joins at first sign in.</p>
                {isAdmin ? (
                  <div className={styles.itemActions}>
                    <ActionButton action={removeTeamInviteAction.bind(null, person.email)} label="Remove" variant="quiet" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className={styles.stack}>
          {isAdmin ? (
            <section className={styles.panel} aria-labelledby="add-title">
              <SectionHead id="add-title" title="Add someone" help="Someone who has signed in before joins at once. Anyone else joins when they first sign in with this email." />
              <TeamUserForm action={addTeamUserAction} />
            </section>
          ) : null}
          <section className={styles.panel} aria-labelledby="roles-title">
            <SectionHead id="roles-title" title="What each role can do" help="Set here by an Admin." />
            <div className={styles.rows}>
              <div className={styles.item}>
                <span className={styles.itemTitle}>Team</span>
                <p className={styles.itemBody}>Every institution, Audits and bulk Audits, sharing, notes, manual entry, and dashboards read only.</p>
              </div>
              <div className={styles.item}>
                <span className={styles.itemTitle}>Admin</span>
                <p className={styles.itemBody}>Everything Team can do, plus plans and team users.</p>
              </div>
            </div>
            <p className={styles.formNote}>A team email cannot also be used for an institution.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
